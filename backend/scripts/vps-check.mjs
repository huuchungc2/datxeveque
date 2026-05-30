/**
 * Chẩn đoán VPS — chạy trên server: cd backend && node scripts/vps-check.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function fail(msg) {
  console.error("FAIL:", msg);
  process.exitCode = 1;
}

async function main() {
  console.log("=== VPS check ===\n");
  console.log("NODE_ENV:", process.env.NODE_ENV || "(unset)");
  console.log("PORT:", process.env.PORT || "4002");
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) fail("Thiếu DATABASE_URL trong backend/.env");
  else console.log("DATABASE_URL:", dbUrl.replace(/:([^:@/]+)@/, ":***@"));

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("\nOK: MySQL kết nối được");
  } catch (e) {
    fail(`MySQL: ${e.message}`);
    return;
  }

  try {
    const users = await prisma.user.count();
    const routes = await prisma.route.count();
    const bookings = await prisma.booking.count();
    const trips = await prisma.trip.count();
    const admin = await prisma.user.findUnique({ where: { phone: "0900000000" } });
    console.log(`OK: users=${users}, routes=${routes}, bookings=${bookings}, trips=${trips}`);
    if (!routes) console.warn("WARN: Không có tuyến — import SQL hoặc seed");
    if (!admin) console.warn("WARN: Không có admin 0900000000 — POST /api/setup/reset-admin");
    else if (!/^\$2[aby]\$/.test(admin.passwordHash || ""))
      console.warn("WARN: Admin chưa bcrypt — POST /api/setup/reset-admin");
  } catch (e) {
    fail(`Prisma query: ${e.message}\n→ Chạy: npm run db:migrate`);
    return;
  }

  console.log("\nGợi ý:");
  console.log("  curl -s http://127.0.0.1:4002/api/health");
  console.log("  curl -s http://127.0.0.1:4002/api/setup/status");
  console.log("  pm2 logs dat-xe-ve-que-api --lines 50");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
