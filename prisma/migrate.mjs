import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const prismaDir = path.resolve("prisma");
const dbPath = path.join(prismaDir, "dev.db");
const migrationsDir = path.join(prismaDir, "migrations");

fs.mkdirSync(prismaDir, { recursive: true });
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const migrations = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const migration of migrations) {
  const sqlPath = path.join(migrationsDir, migration, "migration.sql");
  if (!fs.existsSync(sqlPath)) {
    continue;
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  execFileSync("sqlite3", [dbPath], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
}
