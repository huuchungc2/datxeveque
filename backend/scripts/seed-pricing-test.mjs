/**
 * Khai giá tạm tính test cho tất cả dịch vụ. Chạy: npm run db:seed-pricing
 * An toàn chạy lại — upsert theo serviceType + routeId.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** @type {import('@prisma/client').Prisma.PriceRuleCreateManyInput[]} */
const TEST_RULES = [
  // Xe ghép — theo người / tuyến
  { serviceType: "SHARED_RIDE", routeId: 1, pricingType: "PER_PERSON", basePrice: 0, pricePerPerson: 250000, pricePerKg: 0, commissionType: "FIXED", commissionValue: 30000, active: true },
  { serviceType: "SHARED_RIDE", routeId: 2, pricingType: "PER_PERSON", basePrice: 0, pricePerPerson: 250000, pricePerKg: 0, commissionType: "FIXED", commissionValue: 30000, active: true },
  { serviceType: "SHARED_RIDE", routeId: 3, pricingType: "PER_PERSON", basePrice: 0, pricePerPerson: 280000, pricePerKg: 0, commissionType: "FIXED", commissionValue: 35000, active: true },
  { serviceType: "SHARED_RIDE", routeId: 4, pricingType: "PER_PERSON", basePrice: 0, pricePerPerson: 280000, pricePerKg: 0, commissionType: "FIXED", commissionValue: 35000, active: true },

  // Bao xe — theo chuyến / tuyến
  { serviceType: "PRIVATE_RIDE", routeId: 1, pricingType: "PER_TRIP", basePrice: 1200000, pricePerPerson: 0, pricePerKg: 0, commissionType: "FIXED", commissionValue: 150000, active: true },
  { serviceType: "PRIVATE_RIDE", routeId: 2, pricingType: "PER_TRIP", basePrice: 1200000, pricePerPerson: 0, pricePerKg: 0, commissionType: "FIXED", commissionValue: 150000, active: true },
  { serviceType: "PRIVATE_RIDE", routeId: 3, pricingType: "PER_TRIP", basePrice: 1450000, pricePerPerson: 0, pricePerKg: 0, commissionType: "FIXED", commissionValue: 180000, active: true },
  { serviceType: "PRIVATE_RIDE", routeId: 4, pricingType: "PER_TRIP", basePrice: 1450000, pricePerPerson: 0, pricePerKg: 0, commissionType: "FIXED", commissionValue: 180000, active: true },

  // Gửi hàng — theo kg / tuyến
  { serviceType: "CARGO", routeId: 1, pricingType: "PER_KG", basePrice: 30000, pricePerPerson: 0, pricePerKg: 5000, commissionType: "FIXED", commissionValue: 20000, active: true },
  { serviceType: "CARGO", routeId: 2, pricingType: "PER_KG", basePrice: 30000, pricePerPerson: 0, pricePerKg: 5000, commissionType: "FIXED", commissionValue: 20000, active: true },
  { serviceType: "CARGO", routeId: 3, pricingType: "PER_KG", basePrice: 35000, pricePerPerson: 0, pricePerKg: 6000, commissionType: "FIXED", commissionValue: 25000, active: true },
  { serviceType: "CARGO", routeId: 4, pricingType: "PER_KG", basePrice: 35000, pricePerPerson: 0, pricePerKg: 6000, commissionType: "FIXED", commissionValue: 25000, active: true },

  // Global (mọi tuyến)
  { serviceType: "MARKET", routeId: null, pricingType: "PER_TRIP", basePrice: 80000, pricePerPerson: 0, pricePerKg: 0, commissionType: "FIXED", commissionValue: 15000, active: true },
  { serviceType: "CONTRACT", routeId: null, pricingType: "PER_TRIP", basePrice: 1500000, pricePerPerson: 0, pricePerKg: 0, commissionType: "PERCENT", commissionValue: 10, active: true },
  { serviceType: "WEDDING", routeId: null, pricingType: "PER_TRIP", basePrice: 5500000, pricePerPerson: 0, pricePerKg: 0, commissionType: "FIXED", commissionValue: 500000, active: true },
  { serviceType: "TOUR", routeId: null, pricingType: "PER_TRIP", basePrice: 1800000, pricePerPerson: 0, pricePerKg: 0, commissionType: "FIXED", commissionValue: 200000, active: true },
  { serviceType: "HOSPITAL", routeId: null, pricingType: "PER_TRIP", basePrice: 850000, pricePerPerson: 0, pricePerKg: 0, commissionType: "FIXED", commissionValue: 100000, active: true },
  { serviceType: "AIRPORT", routeId: null, pricingType: "PER_TRIP", basePrice: 650000, pricePerPerson: 0, pricePerKg: 0, commissionType: "FIXED", commissionValue: 80000, active: true },
];

const TEST_SERVICES = [
  { name: "Xe ghép", slug: "xe-ghep", type: "SHARED_RIDE", description: "Gom khách theo tuyến cố định" },
  { name: "Bao xe", slug: "bao-xe", type: "PRIVATE_RIDE", description: "Xe riêng 4-7-16 chỗ" },
  { name: "Gửi hàng", slug: "gui-hang", type: "CARGO", description: "Gửi hàng hai chiều" },
  { name: "Đi chợ quê", slug: "di-cho-que", type: "MARKET", description: "Mua hộ đồ quê" },
  { name: "Xe hợp đồng", slug: "xe-hop-dong", type: "CONTRACT", description: "Thuê xe theo lịch trình" },
  { name: "Xe đám cưới", slug: "xe-dam-cuoi", type: "WEDDING", description: "Đám cưới, đón dâu rước dâu" },
  { name: "Xe tham quan", slug: "xe-tham-quan", type: "TOUR", description: "Tour trong ngày / nhiều ngày" },
  { name: "Xe bệnh viện", slug: "xe-di-benh-vien", type: "HOSPITAL", description: "Đưa đón bệnh viện" },
  { name: "Xe sân bay", slug: "xe-san-bay", type: "AIRPORT", description: "Đón tiễn sân bay" },
];

async function upsertService(s) {
  await prisma.service.upsert({
    where: { type: s.type },
    create: { name: s.name, slug: s.slug, type: s.type, description: s.description, status: "Đang bật" },
    update: { name: s.name, description: s.description },
  });
}

async function upsertRule(rule) {
  const existing = await prisma.priceRule.findFirst({
    where: { serviceType: rule.serviceType, routeId: rule.routeId },
  });
  if (existing) {
    await prisma.priceRule.update({ where: { id: existing.id }, data: rule });
    return "update";
  }
  await prisma.priceRule.create({ data: rule });
  return "create";
}

async function main() {
  const routes = await prisma.route.findMany({ orderBy: { id: "asc" } });
  if (!routes.length) {
    console.error("Chưa có tuyến — chạy restore-db.bat trước.");
    process.exit(1);
  }

  for (const s of TEST_SERVICES) {
    await upsertService(s);
  }
  console.log(`Dịch vụ (services): ${TEST_SERVICES.length} loại`);

  let created = 0;
  let updated = 0;
  for (const rule of TEST_RULES) {
    if (rule.routeId != null && rule.routeId > routes.length) continue;
    const action = await upsertRule(rule);
    if (action === "create") created++;
    else updated++;
  }

  const count = await prisma.priceRule.count({ where: { active: true } });
  console.log(`Bảng giá: tạo mới ${created}, cập nhật ${updated} — tổng ${count} rule đang bật`);
  console.log("Xong. Thử đặt xe trên web để xem giá tạm tính.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
