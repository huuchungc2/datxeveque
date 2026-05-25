import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import slugify from "slugify";
import { BookingStatus, SettlementStatus, TripStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { hashPassword } from "../lib/auth.js";
import { generateCode } from "../lib/codes.js";
import { applyDispatchSuggestion, assignBookingsToTrip } from "../lib/dispatchApply.js";
import { buildDispatchSuggestions, computeDispatchSeatSummary } from "../lib/dispatchSuggestions.js";
import {
  assertDriverAvailableForNewTrip,
  buildAvailableDriverWhere,
  getBusyDriverIds,
  getDriversOnActiveTrips,
} from "../lib/dispatchDrivers.js";
import { completeTrip } from "../lib/tripComplete.js";
import { adminCreateBooking, patchBookingAdmin } from "../lib/adminBooking.js";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE } from "../lib/phone.js";
import { createAdminUser, updateAdminUser, userInclude } from "../lib/adminUser.js";

function sanitizePostContent(html: string) {
  return String(html || "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRoles(["ADMIN", "DISPATCHER", "ACCOUNTANT"]));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

adminRouter.get("/bookings", async (req, res) => {
  const where: any = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.status) where.status = req.query.status;
  if (req.query.routeId) where.routeId = Number(req.query.routeId);
  if (req.query.q) where.OR = [{ customerName: { contains: String(req.query.q) } }, { customerPhone: { contains: String(req.query.q) } }, { code: { contains: String(req.query.q) } }];
  if (req.query.from || req.query.to) where.scheduledAt = { gte: req.query.from ? new Date(String(req.query.from)) : undefined, lte: req.query.to ? new Date(String(req.query.to)) : undefined };
  const bookings = await prisma.booking.findMany({ where, include: { route: true }, orderBy: { createdAt: "desc" }, take: 200 });
  res.json(bookings);
});

adminRouter.post("/bookings", async (req, res) => {
  try {
    const booking = await adminCreateBooking(req.body);
    res.status(201).json(booking);
  } catch (error: any) {
    console.error("POST /admin/bookings error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không tạo được đơn" });
  }
});

adminRouter.patch("/bookings/:id", async (req, res) => {
  try {
    const booking = await patchBookingAdmin(Number(req.params.id), req.body);
    res.json(booking);
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
  if (req.query.q) where.OR = [{ name: { contains: String(req.query.q) } }, { phone: { contains: String(req.query.q) } }, { email: { contains: String(req.query.q) } }];
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, include: userInclude });
  res.json(users.map(({ passwordHash, ...u }) => u));
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
  const password = req.body.password || "123456";
  await prisma.user.update({ where: { id: Number(req.params.id) }, data: { passwordHash: await hashPassword(password) } });
  res.json({ message: "Đã reset mật khẩu", password });
});

adminRouter.patch("/users/:id/status", adminOnly, async (req, res) => {
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status } });
  res.json(user);
});

adminRouter.get("/drivers", async (_req, res) => {
  const drivers = await prisma.driver.findMany({ include: { vehicles: true, user: true }, orderBy: { id: "asc" } });
  res.json(drivers);
});

adminRouter.patch("/drivers/:id", async (req, res) => {
  try {
    const data: any = { ...req.body };
    if (data.phone !== undefined) {
      const phone = normalizeVnPhone(data.phone);
      if (!phone) return res.status(400).json({ message: PHONE_INVALID_MESSAGE });
      data.phone = phone;
    }
    if (data.zaloPhone !== undefined && data.zaloPhone) {
      const zalo = normalizeVnPhone(data.zaloPhone);
      if (!zalo) return res.status(400).json({ message: "Số Zalo phải đủ 10 chữ số, bắt đầu bằng 0" });
      data.zaloPhone = zalo;
    }
    const driver = await prisma.driver.update({ where: { id: Number(req.params.id) }, data });
    res.json(driver);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message || "Không cập nhật tài xế" });
  }
});

