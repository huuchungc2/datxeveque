import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { calculatePrice } from "../lib/pricing.js";
import { createBookingRecord } from "../lib/createBooking.js";
import { assertVnPhone, PHONE_INVALID_MESSAGE } from "../lib/phone.js";

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
    const booking = await createBookingRecord({
      ...req.body,
      paymentReceiver: "DRIVER",
      source: "WEBSITE",
    });
    const price = JSON.parse(booking.pricingSnapshotJson || "{}").price;
    res.json({ booking, price });
  } catch (error: any) {
    console.error("POST /bookings error:", error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Không tạo được đơn. Vui lòng thử lại hoặc gọi hotline." });
  }
});

publicRouter.post("/track-booking", async (req, res) => {
  try {
    let trackPhone: string;
    try {
      trackPhone = assertVnPhone(req.body.phone);
    } catch (e: any) {
      return res.status(e.statusCode || 400).json({ message: e.message || PHONE_INVALID_MESSAGE });
    }
    const booking = await prisma.booking.findFirst({
      where: { code: req.body.code, customerPhone: trackPhone },
      include: { route: true },
    });
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
