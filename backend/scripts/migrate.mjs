/** Chạy migration cột admin_owes_driver_amount — node scripts/migrate.mjs */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE trips
      ADD COLUMN admin_owes_driver_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER driver_debt_amount
    `);
    console.log("OK: đã thêm cột admin_owes_driver_amount");
  } catch (e) {
    if (String(e.message).includes("Duplicate column")) {
      console.log("OK: cột admin_owes_driver_amount đã tồn tại");
    } else {
      throw e;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Migration FAIL:", e.message);
  process.exit(1);
});