adminRouter.get("/routes", async (_req, res) => res.json(await prisma.route.findMany({ orderBy: { id: "asc" } })));
adminRouter.post("/routes", async (req, res) => res.json(await prisma.route.create({ data: req.body })));
adminRouter.patch("/routes/:id", async (req, res) => res.json(await prisma.route.update({ where: { id: Number(req.params.id) }, data: req.body })));

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
    const whereBooking: any = {
      tripBookings: { none: {} },
      status: { in: UNASSIGNED_STATUSES },
    };
    const whereTrip: any = { status: { in: [TripStatus.COLLECTING, TripStatus.READY] } };
    const busyDriverIds = await getBusyDriverIds();
    const whereDriver: any = buildAvailableDriverWhere(busyDriverIds);

    if (req.query.routeId) {
      const routeId = Number(req.query.routeId);
      whereBooking.routeId = routeId;
      whereTrip.routeId = routeId;
    }
    if (req.query.type) whereBooking.type = req.query.type;
    if (req.query.q) {
      const q = String(req.query.q);
      whereBooking.OR = [{ customerName: { contains: q } }, { customerPhone: { contains: q } }, { code: { contains: q } }];
    }
    if (req.query.from || req.query.to) {
      whereBooking.scheduledAt = {
        gte: req.query.from ? new Date(String(req.query.from)) : undefined,
        lte: req.query.to ? new Date(String(req.query.to)) : undefined,
      };
      whereTrip.departureAt = {
        gte: req.query.from ? new Date(String(req.query.from)) : undefined,
        lte: req.query.to ? new Date(String(req.query.to)) : undefined,
      };
    }
    if (req.query.direction) {
      whereBooking.direction = { contains: String(req.query.direction) };
      whereDriver.direction = { contains: String(req.query.direction) };
    }
    if (req.query.seatsNeeded) {
      const seats = Number(req.query.seatsNeeded);
      if (Number.isFinite(seats)) whereDriver.seatsFree = { gte: seats };
    }

    const [unassignedBookings, collectingTrips, availableDrivers, routes] = await Promise.all([
      prisma.booking.findMany({ where: whereBooking, include: { route: true }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }], take: 100 }),
      prisma.trip.findMany({
        where: whereTrip,
        include: { route: true, driver: true, vehicle: true, tripBookings: { include: { booking: true } } },
        orderBy: { departureAt: "asc" },
        take: 50,
      }),
      prisma.driver.findMany({ where: whereDriver, include: { vehicles: true }, orderBy: { id: "asc" } }),
      prisma.route.findMany({ orderBy: { id: "asc" } }),
    ]);

    const suggestions = buildDispatchSuggestions(unassignedBookings, collectingTrips, availableDrivers);
    const seatSummary = computeDispatchSeatSummary(unassignedBookings);

    const driversOnTrip = await getDriversOnActiveTrips();

    res.json({
      unassignedBookings,
      collectingTrips,
      availableDrivers,
      driversOnTrip,
      routes,
      suggestions,
      seatSummary,
    });
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

adminRouter.get("/trips", async (_req, res) => {
  const trips = await prisma.trip.findMany({ include: { route: true, driver: true, vehicle: true, tripBookings: { include: { booking: true } } }, orderBy: { departureAt: "desc" } });
  res.json(trips);
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

    const result = await assignBookingsToTrip(tripId, bookingIds);
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("POST /admin/trips/:id/add-bookings error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không gán được đơn vào chuyến" });
  }
});

