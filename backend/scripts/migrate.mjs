/** Migration DB — node scripts/migrate.mjs */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const steps = [
  {
    name: "admin_owes_driver_amount",
    sql: `ALTER TABLE trips ADD COLUMN admin_owes_driver_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER driver_debt_amount`,
    dup: "Duplicate column name 'admin_owes_driver_amount'",
  },
  {
    name: "completed_at",
    sql: `ALTER TABLE trips ADD COLUMN completed_at DATETIME NULL AFTER settlement_status`,
    dup: "Duplicate column name 'completed_at'",
  },
  {
    name: "pricing_snapshot_json",
    sql: `ALTER TABLE bookings ADD COLUMN pricing_snapshot_json LONGTEXT NULL AFTER commission_amount`,
    dup: "Duplicate column name 'pricing_snapshot_json'",
  },
  {
    name: "trip_financial_snapshots",
    sql: `CREATE TABLE IF NOT EXISTS trip_financial_snapshots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      event_type VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
      snapshot_json LONGTEXT NOT NULL,
      completed_by VARCHAR(20) NULL,
      user_id INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    )`,
    dup: null,
  },
  {
    name: "notifications",
    sql: `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(40) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      link VARCHAR(255) NULL,
      entity_type VARCHAR(40) NULL,
      entity_id INT NULL,
      read_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_notifications_user (user_id, read_at, created_at)
    )`,
    dup: null,
  },
];

async function main() {
  for (const step of steps) {
    try {
      await prisma.$executeRawUnsafe(step.sql);
      console.log(`OK: ${step.name}`);
    } catch (e) {
      const msg = String(e.message);
      if (step.dup && msg.includes(step.dup)) console.log(`SKIP (đã có): ${step.name}`);
      else if (step.name === "trip_financial_snapshots" && msg.includes("already exists")) console.log(`SKIP: ${step.name}`);
      else throw e;
    }
  }
}

main()
  .catch((e) => {
    console.error("Migration FAIL:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
