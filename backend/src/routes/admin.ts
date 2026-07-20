import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import slugify from "slugify";
import { BookingStatus, SettlementStatus, TripStatus, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { hashPassword } from "../lib/auth.js";
import { generateCode } from "../lib/codes.js";
import { buildDispatchSuggestions, computeDispatchSeatSummary } from "../lib/dispatchSuggestions.js";
import { buildDispatchOptionsForSuggestion, enrichBookingDispatchSeats } from "../lib/dispatchOptions.js";
import { bookingNeedsDispatch } from "../lib/bookingSeats.js";
import {
  assertDriverAvailableForNewTrip,
  buildAvailableDriverWhere,
  getBusyDriverIds,
} from "../lib/dispatchDrivers.js";
import { completeTrip } from "../lib/tripComplete.js";
import {
  buildPaidByTrip,
  enrichTripDebtRow,
  loadPaymentsForTrips,
  validateSettlementPayment,
  computeSettlementStatus,
} from "../lib/tripSettlement.js";
import { adminCreateBooking, patchBookingAdmin } from "../lib/adminBooking.js";
import { patchBookingDriverStatus } from "../lib/adminBookingDriverStatus.js";
import { getAdminDashboard } from "../lib/adminDashboard.js";
import { cancelBookingAdmin, confirmBookingAdmin } from "../lib/bookingConfirm.js";
import { moveBookingBetweenTrips } from "../lib/bookingMoveTrip.js";
import { parsePageQuery, toNumberOrUndefined } from "../lib/pagination.js";
import { buildAdminRouteListWhere, normalizeRouteLocked, publicRouteWhere } from "../lib/routes.js";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE } from "../lib/phone.js";
import { createAdminUser, updateAdminUser, userInclude } from "../lib/adminUser.js";
import { patchAdminDriver } from "../lib/driverAvailability.js";
import { applyDispatchSuggestion, assignBookingsToTrip, assignDriverToTrip } from "../lib/dispatchApply.js";
import { loadDispatchBoard } from "../lib/dispatchBoard.js";
import { sendTelegramTest, telegramNotifyEnabled } from "../lib/telegramNotify.js";
import { parseScheduledAtDateRange } from "../lib/datetime.js";
import {
  serializeBooking,
  serializeBookings,
  serializePaginatedBookings,
} from "../lib/bookingSerialize.js";

function sanitizePostContent(html: string) {
  return String(html || "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRoles(["ADMIN", "DISPATCHER", "ACCOUNTANT"]));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function buildBookingListWhere(query: Record<string, unknown>) {
  const where: any = {};
  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;
  if (query.routeId) where.routeId = Number(query.routeId);
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  const keyword = String(query.keyword || query.q || "").trim();
  if (keyword) {
    where.OR = [
      { customerName: { contains: keyword } },
      { customerPhone: { contains: keyword } },
      { code: { contains: keyword } },
      { pickupAddress: { contains: keyword } },
      { dropoffAddress: { contains: keyword } },
    ];
  }
  const scheduledRange = parseScheduledAtDateRange(query.dateFrom || query.from, query.dateTo || query.to);
  if (scheduledRange) where.scheduledAt = scheduledRange;
  const seats = toNumberOrUndefined(query.seats);
  if (seats !== undefined) where.passengerCount = seats;
  return where;
}

adminRouter.get("/dashboard", async (_req, res) => {
  try {
    res.json(await getAdminDashboard());
  } catch (error) {
    console.error("GET /admin/dashboard error:", error);
    res.status(500).json({ message: "Không tải được dashboard" });
  }
});

adminRouter.get("/bookings", async (req, res) => {
  const where = buildBookingListWhere(req.query as Record<string, unknown>);
  const include = { route: true, tripBookings: { include: { trip: { select: { id: true, code: true, driver: { select: { name: true } } } } } } };
  if (req.query.page || req.query.limit || req.query.pageSize) {
    const { page, limit, skip } = parsePageQuery(req.query as Record<string, unknown>);
    const [total, items] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({ where, include, orderBy: { createdAt: "desc" }, skip, take: limit }),
    ]);
    return res.json(
      serializePaginatedBookings({
        items,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      })
    );
  }
  const bookings = await prisma.booking.findMany({ where, include, orderBy: { createdAt: "desc" }, take: 200 });
  res.json(serializeBookings(bookings));
});

adminRouter.get("/bookings/:id", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      route: true,
      tripBookings: {
        include: { trip: { include: { route: true, driver: true, vehicle: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn" });
  res.json(serializeBooking(booking));
});

adminRouter.post("/bookings/:id/confirm", async (req, res) => {
  try {
    const booking = await confirmBookingAdmin(Number(req.params.id), req.body);
    res.json(serializeBooking(booking));
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message || "Không xác nhận được đơn" });
  }
});

adminRouter.post("/bookings/:id/cancel", async (req, res) => {
  try {
    const booking = await cancelBookingAdmin(Number(req.params.id), req.body);
    res.json(serializeBooking(booking));
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message || "Không hủy được đơn" });
  }
});

adminRouter.post("/bookings/:id/move-trip", async (req, res) => {
  try {
    const result = await moveBookingBetweenTrips(Number(req.params.id), req.body);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("POST /admin/bookings/:id/move-trip error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không chuyển được chuyến" });
  }
});

