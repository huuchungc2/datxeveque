import { Router } from "express";
import { BookingStatus, BookingType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { calculatePrice } from "../lib/pricing.js";
import { generateCode } from "../lib/codes.js";

export const publicRouter = Router();

function toInt(value: unknown, fallback: number | null = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

publicRouter.get("/settings", async (_req, res) => {
  try {
    const rows = await prisma.siteSetting.findMany();
    res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch (error) {
    console.error("GET /settings error:", error);
    res.status(500).json({ message: "Không tải được cấu hình website" });
  }
});

publicRouter.get("/routes", async (_req, res) => {
  try {
    // Không filter cứng status để tránh lỗi lệch dữ liệu seed: active / ACTIVE / Đang chạy.
    // UI chỉ cần có tuyến để khách đặt, admin mới quyết định bật/tắt chi tiết.
    const routes = await prisma.route.findMany({ orderBy: { id: "asc" } });
    res.json(routes);
  } catch (error) {
    console.error("GET /routes error:", error);
    res.status(500).json({ message: "Không tải được danh sách tuyến" });
  }
});

publicRouter.get("/routes/:slug", async (req, res) => {
  try {
    const route = await prisma.route.findUnique({ where: { slug: req.params.slug } });
    if (!route) return res.status(404).json({ message: "Không tìm thấy tuyến" });
    res.json(route);
  } catch (error) {
    console.error("GET /routes/:slug error:", error);
    res.status(500).json({ message: "Không tải được tuyến" });
  }
});

publicRouter.get("/services", async (_req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { id: "asc" } });
    res.json(services);
  } catch (error) {
    console.error("GET /services error:", error);
    res.status(500).json({ message: "Không tải được danh sách dịch vụ" });
  }
});

publicRouter.post("/price/estimate", async (req, res) => {
  try {
    const result = await calculatePrice({
      type: req.body.type || req.body.serviceType,
      routeId: req.body.routeId,
      passengerCount: req.body.passengerCount,
      weightKg: req.body.weightKg,
      vehicleType: req.body.vehicleType,
    });
    res.json(result);
  } catch (error) {
    console.error("POST /price/estimate error:", error);
    res.status(500).json({ estimatedTotal: 0, commissionAmount: 0, note: "Chưa tính được giá tạm tính" });
  }
});

publicRouter.post("/bookings", async (req, res) => {
  try {
    const type = req.body.type as BookingType;
    const routeId = req.body.routeId ? Number(req.body.routeId) : null;
    const passengerCount = Math.max(1, Number(req.body.passengerCount || 1));

    if (!req.body.customerName?.trim()) return res.status(400).json({ message: "Vui lòng nhập họ tên" });
    if (!req.body.customerPhone?.trim()) return res.status(400).json({ message: "Vui lòng nhập số điện thoại/Zalo" });

    const price = await calculatePrice({
      type,
      routeId,
      passengerCount,
      weightKg: req.body.weightKg,
      vehicleType: req.body.vehicleType,
    });

    let customer = await prisma.customer.findFirst({ where: { phone: req.body.customerPhone.trim() } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: req.body.customerName.trim(), phone: req.body.customerPhone.trim() } });
    }

    let booking: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        booking = await prisma.booking.create({
          data: {
            code: generateCode("DX"),
        customerId: customer.id,
        customerName: req.body.customerName.trim(),
        customerPhone: req.body.customerPhone.trim(),
        type,
        routeId,
        direction: req.body.direction || null,
        pickupAddress: req.body.pickupAddress || null,
        dropoffAddress: req.body.dropoffAddress || null,
        scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
        passengerCount,
        vehicleType: req.body.vehicleType || null,
        cargoDescription: req.body.cargoDescription || null,
        marketDescription: req.body.marketDescription || null,
        note: req.body.note || null,
        status: BookingStatus.WAITING_DISPATCH,
        estimatedTotal: price.estimatedTotal || 0,
        finalTotal: price.estimatedTotal || 0,
        commissionAmount: price.commissionAmount || 0,
            paymentReceiver: req.body.paymentReceiver || "DRIVER",
          },
        });
        break;
      } catch (err: any) {
        if (String(err?.code) !== "P2002" || attempt === 4) throw err;
      }
    }

    res.json({ booking, price });
  } catch (error) {
    console.error("POST /bookings error:", error);
    res.status(500).json({ message: "Không tạo được đơn. Vui lòng thử lại hoặc gọi hotline." });
  }
});

publicRouter.post("/track-booking", async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { code: req.body.code, customerPhone: req.body.phone }, include: { route: true } });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn" });
    res.json(booking);
  } catch (error) {
    console.error("POST /track-booking error:", error);
    res.status(500).json({ message: "Không tra cứu được đơn" });
  }
});

publicRouter.get("/posts", async (_req, res) => {
  try {
    const posts = await prisma.post.findMany({ where: { status: "PUBLISHED" }, include: { category: true }, orderBy: { publishedAt: "desc" } });
    res.json(posts);
  } catch (error) {
    console.error("GET /posts error:", error);
    res.status(500).json({ message: "Không tải được bài viết" });
  }
});

publicRouter.get("/posts/:slug", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { slug: req.params.slug }, include: { category: true } });
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    res.json(post);
  } catch (error) {
    console.error("GET /posts/:slug error:", error);
    res.status(500).json({ message: "Không tải được bài viết" });
  }
});
