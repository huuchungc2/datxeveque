import { Router } from "express";
import { UserRole, UserStatus } from "@prisma/client";
import { hashPassword, isPasswordHashBcrypt } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export const setupRouter = Router();

/** Kiểm tra VPS: DB + admin demo (không lộ mật khẩu). */
setupRouter.get("/status", async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    const admin = await prisma.user.findUnique({ where: { phone: "0900000000" } });
    res.json({
      ok: true,
      userCount,
      admin: admin
        ? {
            exists: true,
            status: admin.status,
            bcrypt: isPasswordHashBcrypt(admin.passwordHash),
          }
        : { exists: false },
      hint: "Đăng nhập: 0900000000 / admin123 sau reset-admin",
    });
  } catch (e: any) {
    res.status(503).json({ ok: false, message: e.message || "Không kết nối database" });
  }
});

/**
 * Sau import DB từ local (password_hash plain): gọi một lần để bcrypt admin123.
 * Cần SETUP_SECRET trong .env khi gọi qua HTTPS; từ 127.0.0.1 trên VPS có thể body {}.
 */
function isLocalRequest(req: { ip?: string; socket?: { remoteAddress?: string } }) {
  const ip = req.ip || req.socket?.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip.endsWith("127.0.0.1");
}

setupRouter.post("/reset-admin", async (req, res) => {
  try {
    const expected = process.env.SETUP_SECRET?.trim();
    const fromLocal = isLocalRequest(req);
    if (!fromLocal) {
      if (!expected) {
        return res.status(403).json({
          message: "Thêm SETUP_SECRET trong backend/.env hoặc gọi từ VPS: curl 127.0.0.1:4002/api/setup/reset-admin",
        });
      }
      if (String(req.body?.secret || "") !== expected) {
        return res.status(403).json({ message: "Sai SETUP_SECRET" });
      }
    } else {
      console.warn("[setup] reset-admin từ localhost");
    }

    const passwordHash = await hashPassword("admin123");
    const admin = await prisma.user.upsert({
      where: { phone: "0900000000" },
      create: {
        name: "Admin Đặt Xe",
        phone: "0900000000",
        email: "admin@datxeveque.vn",
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
      update: {
        passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.ADMIN,
      },
    });

    res.json({
      message: "Đã đặt lại admin: 0900000000 / admin123",
      userId: admin.id,
    });
  } catch (e: any) {
    console.error("[setup] reset-admin FAIL:", e);
    const code = e?.code;
    const hint =
      code === "P1001" || code === "P1000"
        ? "Không kết nối MySQL — kiểm tra DATABASE_URL và mysql đang chạy."
        : code === "P2021" || code === "P2022"
          ? "Bảng/cột DB lệch schema — chạy: cd backend && npm run db:migrate"
          : code === "P2002"
            ? "Trùng email/SĐT — sửa trong MySQL hoặc node scripts/fix-vps-login.mjs"
            : "Xem pm2 logs hoặc chạy: node scripts/fix-vps-login.mjs";
    res.status(503).json({
      message: e?.message || "reset-admin thất bại",
      code,
      hint,
    });
  }
});
