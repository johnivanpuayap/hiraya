import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SOURCE_DIR =
  process.env.QUESTION_IMAGES_DIR ??
  path.join(process.cwd(), "content", "question-images");
const BUCKET = "question-images";
const UPLOAD_CONCURRENCY = 8;

type ChoiceLetter = "a" | "b" | "c" | "d";

interface ParsedFile {
  filename: string;
  examSource: string;
  storagePath: string;
  choice: ChoiceLetter | null;
}

interface PendingUpdate {
  examSource: string;
  questionId: string;
  cols: Partial<Record<"image_url" | `option_${ChoiceLetter}`, string>>;
}

function parseFilename(filename: string): ParsedFile | null {
  const match = /^(\d{2})-([AO])-(\d+)(?:-([A-D]))?\.png$/.exec(filename);
  if (!match) return null;
  const [, year, ao, num, choiceUpper] = match;
  const padded = num.padStart(2, "0");
  const examSource = `${year}-${ao}-${padded}`;
  const storagePath = choiceUpper
    ? `${examSource}-${choiceUpper}.png`
    : `${examSource}.png`;
  const choice = choiceUpper
    ? (choiceUpper.toLowerCase() as ChoiceLetter)
    : null;
  return { filename, examSource, storagePath, choice };
}

async function ensureBucket(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  if (!error) {
    console.info(`[bucket]   created '${BUCKET}' (public)`);
    return;
  }
  const status = (error as { status?: number; statusCode?: string }).status;
  const statusCode = (error as { statusCode?: string }).statusCode;
  const message = error.message ?? "";
  if (
    status === 409 ||
    statusCode === "409" ||
    /already exists/i.test(message)
  ) {
    console.info(`[bucket]   '${BUCKET}' already exists`);
    return;
  }
  throw new Error(`Failed to create bucket '${BUCKET}': ${message}`);
}

async function loadFiles(): Promise<ParsedFile[]> {
  const entries = await readdir(SOURCE_DIR);
  const parsed: ParsedFile[] = [];
  const skipped: string[] = [];
  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith(".png")) continue;
    const p = parseFilename(entry);
    if (p) parsed.push(p);
    else skipped.push(entry);
  }
  if (skipped.length > 0) {
    console.warn(
      `[parse]    skipped ${skipped.length} unrecognized filename(s): ${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? "…" : ""}`,
    );
  }
  return parsed;
}

