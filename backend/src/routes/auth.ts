import { Router } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword, setAuthCookie, signToken, verifyPassword } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  const cleanPhone = String(phone || "").trim();
  const user = await prisma.user.findUnique({ where: { phone: cleanPhone } });
  if (!user || String(user.status).toUpperCase() !== "ACTIVE") return res.status(401).json({ message: "Số điện thoại hoặc mật khẩu không đúng" });
  const ok = await verifyPassword(String(password || ""), user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Số điện thoại hoặc mật khẩu không đúng" });
  const payload = { id: user.id, role: user.role, phone: user.phone, name: user.name };
  setAuthCookie(res, signToken(payload));
  res.json({ user: payload });
});

authRouter.post("/register", async (req, res) => {
  const { name, phone, password, role, vehicleType, licensePlate, seats, serviceArea } = req.body;
  const cleanPhone = String(phone || "").trim();
  const cleanName = String(name || "").trim();
  if (!cleanName) return res.status(400).json({ message: "Vui lòng nhập họ tên" });
  if (!cleanPhone) return res.status(400).json({ message: "Vui lòng nhập số điện thoại" });
  if (String(password || "").length < 6) return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự" });
  const safeRole = role === "DRIVER" ? UserRole.DRIVER : UserRole.CUSTOMER;
  const exists = await prisma.user.findUnique({ where: { phone: cleanPhone } });
  if (exists) return res.status(400).json({ message: "Số điện thoại đã tồn tại" });
  const user = await prisma.user.create({ data: { name: cleanName, phone: cleanPhone, passwordHash: await hashPassword(password), role: safeRole } });
  if (safeRole === UserRole.DRIVER) {
    const driver = await prisma.driver.create({ data: { userId: user.id, name: cleanName, phone: cleanPhone, direction: serviceArea || null, seatsFree: Number(seats || 0) } });
    if (vehicleType || licensePlate || seats) {
      await prisma.vehicle.create({ data: { driverId: driver.id, vehicleType: vehicleType || "Xe chưa cập nhật", licensePlate: licensePlate || null, seats: Number(seats || 0) } });
    }
  }
  else await prisma.customer.create({ data: { userId: user.id, name: cleanName, phone: cleanPhone } });
  const payload = { id: user.id, role: user.role, phone: user.phone, name: user.name };
  setAuthCookie(res, signToken(payload));
  res.json({ user: payload });
});

authRouter.get("/me", requireAuth, async (req, res) => res.json({ user: req.user }));

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("dxvq_token");
  res.json({ ok: true });
});

authRouter.post("/forgot-password", async (_req, res) => {
  return res.status(403).json({
    message: "Tính năng quên mật khẩu đang được bảo trì. Vui lòng liên hệ admin để được reset mật khẩu.",
  });
});

authRouter.post("/reset-password", async (_req, res) => {
  return res.status(403).json({
    message: "Không thể tự đặt lại mật khẩu công khai. Vui lòng liên hệ admin.",
  });
});
