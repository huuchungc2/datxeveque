import { Router, type Request } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { calculatePrice } from "../lib/pricing.js";
import { createBookingRecord } from "../lib/createBooking.js";
import { verifyToken } from "../lib/auth.js";
import type { AuthUser } from "../middleware/auth.js";
import { assertVnPhone, PHONE_INVALID_MESSAGE } from "../lib/phone.js";
import { bookingCustomerInclude, serializeBookingForCustomer } from "../lib/bookingCustomerView.js";
import {
  submitCustomerCancelRequest,
  submitCustomerChangeRequest,
} from "../lib/bookingCustomerRequest.js";
import { getAppTimePayload } from "../lib/datetime.js";
import { publicRouteWhere } from "../lib/routes.js";

export const publicRouter = Router();

async function optionalLoggedInCustomerUserId(req: Request): Promise<number | undefined> {
  const token = req.cookies?.dxvq_token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return undefined;
  const decoded = verifyToken<AuthUser>(token);
  if (!decoded?.id || decoded.role !== UserRole.CUSTOMER) return undefined;
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || user.status !== "ACTIVE") return undefined;
  return user.id;
}

function toInt(value: unknown, fallback: number | null = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

publicRouter.get("/app-time", (_req, res) => {
  res.json(getAppTimePayload());
});

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
    const routes = await prisma.route.findMany({ where: publicRouteWhere(), orderBy: { id: "asc" } });
    res.json(routes);
  } catch (error) {
    console.error("GET /routes error:", error);
    res.status(500).json({ message: "Không tải được danh sách tuyến" });
  }
});

publicRouter.get("/routes/:slug", async (req, res) => {
  try {
    const route = await prisma.route.findFirst({
      where: { slug: req.params.slug, ...publicRouteWhere() },
    });
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
    const loggedInUserId = await optionalLoggedInCustomerUserId(req);
    const booking = await createBookingRecord({
      ...req.body,
      paymentReceiver: "DRIVER",
      source: "WEBSITE",
      loggedInUserId,
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

async function lookupBookingByCodePhone(code: string, phone: string) {
  const trackPhone = assertVnPhone(phone);
  const booking = await prisma.booking.findFirst({
    where: { code: code.trim(), customerPhone: trackPhone },
    include: bookingCustomerInclude,
  });
  if (!booking) {
    throw Object.assign(new Error("Không tìm thấy đơn hoặc số điện thoại không đúng."), { statusCode: 404 });
  }
  return serializeBookingForCustomer(booking);
}

publicRouter.post("/track-booking", async (req, res) => {
  try {
    const data = await lookupBookingByCodePhone(req.body.code, req.body.phone);
    res.json(data);
  } catch (e: any) {
    if (e.statusCode === 404) return res.status(404).json({ message: e.message });
    if (e.statusCode === 400) return res.status(400).json({ message: e.message || PHONE_INVALID_MESSAGE });
    console.error("POST /track-booking error:", e);
    res.status(500).json({ message: "Không tra cứu được đơn" });
  }
});

publicRouter.post("/bookings/lookup", async (req, res) => {
  try {
    const data = await lookupBookingByCodePhone(req.body.code, req.body.phone);
    res.json(data);
  } catch (e: any) {
    if (e.statusCode === 404) return res.status(404).json({ message: e.message });
    if (e.statusCode === 400) return res.status(400).json({ message: e.message || PHONE_INVALID_MESSAGE });
    console.error("POST /bookings/lookup error:", e);
    res.status(500).json({ message: "Không tra cứu được đơn" });
  }
});

publicRouter.post("/bookings/:id/request-change", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Mã đơn không hợp lệ" });
    const result = await submitCustomerChangeRequest(id, req.body);
    res.json(result);
  } catch (e: any) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message || "Không gửi được yêu cầu", code: e.code });
  }
});

publicRouter.post("/bookings/:id/request-cancel", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Mã đơn không hợp lệ" });
    const result = await submitCustomerCancelRequest(id, req.body);
    res.json(result);
  } catch (e: any) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message || "Không gửi được yêu cầu", code: e.code });
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