async function fetchExamSourceMap(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, exam_source")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Query questions failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const exam = (row as { exam_source: string | null }).exam_source;
      const id = (row as { id: string }).id;
      if (exam) map.set(exam, id);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

async function uploadFile(
  supabase: SupabaseClient,
  file: ParsedFile,
): Promise<void> {
  const filePath = path.join(SOURCE_DIR, file.filename);
  const buf = await readFile(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(file.storagePath, buf, {
      contentType: "image/png",
      upsert: true,
    });
  if (error) {
    throw new Error(`upload ${file.filename} → ${file.storagePath}: ${error.message}`);
  }
}

async function uploadAll(
  supabase: SupabaseClient,
  files: ParsedFile[],
): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0;
  let failed = 0;
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const idx = next;
      next += 1;
      if (idx >= files.length) return;
      const file = files[idx];
      try {
        await uploadFile(supabase, file);
        uploaded += 1;
      } catch (err) {
        failed += 1;
        console.error(
          `[upload]   FAIL ${file.filename}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      if ((uploaded + failed) % 50 === 0 || uploaded + failed === files.length) {
        console.info(
          `[upload]   progress ${uploaded + failed}/${files.length} (ok=${uploaded} fail=${failed})`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, () =>
      worker(),
    ),
  );

  return { uploaded, failed };
}

function publicUrl(supabase: SupabaseClient, storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function applyUpdates(
  supabase: SupabaseClient,
  updates: PendingUpdate[],
): Promise<{ updated: number; failed: number }> {
  let updated = 0;
  let failed = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("questions")
      .update(u.cols)
      .eq("id", u.questionId);
    if (error) {
      failed += 1;
      console.error(`[update]   FAIL ${u.examSource}: ${error.message}`);
      continue;
    }
    updated += 1;
  }
  return { updated, failed };
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[migrate-images] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
    );
    process.exit(1);
  }

  const apply = process.argv.includes("--apply");
  const mode = apply ? "APPLY" : "DRY-RUN";

  try {
    const dirStat = await stat(SOURCE_DIR);
    if (!dirStat.isDirectory()) {
      throw new Error(`${SOURCE_DIR} is not a directory`);
    }
  } catch (err) {
    console.error(
      `[migrate-images] Source dir not accessible: ${SOURCE_DIR} (${err instanceof Error ? err.message : String(err)})`,
    );
    process.exit(1);
  }

  console.info(`[migrate-images] mode=${mode} source=${SOURCE_DIR}`);

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const files = await loadFiles();
  console.info(`[parse]    ${files.length} valid image filename(s)`);

  const examIdByName = await fetchExamSourceMap(supabase);
  console.info(`[db]       ${examIdByName.size} questions have exam_source`);

  const matched: ParsedFile[] = [];
  const unmatchedExams = new Set<string>();
  for (const f of files) {
    if (examIdByName.has(f.examSource)) matched.push(f);
    else unmatchedExams.add(f.examSource);
  }

  console.info(
    `[match]    ${matched.length}/${files.length} files match a DB question`,
  );
  if (unmatchedExams.size > 0) {
    const list = [...unmatchedExams].sort();
    console.warn(
      `[match]    ${unmatchedExams.size} exam_source(s) have no DB row — files for these will be SKIPPED:`,
    );
    console.warn(`           ${list.slice(0, 20).join(", ")}${list.length > 20 ? `, … (+${list.length - 20} more)` : ""}`);
  }

  const updatesByExam = new Map<string, PendingUpdate>();
  for (const f of matched) {
    const id = examIdByName.get(f.examSource);
    if (!id) continue;
    let pending = updatesByExam.get(f.examSource);
    if (!pending) {
      pending = { examSource: f.examSource, questionId: id, cols: {} };
      updatesByExam.set(f.examSource, pending);
    }
    if (f.choice) {
      pending.cols[`option_${f.choice}`] = ""; // placeholder, will be filled with public URL after upload
    } else {
      pending.cols.image_url = "";
    }
  }
  console.info(
    `[plan]     ${updatesByExam.size} question rows will be updated`,
  );

  const questionImageCount = matched.filter((f) => f.choice === null).length;
  const choiceImageCount = matched.length - questionImageCount;
  console.info(
    `[plan]     -> question images: ${questionImageCount}, choice images: ${choiceImageCount}`,
  );

  if (!apply) {
    console.info(
      "\n[migrate-images] DRY-RUN complete. Re-run with --apply to upload + update.",
    );
    return;
  }

  await ensureBucket(supabase);

  console.info(`[upload]   uploading ${matched.length} file(s)…`);
  const upRes = await uploadAll(supabase, matched);
  console.info(
    `[upload]   done: ok=${upRes.uploaded} fail=${upRes.failed}`,
  );
  if (upRes.failed > 0) {
    console.error(
      "[migrate-images] Some uploads failed; aborting DB updates so nothing points to a missing object.",
    );
    process.exit(1);
  }

  for (const update of updatesByExam.values()) {
    for (const f of matched) {
      if (f.examSource !== update.examSource) continue;
      const url = publicUrl(supabase, f.storagePath);
      if (f.choice) update.cols[`option_${f.choice}`] = url;
      else update.cols.image_url = url;
    }
  }

  console.info(`[update]   updating ${updatesByExam.size} question row(s)…`);
  const updRes = await applyUpdates(supabase, [...updatesByExam.values()]);
  console.info(
    `[update]   done: ok=${updRes.updated} fail=${updRes.failed}`,
  );

  if (updRes.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[migrate-images] fatal:", err);
  process.exit(1);
});
