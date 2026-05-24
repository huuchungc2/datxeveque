import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import slugify from "slugify";
import { BookingStatus, TripStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { hashPassword } from "../lib/auth.js";
import { generateCode } from "../lib/codes.js";

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

adminRouter.patch("/bookings/:id", async (req, res) => {
  const data: any = { ...req.body };
  if (data.routeId) data.routeId = Number(data.routeId);
  if (data.passengerCount) data.passengerCount = Number(data.passengerCount);
  if (data.scheduledAt) data.scheduledAt = new Date(data.scheduledAt);
  const booking = await prisma.booking.update({ where: { id: Number(req.params.id) }, data });
  res.json(booking);
});

adminRouter.get("/users", async (req, res) => {
  const where: any = {};
  if (req.query.role) where.role = req.query.role;
  if (req.query.status) where.status = req.query.status;
  if (req.query.q) where.OR = [{ name: { contains: String(req.query.q) } }, { phone: { contains: String(req.query.q) } }, { email: { contains: String(req.query.q) } }];
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(users.map(({ passwordHash, ...u }) => u));
});

adminRouter.post("/users/:id/reset-password", async (req, res) => {
  const password = req.body.password || "123456";
  await prisma.user.update({ where: { id: Number(req.params.id) }, data: { passwordHash: await hashPassword(password) } });
  res.json({ message: "Đã reset mật khẩu", password });
});

adminRouter.patch("/users/:id/status", async (req, res) => {
  const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status: req.body.status } });
  res.json(user);
});

adminRouter.get("/drivers", async (_req, res) => {
  const drivers = await prisma.driver.findMany({ include: { vehicles: true, user: true }, orderBy: { id: "asc" } });
  res.json(drivers);
});

adminRouter.patch("/drivers/:id", async (req, res) => {
  const driver = await prisma.driver.update({ where: { id: Number(req.params.id) }, data: req.body });
  res.json(driver);
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
    const whereDriver: any = { OR: [{ status: "Rảnh" }, { status: "available" }, { status: "AVAILABLE" }] };

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

    res.json({ unassignedBookings, collectingTrips, availableDrivers, routes });
  } catch (error) {
    console.error("GET /admin/dispatch error:", error);
    res.status(500).json({ message: "Không tải được dữ liệu điều phối" });
  }
});

adminRouter.get("/trips", async (_req, res) => {
  const trips = await prisma.trip.findMany({ include: { route: true, driver: true, vehicle: true, tripBookings: { include: { booking: true } } }, orderBy: { departureAt: "desc" } });
  res.json(trips);
});

adminRouter.post("/trips", async (req, res) => {
  try {
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
    const data: any = {};
    if (req.body.status) data.status = req.body.status;
    if (req.body.driverId !== undefined) data.driverId = req.body.driverId ? Number(req.body.driverId) : null;
    if (req.body.vehicleId !== undefined) data.vehicleId = req.body.vehicleId ? Number(req.body.vehicleId) : null;
    if (req.body.departureAt) data.departureAt = new Date(req.body.departureAt);
    if (req.body.note !== undefined) data.note = req.body.note;
    const trip = await prisma.trip.update({ where: { id: Number(req.params.id) }, data, include: { route: true, driver: true, vehicle: true } });
    res.json(trip);
  } catch (error) {
    console.error("PATCH /admin/trips/:id error:", error);
    res.status(500).json({ message: "Không cập nhật được chuyến" });
  }
});

adminRouter.post("/trips/:id/add-bookings", async (req, res) => {
  try {
    const tripId = Number(req.params.id);
    const rawBookingIds = Array.isArray(req.body.bookingIds) ? req.body.bookingIds : [];
    const bookingIds = Array.from(new Set(rawBookingIds.map(Number).filter(Boolean))) as number[];
    if (!bookingIds.length) return res.status(400).json({ message: "Chưa chọn đơn để gán" });

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });

      const existing = await tx.tripBooking.findMany({
        where: { tripId, bookingId: { in: bookingIds } },
        select: { bookingId: true },
      });
      const existingIds = new Set(existing.map((x) => x.bookingId));
      const newBookingIds = bookingIds.filter((id) => !existingIds.has(id));

      if (!newBookingIds.length) {
        return { added: 0, skipped: bookingIds.length, message: "Các đơn đã nằm trong chuyến, không cộng thêm ghế/tiền." };
      }

      const bookings = await tx.booking.findMany({ where: { id: { in: newBookingIds } } });
      const seats = bookings.reduce((s, b) => s + Number(b.passengerCount || 0), 0);
      if (seats <= 0) throw Object.assign(new Error("Số ghế không hợp lệ"), { statusCode: 400 });
      if (Number(trip.availableSeats) < seats) throw Object.assign(new Error("Chuyến không đủ ghế trống"), { statusCode: 400 });

      for (const id of newBookingIds) {
        await tx.tripBooking.create({ data: { tripId, bookingId: id } });
      }

      await tx.booking.updateMany({ where: { id: { in: newBookingIds } }, data: { status: BookingStatus.ASSIGNED } });

      const total = bookings.reduce((s, b) => s + Number(b.finalTotal || 0), 0);
      const commission = bookings.reduce((s, b) => s + Number(b.commissionAmount || 0), 0);
      const driverNet = total - commission;

      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          bookedSeats: { increment: seats },
          availableSeats: { decrement: seats },
          totalCustomerAmount: { increment: total },
          adminCommission: { increment: commission },
          driverNetAmount: { increment: driverNet },
          driverDebtAmount: { increment: commission },
        },
      });

      return { added: newBookingIds.length, skipped: bookingIds.length - newBookingIds.length, seats, total, commission, trip: updatedTrip };
    });

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
  if (req.query.from || req.query.to) where.departureAt = { gte: req.query.from ? new Date(String(req.query.from)) : undefined, lte: req.query.to ? new Date(String(req.query.to)) : undefined };
  const trips = await prisma.trip.findMany({ where, include: { route: true, driver: true } });
  const sum = (field: keyof typeof trips[number]) => trips.reduce((s, t: any) => s + Number(t[field] || 0), 0);
  res.json({ totalTrips: trips.length, totalRevenue: sum("totalCustomerAmount" as any), totalCommission: sum("adminCommission" as any), totalDriverNet: sum("driverNetAmount" as any), totalDriverDebt: sum("driverDebtAmount" as any), trips });
});

adminRouter.get("/settings", async (_req, res) => res.json(await prisma.siteSetting.findMany({ orderBy: { key: "asc" } })));
adminRouter.put("/settings", async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) await prisma.siteSetting.upsert({ where: { key }, update: { value: String(value ?? "") }, create: { key, value: String(value ?? "") } });
  res.json({ ok: true });
});

adminRouter.post("/media/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Chưa chọn file" });
  const title = req.body.title || req.file.originalname;
  const altText = req.body.altText || title;
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
