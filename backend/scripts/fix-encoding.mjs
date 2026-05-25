/**
 * Sửa tên tuyến / text Việt bị lỗi (import SQL qua `more` hoặc mysql CLI Windows).
 * Chạy: node scripts/fix-encoding.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const routes = [
  {
    id: 1,
    name: "Xe Sài Gòn đi Đức Linh",
    fromName: "Sài Gòn",
    toName: "Đức Linh",
    direction: "Sài Gòn → Đức Linh",
    seoTitle: "Xe Sài Gòn đi Đức Linh | Xe ghép, bao xe, gửi hàng",
    seoDescription: "Đặt xe Sài Gòn đi Đức Linh, nhận xe ghép, bao xe 4-7 chỗ, gửi hàng, đi chợ quê.",
    content: "Tuyến Sài Gòn đi Đức Linh hỗ trợ xe ghép, bao xe, gửi hàng và đi chợ quê.",
  },
  {
    id: 2,
    name: "Xe Đức Linh đi Sài Gòn",
    fromName: "Đức Linh",
    toName: "Sài Gòn",
    direction: "Đức Linh → Sài Gòn",
    seoTitle: "Xe Đức Linh đi Sài Gòn | Đón trả tận nơi",
    seoDescription: "Đặt xe Đức Linh đi Sài Gòn, hỗ trợ khách về lại thành phố.",
    content: "Tuyến Đức Linh đi Sài Gòn hỗ trợ nhiều khung giờ.",
  },
  {
    id: 3,
    name: "Xe Sài Gòn đi Tánh Linh",
    fromName: "Sài Gòn",
    toName: "Tánh Linh",
    direction: "Sài Gòn → Tánh Linh",
    seoTitle: "Xe Sài Gòn đi Tánh Linh | Xe ghép, bao xe",
    seoDescription: "Đặt xe Sài Gòn đi Tánh Linh, xe ghép, bao xe, gửi hàng.",
    content: "Tuyến Sài Gòn đi Tánh Linh hỗ trợ Lạc Tánh, Bắc Ruộng, Đồng Kho.",
  },
  {
    id: 4,
    name: "Xe Tánh Linh đi Sài Gòn",
    fromName: "Tánh Linh",
    toName: "Sài Gòn",
    direction: "Tánh Linh → Sài Gòn",
    seoTitle: "Xe Tánh Linh đi Sài Gòn | Đặt xe nhanh",
    seoDescription: "Đặt xe Tánh Linh đi Sài Gòn, hỗ trợ đón trả tận nơi.",
    content: "Tuyến Tánh Linh đi Sài Gòn hỗ trợ khách, hàng hóa và xe riêng.",
  },
];

for (const r of routes) {
  const { id, ...data } = r;
  await prisma.route.update({ where: { id }, data });
  console.log("OK route", id, r.name);
}

await prisma.driver.updateMany({
  where: { id: 1 },
  data: {
    status: "Rảnh",
    location: "Bình Tân",
    direction: "Sài Gòn → Đức Linh/Tánh Linh",
  },
});

await prisma.booking.updateMany({
  where: { id: 1 },
  data: { direction: "Sài Gòn → Đức Linh" },
});

await prisma.siteSetting.updateMany({
  where: { key: "service_area" },
  data: { value: "Sài Gòn, Đức Linh, Tánh Linh" },
});

console.log("Xong. Restart API neu dang chay.");
await prisma.$disconnect();