adminRouter.post("/bookings", async (req, res) => {
  try {
    const booking = await adminCreateBooking(req.body);
    res.status(201).json(serializeBooking(booking));
  } catch (error: any) {
    console.error("POST /admin/bookings error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không tạo được đơn" });
  }
});

adminRouter.patch("/bookings/:id", async (req, res) => {
  try {
    const booking = await patchBookingAdmin(Number(req.params.id), req.body);
    res.json(serializeBooking(booking));
  } catch (error: any) {
    console.error("PATCH /admin/bookings/:id error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không cập nhật đơn" });
  }
});

const adminOnly = requireRoles(["ADMIN"]);

adminRouter.get("/users", async (req, res) => {
  const where: any = {};
  if (req.query.role) where.role = req.query.role;
  if (req.query.status) where.status = req.query.status;
  const q = String(req.query.q || "").trim();
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ];
  }
  const { page, limit, skip } = parsePageQuery(req.query as Record<string, unknown>, { limit: 15 });
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: userInclude,
      skip,
      take: limit,
    }),
  ]);
  res.json({
    items: users.map(({ passwordHash, ...u }) => u),
    page,
    pageSize: limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

adminRouter.get("/users/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) return res.status(400).json({ message: "ID không hợp lệ" });
  const user = await prisma.user.findUnique({ where: { id }, include: userInclude });
  if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

adminRouter.post("/users", adminOnly, async (req, res) => {
  try {
    const user = await createAdminUser(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    console.error("POST /admin/users error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không tạo được người dùng" });
  }
});

adminRouter.patch("/users/:id", adminOnly, async (req, res) => {
  try {
    const user = await updateAdminUser(Number(req.params.id), req.body);
    res.json(user);
  } catch (error: any) {
    console.error("PATCH /admin/users/:id error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không cập nhật người dùng" });
  }
});

adminRouter.post("/users/:id/reset-password", adminOnly, async (req, res) => {
  const password = String(req.body.password || "").trim();
  if (password.length < 6) {
    return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự" });
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    return res.status(400).json({ message: "ID người dùng không hợp lệ" });
  }
  try {
    await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });
    res.json({ message: "Đã đặt lại mật khẩu" });
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ message: "Không tìm thấy người dùng" });
    console.error("POST /admin/users/:id/reset-password error:", error);
    res.status(500).json({ message: "Không đặt lại được mật khẩu" });
  }
});

adminRouter.patch("/users/:id/status", adminOnly, async (req, res) => {
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status } });
  res.json(user);
});

const driverListInclude = {
  vehicles: true,
  route: { select: { id: true, name: true, direction: true } },
  user: { select: { id: true, phone: true, status: true, role: true, name: true } },
};

function buildDriverListWhere(query: Record<string, unknown>) {
  const where: any = {};
  const q = String(query.q || "").trim();
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { zaloPhone: { contains: q } },
      { location: { contains: q } },
      { direction: { contains: q } },
    ];
  }
  if (query.status) where.status = String(query.status);
  const accountStatus = String(query.accountStatus || "").trim();
  if (accountStatus === "LOCKED") {
    where.user = { status: UserStatus.LOCKED };
  } else if (accountStatus === "ACTIVE") {
    where.user = { status: UserStatus.ACTIVE };
  } else if (accountStatus === "NO_ACCOUNT") {
    where.userId = null;
  }
  return where;
}

adminRouter.get("/drivers", async (req, res) => {
  const where = buildDriverListWhere(req.query as Record<string, unknown>);
  const usePagination = req.query.page != null || req.query.limit != null || req.query.pageSize != null;

  if (!usePagination) {
    const drivers = await prisma.driver.findMany({ where, include: driverListInclude, orderBy: { id: "asc" } });
    return res.json(drivers);
  }

  const { page, limit, skip } = parsePageQuery(req.query as Record<string, unknown>, { limit: 15 });
  const [total, items] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.findMany({
      where,
      include: driverListInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
    }),
  ]);
  res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

adminRouter.patch("/drivers/:id/account-status", adminOnly, async (req, res) => {
  const driverId = Number(req.params.id);
  const status = String(req.body?.status || "").trim();
  if (status !== UserStatus.ACTIVE && status !== UserStatus.LOCKED) {
    return res.status(400).json({ message: "Trạng thái phải là ACTIVE hoặc LOCKED" });
  }
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: { user: true } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  if (!driver.userId || !driver.user) {
    return res.status(400).json({ message: "Tài xế chưa có tài khoản đăng nhập — tạo tại menu Người dùng" });
  }
  const user = await prisma.user.update({
    where: { id: driver.userId },
    data: { status: status as UserStatus },
    select: { id: true, phone: true, status: true },
  });
  res.json({
    message: status === UserStatus.LOCKED ? "Đã khóa tài khoản tài xế" : "Đã mở khóa tài khoản tài xế",
    driverId,
    user,
  });
});

