import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { walkLessons } from "../src/lib/lessons/walk";
import { applyLessonSyncWithLock } from "../src/lib/lessons/sync";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "[sync-lessons] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
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

  try {
    const summary = await applyLessonSyncWithLock(admin, lessons, {
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
    process.exit(1);
  }
}

main();
