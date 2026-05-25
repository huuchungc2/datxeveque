/**
 * Seed dữ liệu test: 20 tài xế + 300 đơn đặt vé
 * Chạy: node scripts/seed-test-data.mjs
 * (sau restore-db.bat, backend chưa cần chạy)
 */
import "dotenv/config";
import { PrismaClient, BookingStatus, BookingType } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_DRIVERS = 20;
const TARGET_BOOKINGS = 300;
const DRIVER_PASS = "taixe123";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(prefix) {
  const d = new Date();
  const yymmdd = [
    String(d.getFullYear()).slice(-2),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${prefix}-${yymmdd}-${suffix}`;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const DRIVER_NAMES = [
  "Nguyễn Văn An", "Trần Minh Tuấn", "Lê Hoàng Phúc", "Phạm Quốc Bảo", "Hoàng Văn Đức",
  "Võ Thanh Tùng", "Đặng Hữu Nam", "Bùi Văn Hùng", "Ngô Minh Khang", "Dương Văn Tài",
  "Lý Quang Huy", "Mai Văn Long", "Trương Đình Phát", "Hồ Minh Quân", "Đinh Văn Thắng",
  "Lâm Hoàng Sơn", "Phan Văn Kiệt", "Vũ Minh Đạt", "Tạ Văn Bình", "Chu Quang Hải",
];

const SG_PICKUPS = ["Bình Tân", "Tân Bình", "Quận 12", "Gò Vấp", "Thủ Đức", "Bình Thạnh", "An Lạc"];
const PROV_PICKUPS = ["Võ Xu", "Đức Linh", "Mỹ Thanh", "Lạc Tánh", "Đồi 61", "Nghĩa Chánh"];
const CUSTOMER_FIRST = ["Anh", "Chị", "Em", "Bà", "Chú", "Cô"];
const CUSTOMER_LAST = ["Lan", "Hùng", "Mai", "Tuấn", "Hoa", "Đức", "Linh", "Phúc", "Trang", "Nam"];

const STATUSES_WEIGHTED = [
  ...Array(65).fill(BookingStatus.WAITING_DISPATCH),
  ...Array(15).fill(BookingStatus.NEW),
  ...Array(10).fill(BookingStatus.CONTACTED),
  ...Array(5).fill(BookingStatus.QUOTED),
  ...Array(3).fill(BookingStatus.CANCELLED),
  ...Array(2).fill(BookingStatus.COMPLETED),
];

function estimateMoney(type, routeId, passengerCount) {
  const p = Math.max(1, passengerCount);
  if (type === BookingType.SHARED_RIDE) {
    const per = routeId && routeId >= 3 ? 280000 : 250000;
    const comm = routeId && routeId >= 3 ? 35000 : 30000;
    return { total: per * p, commission: comm * p };
  }
  if (type === BookingType.PRIVATE_RIDE) return { total: 1200000, commission: 150000 };
  if (type === BookingType.CARGO) return { total: 80000 + 5000 * rand(5, 40), commission: 20000 };
  if (type === BookingType.MARKET) return { total: 50000 + rand(0, 100000), commission: 20000 };
  return { total: 250000 * p, commission: 30000 * p };
}

async function clearTransactionalData() {
  await prisma.tripFinancialSnapshot.deleteMany({});
  await prisma.driverSettlementPayment.deleteMany({});
  await prisma.tripBooking.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.booking.deleteMany({});
  console.log("Đã xóa đơn/chuyến cũ (giữ admin, tuyến, giá).");
}

async function ensureDrivers() {
  const routes = await prisma.route.findMany();
  const sgRoute = routes.find((r) => r.fromName.includes("Sài Gòn")) || routes[0];
  const provRoute = routes.find((r) => r.fromName.includes("Đức")) || routes[1];

  let count = await prisma.driver.count();
  const startIdx = count;

  for (let i = startIdx; i < TARGET_DRIVERS; i++) {
    const n = i + 1;
    const phone = `091${String(1000100 + n).slice(-7)}`;
    const name = DRIVER_NAMES[i] || `Tài xế ${String(n).padStart(2, "0")}`;
    const atSg = i % 2 === 0;
    const status = i % 9 === 0 ? "Bận" : i % 11 === 0 ? "Nghỉ hôm nay" : "Rảnh";
    const seats = i % 4 === 0 ? 16 : 7;
    const vehicleType = seats >= 16 ? "Xe 16 chỗ" : "Xe 7 chỗ";

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email: `taixe${String(n).padStart(2, "0")}@test.dxvq.local`,
        passwordHash: DRIVER_PASS,
        role: "DRIVER",
        status: "ACTIVE",
      },
    });

    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        name,
        phone,
        zaloPhone: phone,
        status,
        location: atSg ? "Sài Gòn (HCM)" : pick(["Đức Linh", "Tánh Linh", "Mỹ Thanh"]),
        direction: atSg ? sgRoute.direction : provRoute.direction,
        seatsFree: status === "Rảnh" ? seats : 0,
      },
    });

    await prisma.vehicle.create({
      data: {
        driverId: driver.id,
        vehicleType,
        seats,
        licensePlate: `${rand(50, 99)}A-${rand(10000, 99999)}`,
        status: "Đang hoạt động",
      },
    });
    count++;
  }

  console.log(`Tài xế: ${await prisma.driver.count()} (mục tiêu ${TARGET_DRIVERS})`);
}

async function createBookings() {
  const routes = await prisma.route.findMany({ orderBy: { id: "asc" } });
  if (!routes.length) throw new Error("Chưa có tuyến — chạy restore-db.bat trước.");

  const types = [
    ...Array(70).fill(BookingType.SHARED_RIDE),
    ...Array(15).fill(BookingType.PRIVATE_RIDE),
    ...Array(10).fill(BookingType.CARGO),
    ...Array(5).fill(BookingType.MARKET),
  ];

  const usedCodes = new Set();
  let created = 0;
  const now = Date.now();

  while (created < TARGET_BOOKINGS) {
    const route = pick(routes);
    const type = pick(types);
    const passengerCount = type === BookingType.SHARED_RIDE ? rand(1, 4) : 1;
    const fromSg = route.fromName.includes("Sài Gòn");
    const pickup = fromSg ? `${pick(SG_PICKUPS)}, TP.HCM` : pick(PROV_PICKUPS);
    const dropoff = fromSg ? pick(PROV_PICKUPS) : `${pick(SG_PICKUPS)}, TP.HCM`;

    const dayOffset = rand(0, 14);
    const hour = rand(5, 20);
    const scheduledAt = new Date(now + dayOffset * 86400000);
    scheduledAt.setHours(hour, rand(0, 3) * 15, 0, 0);

    const { total, commission } = estimateMoney(type, route.id, passengerCount);
    const status = pick(STATUSES_WEIGHTED);

    let code = generateCode("DX");
    let tries = 0;
    while (usedCodes.has(code) && tries < 8) {
      code = generateCode("DX");
      tries++;
    }
    usedCodes.add(code);

    const customerName = `${pick(CUSTOMER_FIRST)} ${pick(CUSTOMER_LAST)}`;
    const phone = `09${String(10000000 + created + rand(0, 999)).slice(-8)}`;

    try {
      await prisma.booking.create({
        data: {
          code,
          customerName,
          customerPhone: phone,
          type,
          routeId: route.id,
          direction: route.direction,
          pickupAddress: pickup,
          dropoffAddress: dropoff,
          scheduledAt,
          passengerCount,
          status,
          estimatedTotal: total,
          finalTotal: total,
          commissionAmount: commission,
          paymentReceiver: Math.random() > 0.85 ? "ADMIN" : "DRIVER",
          pricingSnapshotJson: JSON.stringify({
            at: "SEED",
            type,
            routeId: route.id,
            passengerCount,
            total,
            commission,
          }),
        },
      });
      created++;
      if (created % 50 === 0) console.log(`  ... ${created}/${TARGET_BOOKINGS} đơn`);
    } catch (e) {
      if (String(e.code) !== "P2002") throw e;
    }
  }

  const byStatus = await prisma.booking.groupBy({ by: ["status"], _count: true });
  console.log(`Đơn đặt: ${created} — phân bổ trạng thái:`);
  byStatus.forEach((r) => console.log(`   ${r.status}: ${r._count}`));
}

async function main() {
  console.log("=== Seed test: 20 tài xế + 300 đơn ===\n");
  await clearTransactionalData();
  await ensureDrivers();
  await createBookings();
  console.log("\nXong. Mở /admin/dispatch để điều phối (đa số WAITING_DISPATCH).");
  console.log("Tài xế demo: 0910000102..0910000120 / taixe123");
}

main()
  .catch((e) => {
    console.error("Seed FAIL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