adminRouter.patch("/drivers/:id", async (req, res) => {
  try {
    const body: Record<string, unknown> = { ...req.body };
    if (body.phone !== undefined) {
      const phone = normalizeVnPhone(String(body.phone));
      if (!phone) return res.status(400).json({ message: PHONE_INVALID_MESSAGE });
      body.phone = phone;
    }
    if (body.zaloPhone !== undefined && body.zaloPhone) {
      const zalo = normalizeVnPhone(String(body.zaloPhone));
      if (!zalo) return res.status(400).json({ message: "Số Zalo phải đủ 10 chữ số, bắt đầu bằng 0" });
      body.zaloPhone = zalo;
    }
    const driver = await patchAdminDriver(Number(req.params.id), body);
    res.json(driver);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message || "Không cập nhật tài xế" });
  }
});

function normalizeRoutePayload(body: Record<string, unknown>) {
  const fromName = String(body.fromName || "").trim();
  const toName = String(body.toName || "").trim();
  const direction = String(body.direction || "").trim() || (fromName && toName ? `${fromName} → ${toName}` : "");
  return { ...body, fromName, toName, direction };
}

adminRouter.get("/routes", async (req, res) => {
  const query = req.query as Record<string, unknown>;
  const paginate = query.page != null || query.pageSize != null || query.limit != null;
  if (!paginate) {
    return res.json(await prisma.route.findMany({ orderBy: { id: "asc" } }));
  }
  const { page, limit, skip } = parsePageQuery(query, { limit: 15 });
  const where = buildAdminRouteListWhere(query);
  const [total, items] = await Promise.all([
    prisma.route.count({ where }),
    prisma.route.findMany({ where, orderBy: { id: "asc" }, skip, take: limit }),
  ]);
  res.json({
    items,
    page,
    pageSize: limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});
adminRouter.post("/routes", async (req, res) => {
  const data = normalizeRoutePayload(req.body || {});
  if (!data.fromName || !data.toName) {
    return res.status(400).json({ message: "Tuyến phải có điểm đi và điểm đến" });
  }
  const locked = normalizeRouteLocked(req.body || {});
  res.json(await prisma.route.create({ data: { ...data, ...(locked !== undefined ? { locked } : {}) } as any }));
});
adminRouter.patch("/routes/:id", async (req, res) => {
  const data = normalizeRoutePayload(req.body || {});
  const locked = normalizeRouteLocked(req.body || {});
  const patch: Record<string, unknown> = { ...data };
  if (locked !== undefined) patch.locked = locked;
  res.json(await prisma.route.update({ where: { id: Number(req.params.id) }, data: patch as any }));
});
adminRouter.patch("/routes/:id/lock", async (req, res) => {
  const locked = normalizeRouteLocked(req.body || {});
  if (locked === undefined) {
    return res.status(400).json({ message: "Thiếu trường locked (true/false)" });
  }
  const route = await prisma.route.update({
    where: { id: Number(req.params.id) },
    data: { locked },
  });
  res.json({ ok: true, route, message: locked ? "Đã khóa tuyến — khách không thấy trên web." : "Đã mở khóa tuyến." });
});

adminRouter.get("/pricing", async (_req, res) => res.json(await prisma.priceRule.findMany({ include: { route: true }, orderBy: { id: "asc" } })));
adminRouter.post("/pricing", async (req, res) => res.json(await prisma.priceRule.create({ data: req.body })));
adminRouter.patch("/pricing/:id", async (req, res) => res.json(await prisma.priceRule.update({ where: { id: Number(req.params.id) }, data: req.body })));

const UNASSIGNED_STATUSES: BookingStatus[] = [
  BookingStatus.NEW,
  BookingStatus.CONTACTED,
  BookingStatus.QUOTED,
  BookingStatus.WAITING_DEPOSIT,
  BookingStatus.DEPOSITED,
  BookingStatus.WAITING_DISPATCH,
];

adminRouter.get("/dispatch", async (req, res) => {
  try {
    const payload = await loadDispatchBoard(req.query as Record<string, unknown>);
    res.json(payload);
  } catch (error) {
    console.error("GET /admin/dispatch error:", error);
    res.status(500).json({ message: "Không tải được dữ liệu điều phối" });
  }
});

adminRouter.post("/dispatch/apply", async (req, res) => {
  try {
    const result = await applyDispatchSuggestion(req.body);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("POST /admin/dispatch/apply error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không áp dụng được gợi ý" });
  }
});

async function loadDispatchContext(query: Record<string, unknown>) {
  const whereBooking: any = {
    status: { in: UNASSIGNED_STATUSES },
  };
  const whereTrip: any = { status: { in: [TripStatus.COLLECTING, TripStatus.READY] } };
  const busyDriverIds = await getBusyDriverIds();
  const whereDriver: any = buildAvailableDriverWhere(busyDriverIds);

  if (query.routeId) {
    const routeId = Number(query.routeId);
    whereBooking.routeId = routeId;
    whereTrip.routeId = routeId;
  }
  if (query.type) whereBooking.type = query.type;
  const keyword = String(query.keyword || query.q || "").trim();
  if (keyword) {
    whereBooking.OR = [
      { customerName: { contains: keyword } },
      { customerPhone: { contains: keyword } },
      { code: { contains: keyword } },
    ];
  }
  const dispatchDateRange = parseScheduledAtDateRange(query.dateFrom || query.from, query.dateTo || query.to);
  if (dispatchDateRange) {
    whereBooking.scheduledAt = dispatchDateRange;
    whereTrip.departureAt = dispatchDateRange;
  }
  if (query.direction) {
    whereBooking.direction = { contains: String(query.direction) };
    whereDriver.direction = { contains: String(query.direction) };
  }
  if (query.seatsNeeded || query.seats) {
    const seats = Number(query.seatsNeeded || query.seats);
    if (Number.isFinite(seats)) {
      whereDriver.vehicles = { some: { seats: { gte: seats } } };
    }
  }

  const [bookingCandidates, collectingTrips, availableDrivers, routes] = await Promise.all([
    prisma.booking.findMany({
      where: whereBooking,
      include: { route: true, tripBookings: true },
      orderBy: [{ createdAt: "desc" }, { scheduledAt: "desc" }],
    }),
    prisma.trip.findMany({
      where: whereTrip,
      include: { route: true, driver: true, vehicle: true, tripBookings: { include: { booking: true } } },
      orderBy: [{ departureAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.driver.findMany({ where: whereDriver, include: { vehicles: true }, orderBy: { id: "asc" } }),
    prisma.route.findMany({ where: publicRouteWhere(), orderBy: { id: "asc" } }),
  ]);

  const unassignedBookings = bookingCandidates.filter((b) =>
    bookingNeedsDispatch(b, UNASSIGNED_STATUSES as string[])
  );
  return { unassignedBookings, collectingTrips, availableDrivers, routes };
}

adminRouter.get("/dispatch/bookings", async (req, res) => {
  try {
    const where = buildBookingListWhere(req.query as Record<string, unknown>);
    where.tripBookings = { none: {} };
    where.status = { in: UNASSIGNED_STATUSES };
    const { page, limit, skip } = parsePageQuery(req.query as Record<string, unknown>);
    const [total, items] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        include: { route: true },
        orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);
    res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    console.error("GET /admin/dispatch/bookings error:", error);
    res.status(500).json({ message: "Không tải được danh sách điều phối" });
  }
});

adminRouter.get("/dispatch/bookings/:bookingId/options", async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { route: true } });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn" });
    if (!booking.routeId) return res.status(400).json({ message: "Đơn chưa có tuyến" });

    const ctx = await loadDispatchContext({ routeId: booking.routeId });
    const suggestion = {
      id: String(bookingId),
      routeId: booking.routeId,
      bookingIds: [bookingId],
      seatsNeeded: undefined as number | undefined,
    };
    const options = buildDispatchOptionsForSuggestion({
      suggestion,
      unassignedBookings: [booking, ...ctx.unassignedBookings.filter((b) => b.id !== bookingId)],
      collectingTrips: ctx.collectingTrips,
      availableDrivers: ctx.availableDrivers,
    });
    res.json({ booking, eligible: options.filter((o) => o.eligible), disabled: options.filter((o) => !o.eligible), options });
  } catch (error) {
    console.error("GET /admin/dispatch/bookings/:id/options error:", error);
    res.status(500).json({ message: "Không tải được phương án điều phối" });
  }
});

