/**
 * @deprecated Quy trình chuẩn: SETUP_SECRET + POST /api/setup/reset-admin (bcrypt admin).
 * Chỉ dùng script này nếu cần bcrypt hàng loạt mọi user (taixe123, khach123…).
 *
 *   cd backend && node scripts/hash-plain-passwords.mjs
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function isBcrypt(hash) {
  return /^\$2[aby]\$/.test(String(hash || ""));
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, phone: true, passwordHash: true } });
  let updated = 0;
  for (const u of users) {
    if (isBcrypt(u.passwordHash)) continue;
    const plain = String(u.passwordHash || "");
    if (!plain) {
      console.warn(`SKIP user #${u.id} ${u.phone}: password_hash trống`);
      continue;
    }
    const hash = await bcrypt.hash(plain, 10);
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } });
    console.log(`OK: ${u.phone} — đã bcrypt (giữ nguyên mật khẩu đang gõ: ${plain})`);
    updated++;
  }
  console.log(updated ? `\nXong: ${updated} tài khoản.` : "\nKhông có mật khẩu plain — đã bcrypt hoặc DB trống.");
}

main()
  .catch((e) => {
    console.error("FAIL:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