adminRouter.get("/reports/overview", async (req, res) => {
  const where: any = {};
  if (req.query.driverId) where.driverId = Number(req.query.driverId);
  if (req.query.routeId) where.routeId = Number(req.query.routeId);
  if (req.query.serviceType) {
    where.tripBookings = { some: { booking: { type: String(req.query.serviceType) } } };
  }
  if (req.query.from || req.query.to) {
    where.departureAt = {
      gte: req.query.from ? new Date(String(req.query.from)) : undefined,
      lte: req.query.to ? new Date(String(req.query.to)) : undefined,
    };
  }
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
  const trips = await prisma.trip.findMany({
    where,
    include: { route: true, driver: true },
    orderBy: { departureAt: "desc" },
    take: 200,
  });
  const tripIds = trips.map((t) => t.id);
  const driverIds = [...new Set(trips.map((t) => t.driverId).filter(Boolean))] as number[];
  const payments = await prisma.driverSettlementPayment.findMany({
    where: { OR: [{ tripId: { in: tripIds } }, { driverId: { in: driverIds } }] },
    orderBy: { createdAt: "desc" },
  });
  const paidByTrip = new Map<number, { driverPaid: number; adminPaid: number }>();
  for (const p of payments) {
    if (!p.tripId) continue;
    const cur = paidByTrip.get(p.tripId) || { driverPaid: 0, adminPaid: 0 };
    const amt = Number(p.amount);
    if (p.direction === "DRIVER_OWES_ADMIN") cur.driverPaid += amt;
    if (p.direction === "ADMIN_OWES_DRIVER") cur.adminPaid += amt;
    paidByTrip.set(p.tripId, cur);
  }
  const rows = trips.map((t) => {
    const paid = paidByTrip.get(t.id) || { driverPaid: 0, adminPaid: 0 };
    const driverDebt = Number(t.driverDebtAmount);
    const adminOwes = Number((t as any).adminOwesDriverAmount || 0);
    return {
      ...t,
      driverPaidAdmin: paid.driverPaid,
      adminPaidDriver: paid.adminPaid,
      driverDebtRemaining: Math.max(0, driverDebt - paid.driverPaid),
      adminOwesRemaining: Math.max(0, adminOwes - paid.adminPaid),
    };
  });
  res.json({
    totalDriverDebt: rows.reduce((s, r) => s + r.driverDebtRemaining, 0),
    totalAdminOwesDriver: rows.reduce((s, r) => s + r.adminOwesRemaining, 0),
    trips: rows,
    payments,
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
    if (!driverId || !amount || !direction) return res.status(400).json({ message: "Thiếu tài xế, số tiền hoặc chiều thanh toán" });
    const payment = await prisma.driverSettlementPayment.create({
      data: {
        tripId: tripId ? Number(tripId) : null,
        driverId: Number(driverId),
        amount: Number(amount),
        direction: String(direction),
        method: method || "Tiền mặt",
        note: note || null,
      },
    });
    if (tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: Number(tripId) } });
      if (trip) {
        const pays = await prisma.driverSettlementPayment.findMany({ where: { tripId: Number(tripId) } });
        let driverPaid = 0;
        let adminPaid = 0;
        for (const p of pays) {
          const a = Number(p.amount);
          if (p.direction === "DRIVER_OWES_ADMIN") driverPaid += a;
          if (p.direction === "ADMIN_OWES_DRIVER") adminPaid += a;
        }
        const driverRem = Math.max(0, Number(trip.driverDebtAmount) - driverPaid);
        const adminRem = Math.max(0, Number((trip as any).adminOwesDriverAmount || 0) - adminPaid);
        let settlementStatus: SettlementStatus = SettlementStatus.PARTIAL;
        if (driverRem <= 0 && adminRem <= 0) settlementStatus = SettlementStatus.PAID;
        await prisma.trip.update({ where: { id: trip.id }, data: { settlementStatus } });
      }
    }
    res.json({ message: "Đã ghi nhận thanh toán", payment });
  } catch (error) {
    console.error("POST /admin/settlements error:", error);
    res.status(500).json({ message: "Không ghi nhận được thanh toán" });
  }
});

adminRouter.patch("/trips/:id/settlement", async (req, res) => {
  const trip = await prisma.trip.update({
    where: { id: Number(req.params.id) },
    data: { settlementStatus: req.body.settlementStatus, note: req.body.note },
  });
  res.json(trip);
});

adminRouter.get("/posts", async (_req, res) => {
  const posts = await prisma.post.findMany({ include: { category: true }, orderBy: { updatedAt: "desc" } });
  res.json(posts);
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

adminRouter.get("/media", async (_req, res) => {
  res.json(await prisma.mediaFile.findMany({ orderBy: { createdAt: "desc" }, take: 200 }));
});

adminRouter.get("/post-categories", async (_req, res) => {
  res.json(await prisma.postCategory.findMany({ orderBy: { id: "asc" } }));
});

adminRouter.get("/settings", async (_req, res) => res.json(await prisma.siteSetting.findMany({ orderBy: { key: "asc" } })));
adminRouter.put("/settings", async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) await prisma.siteSetting.upsert({ where: { key }, update: { value: String(value ?? "") }, create: { key, value: String(value ?? "") } });
  res.json({ ok: true });
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