adminRouter.post("/dispatch/bookings/:bookingId/confirm", async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const { optionId, optionType } = req.body || {};
    if (!optionId || !optionType) {
      return res.status(400).json({ message: "Thiếu optionId hoặc optionType" });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { route: true } });
    if (!booking) return res.status(404).json({ message: "Không tìm thấy đơn" });
    if (!booking.routeId) return res.status(400).json({ message: "Đơn chưa có tuyến" });

    const ctx = await loadDispatchContext({ routeId: booking.routeId });
    const options = buildDispatchOptionsForSuggestion({
      suggestion: { id: String(bookingId), routeId: booking.routeId, bookingIds: [bookingId] },
      unassignedBookings: [booking, ...ctx.unassignedBookings.filter((b) => b.id !== bookingId)],
      collectingTrips: ctx.collectingTrips,
      availableDrivers: ctx.availableDrivers,
    });
    const key = String(optionId);
    const picked = options.find((o) => o.key === key);
    if (!picked?.eligible) {
      return res.status(400).json({ message: picked?.disabledReason || "Phương án không đủ điều kiện" });
    }

    const seatCounts: Record<number, number> = {};
    if (picked.seatsAssignable > 0) seatCounts[bookingId] = picked.seatsAssignable;

    let body: any;
    if (optionType === "EXISTING_TRIP") {
      const tripId = Number(String(key).replace(/^trip:/, ""));
      body = { kind: "assign_trip", bookingIds: [bookingId], tripId, seatCounts };
    } else if (optionType === "AVAILABLE_DRIVER") {
      const driverId = Number(String(key).replace(/^driver:/, "").replace(/:busy$/, ""));
      if (!booking.scheduledAt) {
        return res.status(400).json({ message: "Đơn thiếu giờ đi" });
      }
      const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: { vehicles: true } });
      const vehicle = driver?.vehicles?.[0];
      body = {
        kind: "new_trip",
        bookingIds: [bookingId],
        routeId: booking.routeId,
        departureAt: booking.scheduledAt.toISOString(),
        totalSeats: Number(vehicle?.seats || 7),
        driverId,
        vehicleId: vehicle?.id ?? null,
        seatCounts,
      };
    } else {
      return res.status(400).json({ message: "optionType không hợp lệ" });
    }

    const result = await applyDispatchSuggestion(body);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("POST /admin/dispatch/bookings/:id/confirm error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không điều phối được" });
  }
});

