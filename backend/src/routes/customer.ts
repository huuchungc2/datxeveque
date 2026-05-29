import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { bookingCustomerInclude, serializeBookingForCustomer } from "../lib/bookingCustomerView.js";
import {
  submitCustomerCancelRequest,
  submitCustomerChangeRequest,
} from "../lib/bookingCustomerRequest.js";

export const customerRouter = Router();
customerRouter.use(requireAuth, requireRoles(["CUSTOMER"]));

customerRouter.get("/bookings", async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({ where: { userId: req.user!.id } });
    if (!customer) return res.json({ items: [], total: 0, page: 1, limit: 20 });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where: { customerId: customer.id } }),
      prisma.booking.findMany({
        where: { customerId: customer.id },
        include: { route: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    res.json({
      items: bookings.map((b) => ({
        id: b.id,
        code: b.code,
        type: b.type,
        hasAccompanyingCargo: b.hasAccompanyingCargo,
        status: b.status,
        route: b.route ? { name: b.route.name } : null,
        direction: b.direction,
        scheduledAt: b.scheduledAt,
        pickupAddress: b.pickupAddress,
        dropoffAddress: b.dropoffAddress,
        passengerCount: b.passengerCount,
        estimatedTotal: b.estimatedTotal,
        finalTotal: b.finalTotal,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /customer/bookings error:", error);
    res.status(500).json({ message: "Không tải được danh sách đơn của khách" });
  }
});

customerRouter.get("/bookings/:id", async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({ where: { userId: req.user!.id } });
    if (!customer) return res.status(404).json({ message: "Không tìm thấy tài khoản khách" });

    const id = Number(req.params.id);
    const booking = await prisma.booking.findFirst({
      where: { id, customerId: customer.id },
      include: bookingCustomerInclude,
    });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn" });
    res.json(serializeBookingForCustomer(booking));
  } catch (error) {
    console.error("GET /customer/bookings/:id error:", error);
    res.status(500).json({ message: "Không tải được chi tiết đơn" });
  }
});

customerRouter.post("/bookings/:id/request-change", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await submitCustomerChangeRequest(id, req.body, req.user!.id);
    res.json(result);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ message: e.message || "Không gửi được yêu cầu", code: e.code });
  }
});

customerRouter.post("/bookings/:id/request-cancel", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await submitCustomerCancelRequest(id, req.body, req.user!.id);
    res.json(result);
  } catch (e: any) {
    res.status(e.statusCode || 500).json({ message: e.message || "Không gửi được yêu cầu", code: e.code });
  }
});
