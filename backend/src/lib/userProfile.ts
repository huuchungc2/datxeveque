import { UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";
import { hashPassword, verifyPassword } from "./auth.js";
import { assertVnPhone, PHONE_INVALID_MESSAGE } from "./phone.js";

export type ProfilePayload = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  role: string;
  zaloPhone: string | null;
};

export async function getUserProfile(userId: number): Promise<ProfilePayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true, driver: true },
  });
  if (!user) return null;

  const zaloPhone = user.customer?.zaloPhone ?? user.driver?.zaloPhone ?? null;

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    address: user.address,
    role: user.role,
    zaloPhone,
  };
}

export async function updateUserProfile(
  userId: number,
  body: { name?: string; phone?: string; email?: string | null; address?: string | null; zaloPhone?: string | null },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true, driver: true },
  });
  if (!user) {
    const err = new Error("Không tìm thấy tài khoản") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const cleanName = body.name !== undefined ? String(body.name).trim() : user.name;
  if (!cleanName) {
    const err = new Error("Vui lòng nhập họ tên") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  let cleanPhone = user.phone;
  if (body.phone !== undefined) {
    try {
      cleanPhone = assertVnPhone(body.phone);
    } catch (e: any) {
      const err = new Error(e.message || PHONE_INVALID_MESSAGE) as Error & { statusCode?: number };
      err.statusCode = e.statusCode || 400;
      throw err;
    }
    if (cleanPhone !== user.phone) {
      const taken = await prisma.user.findFirst({ where: { phone: cleanPhone, NOT: { id: userId } } });
      if (taken) {
        const err = new Error("Số điện thoại đã được tài khoản khác sử dụng") as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }
    }
  }

  let email: string | null = user.email;
  if (body.email !== undefined) {
    const raw = String(body.email || "").trim();
    email = raw ? raw.toLowerCase() : null;
    if (email) {
      const emailTaken = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
      if (emailTaken) {
        const err = new Error("Email đã được tài khoản khác sử dụng") as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }
    }
  }

  const address =
    body.address !== undefined ? (String(body.address || "").trim() || null) : user.address;

  const zaloRaw = body.zaloPhone !== undefined ? String(body.zaloPhone || "").trim() : undefined;
  let zaloPhone: string | null | undefined = undefined;
  if (zaloRaw !== undefined) {
    if (!zaloRaw) zaloPhone = null;
    else {
      try {
        zaloPhone = assertVnPhone(zaloRaw);
      } catch (e: any) {
        const err = new Error("Số Zalo không hợp lệ") as Error & { statusCode?: number };
        err.statusCode = 400;
        throw err;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { name: cleanName, phone: cleanPhone, email, address },
    });

    if (user.role === UserRole.CUSTOMER) {
      if (user.customer) {
        await tx.customer.update({
          where: { id: user.customer.id },
          data: {
            name: cleanName,
            phone: cleanPhone,
            ...(zaloPhone !== undefined ? { zaloPhone } : {}),
          },
        });
      } else {
        await tx.customer.create({
          data: {
            userId,
            name: cleanName,
            phone: cleanPhone,
            zaloPhone: zaloPhone ?? null,
          },
        });
      }
    }

    if (user.role === UserRole.DRIVER) {
      if (user.driver) {
        await tx.driver.update({
          where: { id: user.driver.id },
          data: {
            name: cleanName,
            phone: cleanPhone,
            ...(zaloPhone !== undefined ? { zaloPhone } : {}),
          },
        });
      }
    }
  });

  return getUserProfile(userId);
}

export async function changeUserPassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error("Không tìm thấy tài khoản") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  const current = String(currentPassword || "").trim();
  const next = String(newPassword || "").trim();
  if (!current) {
    const err = new Error("Vui lòng nhập mật khẩu hiện tại") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (next.length < 6) {
    const err = new Error("Mật khẩu mới tối thiểu 6 ký tự") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) {
    const err = new Error("Mật khẩu hiện tại không đúng") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next) },
  });

  return { ok: true };
}