adminRouter.get("/driver-seat-logs", async (req, res) => {
  const { page, limit, skip } = parsePageQuery(req.query as Record<string, unknown>);
  const where: any = {};
  if (req.query.driverId) where.driverId = Number(req.query.driverId);
  if (req.query.tripId) where.tripId = Number(req.query.tripId);
  const dateFrom = req.query.dateFrom || req.query.from;
  const dateTo = req.query.dateTo || req.query.to;
  if (dateFrom || dateTo) {
    where.createdAt = {
      gte: dateFrom ? new Date(String(dateFrom)) : undefined,
      lte: dateTo ? new Date(String(dateTo)) : undefined,
    };
  }
  const [total, items] = await Promise.all([
    prisma.driverSeatLog.count({ where }),
    prisma.driverSeatLog.findMany({
      where,
      include: { driver: true, trip: { include: { route: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

adminRouter.get("/trips", async (req, res) => {
  const page = Math.max(1, toNumberOrUndefined(req.query.page) ?? 1);
  const pageSizeRaw = toNumberOrUndefined(req.query.pageSize) ?? 20;
  const pageSize = Math.min(100, Math.max(5, pageSizeRaw));
  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (req.query.status) where.status = req.query.status;
  if (req.query.settlementStatus) where.settlementStatus = req.query.settlementStatus;
  if (req.query.routeId) where.routeId = Number(req.query.routeId);
  if (req.query.driverId) where.driverId = Number(req.query.driverId);
  if (req.query.vehicleId) where.vehicleId = Number(req.query.vehicleId);

  const minAvailableSeats = toNumberOrUndefined(req.query.minAvailableSeats);
  if (minAvailableSeats !== undefined) where.availableSeats = { gte: minAvailableSeats };

  const debtMin = toNumberOrUndefined(req.query.debtMin);
  if (debtMin !== undefined) where.driverDebtAmount = { gte: debtMin };

  const departureRange = parseScheduledAtDateRange(req.query.from, req.query.to);
  if (departureRange) where.departureAt = departureRange;

  const keyword = String(req.query.keyword || "").trim();
  if (keyword) {
    where.OR = [
      { code: { contains: keyword, mode: "insensitive" } },
      { route: { name: { contains: keyword, mode: "insensitive" } } },
      { route: { fromName: { contains: keyword, mode: "insensitive" } } },
      { route: { toName: { contains: keyword, mode: "insensitive" } } },
      { driver: { name: { contains: keyword, mode: "insensitive" } } },
      { driver: { phone: { contains: keyword } } },
      { vehicle: { licensePlate: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const sortBy = String(req.query.sortBy || "departureAt");
  const sortDir = String(req.query.sortDir || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const orderBy: any[] = [];
  switch (sortBy) {
    case "code":
      orderBy.push({ code: sortDir });
      break;
    case "status":
      orderBy.push({ status: sortDir });
      break;
    case "availableSeats":
      orderBy.push({ availableSeats: sortDir });
      break;
    case "bookedSeats":
      orderBy.push({ bookedSeats: sortDir });
      break;
    case "driverDebtAmount":
      orderBy.push({ driverDebtAmount: sortDir });
      break;
    case "settlementStatus":
      orderBy.push({ settlementStatus: sortDir });
      break;
    case "routeName":
      orderBy.push({ route: { name: sortDir } });
      break;
    case "driverName":
      orderBy.push({ driver: { name: sortDir } });
      break;
    case "departureAt":
    default:
      orderBy.push({ departureAt: sortDir });
      break;
  }
  orderBy.push({ id: "desc" });

  const [total, items] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      include: {
        route: true,
        driver: true,
        vehicle: true,
        _count: { select: { tripBookings: true } },
        tripBookings: {
          select: {
            id: true,
            seatCount: true,
            booking: {
              select: {
                id: true,
                code: true,
                customerName: true,
                type: true,
                driverRideStatus: true,
                driverCargoStatus: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
  ]);

  res.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

adminRouter.get("/trips/:id", async (req, res) => {
  const tripId = Number(req.params.id);
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      route: true,
      driver: { include: { vehicles: true } },
      vehicle: true,
      tripBookings: { include: { booking: { include: { route: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });
  res.json(trip);
});

adminRouter.post("/trips/:tripId/bookings/:bookingId/driver-status", async (req, res) => {
  try {
    const result = await patchBookingDriverStatus(
      Number(req.params.tripId),
      Number(req.params.bookingId),
      req.body
    );
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message || "Không cập nhật trạng thái" });
  }
});

adminRouter.post("/trips", async (req, res) => {
  try {
    if (req.body.driverId) await assertDriverAvailableForNewTrip(Number(req.body.driverId));

    let trip: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        trip = await prisma.trip.create({
          data: {
            code: generateCode("CX"),
            routeId: Number(req.body.routeId),
            driverId: req.body.driverId ? Number(req.body.driverId) : null,
            vehicleId: req.body.vehicleId ? Number(req.body.vehicleId) : null,
            departureAt: new Date(req.body.departureAt),
            totalSeats: Number(req.body.totalSeats || 0),
            availableSeats: Number(req.body.totalSeats || 0),
            status: TripStatus.COLLECTING,
          },
        });
        break;
      } catch (err: any) {
        if (String(err?.code) !== "P2002" || attempt === 4) throw err;
      }
    }
    res.json(trip);
  } catch (error) {
    console.error("POST /admin/trips error:", error);
    res.status(500).json({ message: "Không tạo được chuyến" });
  }
});

adminRouter.patch("/trips/:id", async (req, res) => {
  try {
    const tripId = Number(req.params.id);
    if (req.body.status === TripStatus.COMPLETED) {
      const result = await completeTrip(tripId, { completedBy: "ADMIN", userId: req.user?.id });
      return res.json(result);
    }

    if (req.body.driverId !== undefined && req.body.driverId && !req.body.status) {
      const existing = await prisma.trip.findUnique({ where: { id: tripId }, select: { driverId: true } });
      if (!existing?.driverId) {
        const result = await assignDriverToTrip(tripId, Number(req.body.driverId), req.body.vehicleId);
        return res.json(result.trip);
      }
    }

    if (req.body.driverId) await assertDriverAvailableForNewTrip(Number(req.body.driverId));

    const data: any = {};
    if (req.body.status) data.status = req.body.status;
    if (req.body.driverId !== undefined) data.driverId = req.body.driverId ? Number(req.body.driverId) : null;
    if (req.body.vehicleId !== undefined) data.vehicleId = req.body.vehicleId ? Number(req.body.vehicleId) : null;
    if (req.body.departureAt) data.departureAt = new Date(req.body.departureAt);
    if (req.body.note !== undefined) data.note = req.body.note;
    const trip = await prisma.trip.update({ where: { id: tripId }, data, include: { route: true, driver: true, vehicle: true } });
    res.json(trip);
  } catch (error: any) {
    console.error("PATCH /admin/trips/:id error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không cập nhật được chuyến" });
  }
});

adminRouter.post("/trips/:id/complete", async (req, res) => {
  try {
    const result = await completeTrip(Number(req.params.id), { completedBy: "ADMIN", userId: req.user?.id });
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("POST /admin/trips/:id/complete error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không hoàn thành chuyến" });
  }
});

adminRouter.get("/trips/:id/financial-snapshots", async (req, res) => {
  const items = await prisma.tripFinancialSnapshot.findMany({
    where: { tripId: Number(req.params.id) },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    items.map((row) => ({
      ...row,
      snapshot: (() => {
        try {
          return JSON.parse(row.snapshotJson);
        } catch {
          return null;
        }
      })(),
    }))
  );
});

adminRouter.post("/trips/:id/add-bookings", async (req, res) => {
  try {
    const tripId = Number(req.params.id);
    const rawBookingIds = Array.isArray(req.body.bookingIds) ? req.body.bookingIds : [];
    const bookingIds = Array.from(new Set(rawBookingIds.map(Number).filter(Boolean))) as number[];
    if (!bookingIds.length) return res.status(400).json({ message: "Chưa chọn đơn để gán" });

    const seatCounts: Record<number, number> = {};
    const raw = req.body.seatCounts;
    if (raw && typeof raw === "object") {
      for (const [k, v] of Object.entries(raw)) {
        const id = Number(k);
        const n = Number(v);
        if (id && Number.isFinite(n) && n > 0) seatCounts[id] = Math.floor(n);
      }
    }
    const result = await assignBookingsToTrip(tripId, bookingIds, {
      seatCounts: Object.keys(seatCounts).length ? seatCounts : undefined,
    });
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("POST /admin/trips/:id/add-bookings error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không gán được đơn vào chuyến" });
  }
});

adminRouter.get("/reports/overview", async (req, res) => {
  const where: any = {};
  const driverId = toNumberOrUndefined(req.query.driverId);
  if (driverId != null && driverId > 0) where.driverId = driverId;
  const routeId = toNumberOrUndefined(req.query.routeId);
  if (routeId != null && routeId > 0) where.routeId = routeId;
  if (req.query.serviceType) {
    where.tripBookings = { some: { booking: { type: String(req.query.serviceType) } } };
  }
  const departureRange = parseScheduledAtDateRange(req.query.from, req.query.to);
  if (departureRange) where.departureAt = departureRange;
  const trips = await prisma.trip.findMany({
    where,
    include: { route: true, driver: true, tripBookings: { include: { booking: true } } },
    orderBy: { departureAt: "desc" },
  });
  const sum = (field: string) => trips.reduce((s, t: any) => s + Number(t[field] || 0), 0);
  res.json({
    totalTrips: trips.length,
    totalRevenue: sum("totalCustomerAmount"),
    totalCommission: sum("adminCommission"),
    totalDriverNet: sum("driverNetAmount"),
    totalDriverDebt: sum("driverDebtAmount"),
    totalAdminOwesDriver: sum("adminOwesDriverAmount"),
    trips,
  });
});

adminRouter.get("/reports/debts", async (req, res) => {
  const where: any = {};
  if (req.query.driverId) where.driverId = Number(req.query.driverId);
  if (req.query.settlementStatus) where.settlementStatus = req.query.settlementStatus;
  if (req.query.tripStatus) {
    where.status = String(req.query.tripStatus);
  } else if (req.query.includeOpen !== "1") {
    where.status = TripStatus.COMPLETED;
  }
  const { page, limit, skip } = parsePageQuery(req.query, { page: 1, limit: 20 });

  const summaryTrips = await prisma.trip.findMany({
    where,
    select: { id: true, driverId: true, driverDebtAmount: true, adminOwesDriverAmount: true },
  });
  const summaryTripIds = summaryTrips.map((t) => t.id);
  const summaryPayments = await loadPaymentsForTrips(summaryTripIds);
  const summaryPaidByTrip = buildPaidByTrip(summaryPayments);
  let totalDriverDebt = 0;
  let totalAdminOwesDriver = 0;
  for (const t of summaryTrips) {
    const debt = enrichTripDebtRow(t, summaryPaidByTrip);
    totalDriverDebt += debt.driverDebtRemaining;
    totalAdminOwesDriver += debt.adminOwesRemaining;
  }

  const [total, trips] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.trip.findMany({
      where,
      include: { route: true, driver: true },
      orderBy: { departureAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const recentPaymentsRaw =
    summaryTripIds.length > 0
      ? (
          await loadPaymentsForTrips(summaryTripIds)
        ).slice(0, 10)
      : [];
  const recentDriverIds = [...new Set(recentPaymentsRaw.map((p) => p.driverId))];
  const recentTripIds = [...new Set(recentPaymentsRaw.map((p) => p.tripId).filter(Boolean))] as number[];
  const [recentDrivers, recentTrips] = await Promise.all([
    recentDriverIds.length
      ? prisma.driver.findMany({ where: { id: { in: recentDriverIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    recentTripIds.length
      ? prisma.trip.findMany({ where: { id: { in: recentTripIds } }, select: { id: true, code: true } })
      : Promise.resolve([]),
  ]);
  const driverNameById = new Map(recentDrivers.map((d) => [d.id, d.name]));
  const tripCodeById = new Map(recentTrips.map((t) => [t.id, t.code]));
  const recentPayments = recentPaymentsRaw.map((p) => ({
    ...p,
    driver: { name: driverNameById.get(p.driverId) || null },
    trip: p.tripId ? { code: tripCodeById.get(p.tripId) || null } : null,
  }));

  const pageTripIds = trips.map((t) => t.id);
  const pagePayments = await loadPaymentsForTrips(pageTripIds);
  const paidByTrip = buildPaidByTrip(pagePayments);
  const rows = trips.map((t) => ({
    ...t,
    ...enrichTripDebtRow(t, paidByTrip),
  }));

  res.json({
    totalDriverDebt,
    totalAdminOwesDriver,
    trips: rows,
    payments: recentPayments,
    page,
    pageSize: limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

adminRouter.get("/settlements", async (req, res) => {
  const where: any = {};
  if (req.query.driverId) where.driverId = Number(req.query.driverId);
  if (req.query.tripId) where.tripId = Number(req.query.tripId);
  const items = await prisma.driverSettlementPayment.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  res.json(items);
});

adminRouter.post("/settlements", async (req, res) => {
  try {
    const { tripId, driverId, amount, direction, method, note } = req.body;
    if (!driverId || amount == null || !direction) {
      return res.status(400).json({ message: "Thiếu tài xế, số tiền hoặc chiều thanh toán" });
    }
    const tripIdNum = tripId ? Number(tripId) : null;
    const validated = await validateSettlementPayment({
      tripId: tripIdNum,
      driverId: Number(driverId),
      amount: Number(amount),
      direction: String(direction),
    });

    const payment = await prisma.driverSettlementPayment.create({
      data: {
        tripId: tripIdNum,
        driverId: Number(driverId),
        amount: validated.amount,
        direction: validated.direction,
        method: method || "Tiền mặt",
        note: note || null,
      },
    });

    if (tripIdNum && validated.trip) {
      const pays = await loadPaymentsForTrips([tripIdNum]);
      const paidByTrip = buildPaidByTrip(pays);
      const paid = paidByTrip.get(tripIdNum) || { driverPaid: 0, adminPaid: 0 };
      const settlementStatus = computeSettlementStatus(validated.trip, paid.driverPaid, paid.adminPaid);
      await prisma.trip.update({ where: { id: tripIdNum }, data: { settlementStatus } });
    }

    res.json({ message: "Đã ghi nhận thanh toán", payment });
  } catch (error: any) {
    console.error("POST /admin/settlements error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không ghi nhận được thanh toán" });
  }
});

adminRouter.patch("/trips/:id/settlement", async (req, res) => {
  const trip = await prisma.trip.update({
    where: { id: Number(req.params.id) },
    data: { settlementStatus: req.body.settlementStatus, note: req.body.note },
  });
  res.json(trip);
});

adminRouter.get("/posts", async (req, res) => {
  const where: any = {};
  if (req.query.status) where.status = String(req.query.status);
  const categoryId = toNumberOrUndefined(req.query.categoryId);
  if (categoryId) where.categoryId = categoryId;
  const q = String(req.query.q || "").trim();
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { slug: { contains: q } },
      { excerpt: { contains: q } },
    ];
  }
  const { page, limit, skip } = parsePageQuery(req.query as Record<string, unknown>, { limit: 15 });
  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      include: { category: true },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  res.json({
    items: posts,
    page,
    pageSize: limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

adminRouter.get("/posts/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) return res.status(400).json({ message: "ID bài viết không hợp lệ" });
  const post = await prisma.post.findUnique({ where: { id }, include: { category: true } });
  if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });
  res.json(post);
});

adminRouter.post("/posts", async (req, res) => {
  const data = req.body;
  const post = await prisma.post.create({
    data: {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: sanitizePostContent(data.content),
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      status: data.status || "DRAFT",
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    },
  });
  res.json(post);
});

adminRouter.patch("/posts/:id", async (req, res) => {
  const data: any = { ...req.body };
  if (data.content) data.content = sanitizePostContent(data.content);
  if (data.categoryId) data.categoryId = Number(data.categoryId);
  if (data.status === "PUBLISHED" && !data.publishedAt) data.publishedAt = new Date();
  const post = await prisma.post.update({ where: { id: Number(req.params.id) }, data });
  res.json(post);
});

adminRouter.get("/media", async (req, res) => {
  const where: any = {};
  if (req.query.usageType) where.usageType = String(req.query.usageType);
  const q = String(req.query.q || "").trim();
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { altText: { contains: q } },
      { fileName: { contains: q } },
    ];
  }
  const { page, limit, skip } = parsePageQuery(req.query as Record<string, unknown>, { limit: 18 });
  const [total, items] = await Promise.all([
    prisma.mediaFile.count({ where }),
    prisma.mediaFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  res.json({
    items,
    page,
    pageSize: limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

adminRouter.get("/post-categories", async (_req, res) => {
  res.json(await prisma.postCategory.findMany({ orderBy: { id: "asc" } }));
});

adminRouter.get("/settings", async (_req, res) => res.json(await prisma.siteSetting.findMany({ orderBy: { key: "asc" } })));
adminRouter.put("/settings", async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) await prisma.siteSetting.upsert({ where: { key }, update: { value: String(value ?? "") }, create: { key, value: String(value ?? "") } });
  res.json({ ok: true });
});

adminRouter.post("/telegram/test", async (_req, res) => {
  try {
    if (!telegramNotifyEnabled()) {
      return res.status(400).json({
        message: "Chưa cấu hình TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID trong backend/.env (xem TELEGRAM_SETUP.md).",
      });
    }
    await sendTelegramTest();
    res.json({ ok: true, message: "Đã gửi tin test vào nhóm Telegram." });
  } catch (e: any) {
    console.error("POST /admin/telegram/test error:", e);
    res.status(500).json({ message: e.message || "Không gửi được tin Telegram." });
  }
});

adminRouter.post("/media/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Chưa chọn file" });
  const title = req.body.title || req.file.originalname;
  const altText = (req.body.altText || "").trim();
  if (!altText) return res.status(400).json({ message: "Bắt buộc nhập alt text cho ảnh SEO" });
  const usageType = req.body.usageType || "general";
  const slug = slugify(req.body.keyword || title, { lower: true, strict: true, locale: "vi" });
  const dir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "../uploads", usageType);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `${slug}-${Date.now()}.webp`;
  const filePath = path.join(dir, fileName);
  await sharp(req.file.buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(filePath);
  const fileUrl = `/uploads/${usageType}/${fileName}`;
  const media = await prisma.mediaFile.create({ data: { originalName: req.file.originalname, fileName, fileUrl, mimeType: "image/webp", sizeBytes: req.file.size, altText, title, usageType } });
  res.json(media);
});

adminRouter.get("/feedbacks", async (req, res) => {
  try {
    const where: any = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.resolved !== undefined) where.resolved = req.query.resolved === "true";
    const keyword = String(req.query.q || req.query.keyword || "").trim();
    if (keyword) {
      where.OR = [{ name: { contains: keyword } }, { phone: { contains: keyword } }, { content: { contains: keyword } }, { email: { contains: keyword } }];
    }
    const { page, limit, skip } = parsePageQuery(req.query as Record<string, unknown>);
    const [total, items] = await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        include: { booking: { select: { id: true, code: true, customerName: true } }, route: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    res.json({
      items,
      page,
      pageSize: limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("GET /admin/feedbacks error:", error);
    res.status(500).json({ message: "Không tải được danh sách phản hồi" });
  }
});

adminRouter.get("/feedbacks/:id", async (req, res) => {
  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: Number(req.params.id) },
      include: { booking: true, route: true },
    });
    if (!feedback) return res.status(404).json({ message: "Không tìm thấy phản hồi" });
    res.json(feedback);
  } catch (error) {
    console.error("GET /admin/feedbacks/:id error:", error);
    res.status(500).json({ message: "Không tải được chi tiết phản hồi" });
  }
});

adminRouter.patch("/feedbacks/:id", async (req, res) => {
  try {
    const { resolved, adminNote } = req.body;
    const feedback = await prisma.feedback.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(resolved !== undefined && { resolved: Boolean(resolved) }),
        ...(adminNote !== undefined && { adminNote: String(adminNote).trim() || null }),
      },
      include: { booking: { select: { id: true, code: true } }, route: { select: { id: true, name: true } } },
    });
    res.json(feedback);
  } catch (error) {
    console.error("PATCH /admin/feedbacks/:id error:", error);
    res.status(500).json({ message: "Không cập nhật được phản hồi" });
  }
});
