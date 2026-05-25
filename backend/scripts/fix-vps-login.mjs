/**
 * Chạy trên VPS khi curl login vẫn 401:
 *   cd /var/www/dat-xe-ve-que/backend && node scripts/fix-vps-login.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PHONE = "0900000000";
const PASSWORD = "admin123";

function isBcrypt(h) {
  return /^\$2[aby]\$/.test(String(h || ""));
}

async function main() {
  console.log("DATABASE_URL host:", (process.env.DATABASE_URL || "").replace(/:[^:@]+@/, ":***@"));

  const count = await prisma.user.count();
  console.log("Tổng users trong DB:", count);

  let user = await prisma.user.findUnique({ where: { phone: PHONE } });
  if (!user) {
    console.log("Chưa có admin", PHONE, "— đang tạo...");
    user = await prisma.user.create({
      data: {
        name: "Admin Đặt Xe",
        phone: PHONE,
        email: "admin@datxeveque.vn",
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log("Đã tạo user id", user.id);
  } else {
    console.log("User hiện có:", {
      id: user.id,
      phone: user.phone,
      status: user.status,
      role: user.role,
      bcrypt: isBcrypt(user.passwordHash),
      hashLen: user.passwordHash?.length,
    });
    const testPlain = user.passwordHash === PASSWORD;
    const testBcrypt = isBcrypt(user.passwordHash) && (await bcrypt.compare(PASSWORD, user.passwordHash));
    console.log("Test mật khẩu admin123 — plain:", testPlain, "| bcrypt:", testBcrypt);

    const hash = await bcrypt.hash(PASSWORD, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, status: "ACTIVE", role: "ADMIN" },
    });
    console.log("Đã GHI ĐÈ mật khẩu bcrypt admin123 + ACTIVE");
  }

  const verify = await bcrypt.compare(PASSWORD, (await prisma.user.findUnique({ where: { phone: PHONE } })).passwordHash);
  console.log(verify ? "\nOK — chạy lại curl login" : "\nFAIL — kiểm tra DATABASE_URL");
}

main()
  .catch((e) => {
    console.error("LỖI:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
