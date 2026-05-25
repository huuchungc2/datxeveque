import { UserRole, UserStatus } from "@prisma/client";
import { hashPassword, isPasswordHashBcrypt } from "./auth.js";
import { prisma } from "./prisma.js";

/** SĐT có thể lưu thiếu số 0 — thử thêm biến thể khi login. */
export function phoneLookupVariants(cleanPhone: string) {
  const variants = new Set<string>([cleanPhone]);
  if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
    variants.add(cleanPhone.slice(1));
    variants.add(`84${cleanPhone.slice(1)}`);
  }
  return [...variants];
}

export async function findUserByPhone(cleanPhone: string) {
  for (const phone of phoneLookupVariants(cleanPhone)) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (user) return user;
  }
  return null;
}

/**
 * Sau import dump (admin123 dạng chữ): khi API start, bcrypt toàn bộ — login VPS không cần bước tay.
 */
export async function migrateLegacyPasswordHashesOnStartup() {
  const users = await prisma.user.findMany({
    select: { id: true, phone: true, passwordHash: true },
  });
  let n = 0;
  for (const u of users) {
    const stored = String(u.passwordHash || "");
    if (!stored || isPasswordHashBcrypt(stored)) continue;
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await hashPassword(stored) },
    });
    n++;
    console.log(`[auth] Đã mã hóa mật khẩu user #${u.id} (${u.phone})`);
  }
  if (n) console.log(`[auth] migrateLegacyPasswordHashes: ${n} tài khoản`);
}

/** Nếu DB trống admin demo — tạo để VPS mới import lỗi vẫn đăng nhập được. */
export async function ensureDemoAdminUser() {
  const phone = "0900000000";
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return;

  await prisma.user.create({
    data: {
      name: "Admin Đặt Xe",
      phone,
      email: "admin@datxeveque.vn",
      passwordHash: await hashPassword("admin123"),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log("[auth] Đã tạo admin demo 0900000000 / admin123 (DB chưa có user admin)");
}

export async function bootstrapAuthOnStartup() {
  try {
    await migrateLegacyPasswordHashesOnStartup();
    await ensureDemoAdminUser();
  } catch (e) {
    console.error("[auth] bootstrap FAIL:", e);
  }
}
