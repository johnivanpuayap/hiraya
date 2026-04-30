import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

import { applyLessonSync } from "../src/lib/lessons/sync";
import { walkLessons } from "../src/lib/lessons/walk";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "[sync-lessons] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
    );
    process.exit(1);
  }

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      "[sync-lessons] Missing SUPABASE_DB_URL in env.\n" +
        "Get it from: Supabase dashboard → Project Settings → Database → Connection string → URI.\n" +
        "Use the SESSION mode / port 5432 one (not the transaction-mode 6543 one) so the advisory lock holds across calls.",
    );
    process.exit(1);
  }

  const allowOrphanedProgress = process.argv.includes("--allow-orphaned-progress");
  const rootDir = path.join(process.cwd(), "content", "lessons");

  console.info(`[sync-lessons] Walking ${rootDir}`);
  const lessons = await walkLessons(rootDir);
  console.info(`[sync-lessons] Found ${lessons.length} lesson(s)`);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const lockClient = new Client({ connectionString: dbUrl });
  await lockClient.connect();

  try {
    await lockClient.query("SELECT pg_advisory_lock(hashtext('sync-lessons')::bigint)");

    try {
      const summary = await applyLessonSync(admin, lessons, {
        allowOrphanedProgress,
      });
      console.info(
        `[sync-lessons] Done. inserted=${summary.inserted} updated=${summary.updated} unchanged=${summary.unchanged} soft_deleted=${summary.softDeleted}`,
      );
      for (const w of summary.warnings) {
        console.warn(`[sync-lessons] WARNING: ${w}`);
      }
    } catch (err) {
      console.error(
        `[sync-lessons] Failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exitCode = 1;
    }
  } finally {
    try {
      await lockClient.query("SELECT pg_advisory_unlock(hashtext('sync-lessons')::bigint)");
    } catch (unlockErr) {
      console.error(
        `[sync-lessons] Failed to release lock: ${unlockErr instanceof Error ? unlockErr.message : String(unlockErr)}`,
      );
    }
    await lockClient.end();
  }
}

main();
