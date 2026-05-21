import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Minimal SQL migration runner.
 * - Applies *.sql in lexical order.
 * - Tracks applied migrations in `docq_schema_migrations`.
 */
export async function migrate({ pool, logger }) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(__dirname, "..", "..", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  await pool.query(`
    create table if not exists docq_schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const { rows } = await pool.query(
    "select filename from docq_schema_migrations",
  );
  const applied = new Set(rows.map((r) => r.filename));

  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = readFileSync(path.join(migrationsDir, f), "utf8");
    logger?.info({ migration: f }, "docQ migrate: applying");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into docq_schema_migrations(filename) values ($1)",
        [f],
      );
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }
}

