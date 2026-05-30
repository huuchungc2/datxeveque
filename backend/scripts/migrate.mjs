/** Migration DB — node scripts/migrate.mjs */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isBcrypt(hash) {
  return /^\$2[aby]\$/.test(String(hash || ""));
}

async function hashLegacyPasswords() {
  const users = await prisma.user.findMany({ select: { id: true, phone: true, passwordHash: true } });
  let n = 0;
  for (const u of users) {
    const plain = String(u.passwordHash || "");
    if (!plain || isBcrypt(plain)) continue;
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(plain, 10) },
    });
    console.log(`OK: bcrypt ${u.phone}`);
    n++;
  }
  if (n) console.log(`Đã mã hóa ${n} mật khẩu demo`);
}

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
    name: "driver_reject_reason",
    sql: `ALTER TABLE trips ADD COLUMN driver_reject_reason TEXT NULL AFTER note`,
    dup: "Duplicate column name 'driver_reject_reason'",
  },
  {
    name: "pricing_snapshot_json",
    sql: `ALTER TABLE bookings ADD COLUMN pricing_snapshot_json LONGTEXT NULL AFTER commission_amount`,
    dup: "Duplicate column name 'pricing_snapshot_json'",
  },
  {
    name: "driver_ride_status",
    sql: `ALTER TABLE bookings ADD COLUMN driver_ride_status VARCHAR(40) NULL AFTER payment_receiver`,
    dup: "Duplicate column name 'driver_ride_status'",
  },
  {
    name: "driver_cargo_status",
    sql: `ALTER TABLE bookings ADD COLUMN driver_cargo_status VARCHAR(40) NULL AFTER driver_ride_status`,
    dup: "Duplicate column name 'driver_cargo_status'",
  },
  {
    name: "payment_status",
    sql: `ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(40) NOT NULL DEFAULT 'UNPAID' AFTER driver_cargo_status`,
    dup: "Duplicate column name 'payment_status'",
  },
  {
    name: "payment_collected_at",
    sql: `ALTER TABLE bookings ADD COLUMN payment_collected_at DATETIME NULL AFTER payment_status`,
    dup: "Duplicate column name 'payment_collected_at'",
  },
  {
    name: "payment_collected_by_user_id",
    sql: `ALTER TABLE bookings ADD COLUMN payment_collected_by_user_id INT NULL AFTER payment_collected_at`,
    dup: "Duplicate column name 'payment_collected_by_user_id'",
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
  {
    name: "cargo_receiver_name",
    sql: `ALTER TABLE bookings ADD COLUMN cargo_receiver_name VARCHAR(255) NULL AFTER cargo_description`,
    dup: "Duplicate column name 'cargo_receiver_name'",
  },
  {
    name: "cargo_receiver_phone",
    sql: `ALTER TABLE bookings ADD COLUMN cargo_receiver_phone VARCHAR(20) NULL AFTER cargo_receiver_name`,
    dup: "Duplicate column name 'cargo_receiver_phone'",
  },
  {
    name: "parcel_dropoff_address",
    sql: `ALTER TABLE bookings ADD COLUMN parcel_dropoff_address VARCHAR(500) NULL AFTER cargo_receiver_phone`,
    dup: "Duplicate column name 'parcel_dropoff_address'",
  },
  {
    name: "has_accompanying_cargo",
    sql: `ALTER TABLE bookings ADD COLUMN has_accompanying_cargo TINYINT(1) NOT NULL DEFAULT 0 AFTER parcel_dropoff_address`,
    dup: "Duplicate column name 'has_accompanying_cargo'",
  },
  {
    name: "users_address",
    sql: `ALTER TABLE users ADD COLUMN address VARCHAR(500) NULL AFTER email`,
    dup: "Duplicate column name 'address'",
  },
  {
    name: "driver_seat_logs",
    sql: `CREATE TABLE IF NOT EXISTS driver_seat_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      driver_id INT NOT NULL,
      trip_id INT NULL,
      old_available_seats INT NOT NULL,
      new_available_seats INT NOT NULL,
      reason TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_id) REFERENCES drivers(id),
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      INDEX idx_driver_seat_logs_driver (driver_id, created_at),
      INDEX idx_driver_seat_logs_trip (trip_id, created_at)
    )`,
    dup: null,
  },
  {
    name: "routes_locked",
    sql: `ALTER TABLE routes ADD COLUMN locked TINYINT(1) NOT NULL DEFAULT 0 AFTER status`,
    dup: "Duplicate column name 'locked'",
  },
  {
    name: "trip_bookings_seat_count",
    sql: `ALTER TABLE trip_bookings ADD COLUMN seat_count INT NOT NULL DEFAULT 1 AFTER booking_id`,
    dup: "Duplicate column name 'seat_count'",
  },
  {
    name: "drivers_route_id",
    sql: `ALTER TABLE drivers ADD COLUMN route_id INT NULL AFTER direction_preference`,
    dup: "Duplicate column name 'route_id'",
  },
  {
    name: "drivers_run_direction",
    sql: `ALTER TABLE drivers ADD COLUMN run_direction VARCHAR(32) NULL AFTER route_id`,
    dup: "Duplicate column name 'run_direction'",
  },
  {
    name: "drivers_route_fk",
    sql: `ALTER TABLE drivers ADD CONSTRAINT fk_drivers_route FOREIGN KEY (route_id) REFERENCES routes(id)`,
    dup: "Duplicate foreign key",
  },
  {
    name: "trip_bookings_seat_count_backfill",
    sql: `UPDATE trip_bookings tb
      INNER JOIN bookings b ON b.id = tb.booking_id
      SET tb.seat_count = CASE
        WHEN b.type IN ('CARGO', 'MARKET') THEN 1
        ELSE GREATEST(1, COALESCE(b.passenger_count, 1))
      END
      WHERE tb.seat_count IS NULL OR tb.seat_count < 1`,
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
  await hashLegacyPasswords();
}

main()
  .catch((e) => {
    console.error("Migration FAIL:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
