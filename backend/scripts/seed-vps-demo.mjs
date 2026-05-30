/**
 * Tài khoản demo cho VPS: 1 admin + 2 tài xế (mật khẩu bcrypt).
 *
 * Chạy sau import DB (có tuyến/giá):
 *   cd backend && node scripts/seed-vps-demo.mjs
 *   node scripts/seed-vps-demo.mjs --trim   # xóa tài xế/đơn/chuyến thừa (sau dump đầy đủ)
 *
 * Hoặc: npm run db:seed-vps-demo
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TRIM = process.argv.includes("--trim");

const ADMIN = {
  phone: "0900000000",
  password: "admin123",
  name: "Admin Đặt Xe",
  email: "admin@datxeveque.vn",
};

const DRIVERS = [
  {
    phone: "0900000001",
    password: "taixe123",
    name: "Tai xe 1 - Sai Gon",
    email: "taixe1@datxeveque.vn",
    location: "Bình Tân, TP.HCM",
    direction: "Sài Gòn → Đức Linh/Tánh Linh",
    seats: 7,
    vehicleType: "Xe 7 chỗ",
    plate: "86A-12345",
  },
  {
    phone: "0900000004",
    password: "taixe123",
    name: "Tai xe 2 - Tinh",
    email: "taixe2@datxeveque.vn",
    location: "Đức Linh",
    direction: "Đức Linh → Sài Gòn",
    seats: 7,
    vehicleType: "Xe 7 chỗ",
    plate: "68A-54321",
  },
];

const KEEP_PHONES = new Set([ADMIN.phone, ...DRIVERS.map((d) => d.phone)]);

async function hash(pw) {
  return bcrypt.hash(String(pw), 10);
}

async function upsertAdmin() {
  const passwordHash = await hash(ADMIN.password);
  const admin = await prisma.user.upsert({
    where: { phone: ADMIN.phone },
    create: {
      name: ADMIN.name,
      phone: ADMIN.phone,
      email: ADMIN.email,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
    update: {
      name: ADMIN.name,
      email: ADMIN.email,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`Admin: ${ADMIN.phone} / ${ADMIN.password} (id ${admin.id})`);
  return admin;
}

async function upsertDriver(def) {
  const passwordHash = await hash(def.password);
  const user = await prisma.user.upsert({
    where: { phone: def.phone },
    create: {
      name: def.name,
      phone: def.phone,
      email: def.email,
      passwordHash,
      role: "DRIVER",
      status: "ACTIVE",
    },
    update: {
      name: def.name,
      email: def.email,
      passwordHash,
      role: "DRIVER",
      status: "ACTIVE",
    },
  });

  let driver = await prisma.driver.findFirst({ where: { userId: user.id } });
  if (!driver) {
    driver = await prisma.driver.findFirst({ where: { phone: def.phone } });
  }

  const driverData = {
    userId: user.id,
    name: def.name,
    phone: def.phone,
    zaloPhone: def.phone,
    status: "Rảnh",
    location: def.location,
    direction: def.direction,
    seatsFree: def.seats,
  };

  if (driver) {
    driver = await prisma.driver.update({
      where: { id: driver.id },
      data: driverData,
    });
  } else {
    driver = await prisma.driver.create({ data: driverData });
  }

  const existingVehicle = await prisma.vehicle.findFirst({ where: { driverId: driver.id } });
  if (existingVehicle) {
    await prisma.vehicle.update({
      where: { id: existingVehicle.id },
      data: {
        vehicleType: def.vehicleType,
        seats: def.seats,
        licensePlate: def.plate,
        status: "Đang hoạt động",
      },
    });
  } else {
    await prisma.vehicle.create({
      data: {
        driverId: driver.id,
        vehicleType: def.vehicleType,
        seats: def.seats,
        licensePlate: def.plate,
        status: "Đang hoạt động",
      },
    });
  }

  console.log(`Tài xế: ${def.phone} / ${def.password} — ${def.name} (driver #${driver.id})`);
}

async function clearTransactionalData() {
  await prisma.tripFinancialSnapshot.deleteMany({});
  await prisma.driverSettlementPayment.deleteMany({});
  await prisma.tripBooking.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.driverSeatLog.deleteMany({});
  await prisma.notification.deleteMany({});
  console.log("Da xoa don/chuyen/ghi chu (giu tuyen, gia, tai khoan demo).");
}

async function trimExtraDrivers() {
  const extraUsers = await prisma.user.findMany({
    where: {
      role: "DRIVER",
      phone: { notIn: [...KEEP_PHONES] },
    },
    include: { driver: true },
  });

  if (!extraUsers.length) {
    console.log("Không có tài xế thừa cần xóa.");
    return;
  }

  const extraDriverIds = extraUsers.map((u) => u.driver?.id).filter(Boolean);
  if (extraDriverIds.length) {
    await prisma.trip.updateMany({
      where: { driverId: { in: extraDriverIds } },
      data: { driverId: null, vehicleId: null },
    });
    await prisma.driverSeatLog.deleteMany({ where: { driverId: { in: extraDriverIds } } });
    await prisma.vehicle.deleteMany({ where: { driverId: { in: extraDriverIds } } });
    await prisma.driver.deleteMany({ where: { id: { in: extraDriverIds } } });
  }

  await prisma.user.deleteMany({
    where: {
      role: "DRIVER",
      phone: { notIn: [...KEEP_PHONES] },
    },
  });

  console.log(`Da xoa ${extraUsers.length} tai xe khong thuoc demo.`);
}

async function trimExtraUsers() {
  const keep = [...KEEP_PHONES];
  const extra = await prisma.user.findMany({
    where: { phone: { notIn: keep } },
    select: { id: true, phone: true, role: true },
  });
  if (!extra.length) {
    console.log("Khong co user thua can xoa.");
    return;
  }

  await prisma.customer.deleteMany({
    where: { userId: { in: extra.map((u) => u.id) } },
  });
  await prisma.user.deleteMany({
    where: { phone: { notIn: keep } },
  });
  console.log(`Da xoa ${extra.length} user khong thuoc demo (khach, tai xe cu...).`);
}

async function main() {
  const routeCount = await prisma.route.count();
  if (!routeCount) {
    throw new Error(
      "Chưa có tuyến trong DB — import dump trước:\n" +
        "  mysql ... dat_xe_ve_que < database/dump-dat_xe_ve_que-202605251220.sql\n" +
        "  cd backend && npm run db:migrate",
    );
  }

  console.log("=== Seed VPS demo: 1 admin + 2 tài xế (bcrypt) ===\n");

  if (TRIM) {
    await clearTransactionalData();
    await trimExtraDrivers();
    await trimExtraUsers();
  }

  await upsertAdmin();
  for (const d of DRIVERS) {
    await upsertDriver(d);
  }

  const driverCount = await prisma.driver.count();
  const userCount = await prisma.user.count();

  console.log("\n--- Tài khoản đăng nhập ---");
  console.log(`Admin:  ${ADMIN.phone} / ${ADMIN.password}`);
  for (const d of DRIVERS) {
    console.log(`TX:     ${d.phone} / ${d.password}  (${d.name})`);
  }
  console.log(`\nDB: ${userCount} users, ${driverCount} drivers.`);
  console.log(
    TRIM
      ? "Da chay --trim: chi con 1 admin + 2 tai xe (don/chuyen da xoa)."
      : "Goi y: sau import dump nhieu tai xe, chay lai voi --trim.",
  );
  console.log("\nVPS production: POST /api/setup/reset-admin (hoặc restart API — bootstrap bcrypt).");
}

main()
  .catch((e) => {
    console.error("Seed VPS FAIL:", e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
