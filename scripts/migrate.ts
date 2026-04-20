import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

async function main(): Promise<void> {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error(
      "[migrate] Missing SUPABASE_DB_URL in env.\n" +
        "Get it from: Supabase dashboard → Project Settings → Database → Connection string → URI.\n" +
        "Use the SESSION mode / port 5432 one (not the transaction-mode 6543 one) so DDL is supported.",
    );
    process.exit(1);
  }

  const markThroughArg = process.argv.find((a) => a.startsWith("--mark-applied-through="));
  const markThrough = markThroughArg ? markThroughArg.split("=")[1] : null;

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public._migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows: appliedRows } = await client.query<{ name: string }>(
      "SELECT name FROM public._migrations ORDER BY name",
    );
    const applied = new Set(appliedRows.map((r) => r.name));

    const entries = await readdir(MIGRATIONS_DIR);
    const files = entries.filter((f) => f.endsWith(".sql")).sort();

    let appliedCount = 0;
    let skippedCount = 0;
    let baselinedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        skippedCount += 1;
        continue;
      }

      if (markThrough && file <= markThrough) {
        console.info(`[baseline] ${file} — marking applied without running`);
        await client.query("INSERT INTO public._migrations (name) VALUES ($1)", [file]);
        baselinedCount += 1;
        continue;
      }

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      console.info(`[apply]    ${file}`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO public._migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        appliedCount += 1;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(
          `[fail]     ${file}: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
    }

    console.info(
      `[migrate] Done. applied=${appliedCount} baselined=${baselinedCount} skipped=${skippedCount}`,
    );
  } finally {
    await client.end();
  }
}

main();
