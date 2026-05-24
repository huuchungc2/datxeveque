import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export async function hashPassword(password: string) {
  return bcrypt.hash(String(password || ""), 10);
}

export async function verifyPassword(password: string, storedPassword: string) {
  const input = String(password || "");
  const stored = String(storedPassword || "");
  if (!input || !stored) return false;

  const isBcryptHash = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
  if (isBcryptHash) {
    try {
      return await bcrypt.compare(input, stored);
    } catch {
      return false;
    }
  }

  // Chỉ cho phép plain text ở local/test để SQL restore demo vẫn đăng nhập được.
  // Production bắt buộc phải dùng bcrypt hash.
  if (process.env.NODE_ENV !== "production") return input === stored;
  return false;
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
