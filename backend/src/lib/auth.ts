import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export function isPasswordHashBcrypt(stored: string) {
  return /^\$2[aby]\$/.test(String(stored || ""));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(String(password || ""), 10);
}

/** Dump/restore SQL có thể lưu admin123 dạng chữ — vẫn so khớp; lúc login sẽ tự bcrypt (xem upgradePasswordIfLegacy). */
export async function verifyPassword(password: string, storedPassword: string) {
  const input = String(password || "").trim();
  const stored = String(storedPassword || "").trim();
  if (!input || !stored) return false;

  if (isPasswordHashBcrypt(stored)) {
    try {
      return await bcrypt.compare(input, stored);
    } catch {
      return false;
    }
  }

  return input === stored;
}

/** Lần đăng nhập đầu sau import dump: chuyển mật khẩu plain → bcrypt, không cần script tay trên VPS. */
export async function upgradePasswordIfLegacy(userId: number, password: string, storedHash: string) {
  if (isPasswordHashBcrypt(storedHash)) return;
  const { prisma } = await import("./prisma.js");
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });
}

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken<T>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string) {
  const sameSite = process.env.COOKIE_SAMESITE === "none" ? "none" : "lax";
  const secure = process.env.NODE_ENV === "production" || sameSite === "none";
  res.cookie("dxvq_token", token, {
    httpOnly: true,
    sameSite,
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}
