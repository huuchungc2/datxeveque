import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const prismaBin = path.resolve(
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma"
);

const isProduction = process.env.NODE_ENV === "production";

function hasMigrations() {
  const migrationsDir = path.resolve("prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return false;
  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  return entries.some((e) => e.isDirectory());
}

function run(args) {
  // Avoid shell quoting issues on Windows by using execFileSync.
  if (process.platform === "win32" && prismaBin.toLowerCase().endsWith(".cmd")) {
    execFileSync("cmd.exe", ["/d", "/s", "/c", prismaBin, ...args], { stdio: "inherit" });
    return;
  }
  execFileSync(prismaBin, args, { stdio: "inherit" });
}

try {
  if (hasMigrations()) {
    run(["migrate", "deploy"]);
  } else {
    if (isProduction) {
      console.error(
        "[Prisma] No prisma/migrations found. Refusing to run db push in production. " +
          "Please commit migrations and use prisma migrate deploy."
      );
      process.exit(1);
    }
    // Repo chưa có migrations nhưng DB đã có schema (P3005) → đồng bộ theo schema.prisma cho local/dev.
    run(["db", "push", "--accept-data-loss"]);
  }
} catch (err) {
  // Nếu deploy fail do baseline (P3005), fallback sang db push để dev không bị chặn.
  const msg = String(err?.message || err);
  if (msg.includes("P3005")) {
    if (isProduction) throw err;
    run(["db", "push", "--accept-data-loss"]);
  } else {
    throw err;
  }
}

run(["generate"]);

