import { Router } from "express";
import { BookingStatus, BookingType, TripStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { checkTripCompletionEligibility, completeTrip } from "../lib/tripComplete.js";

export const driverRouter = Router();
driverRouter.use(requireAuth, requireRoles(["DRIVER"]));

async function getAuthedDriver(userId: number) {
  return prisma.driver.findFirst({ where: { userId }, include: { vehicles: true } });
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return "";
  const p = String(phone).trim();
  if (p.length <= 4) return p.replace(/\d/g, "*");
  const head = p.slice(0, 2);
  const tail = p.slice(-2);
  return `${head}${"*".repeat(Math.max(0, p.length - 4))}${tail}`;
}

driverRouter.get("/me", async (req, res) => {
  const driver = await getAuthedDriver(req.user!.id);
  res.json(driver);
});

driverRouter.get("/dashboard", async (req, res) => {
  const driver = await getAuthedDriver(req.user!.id);
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [todayTripsCount, activeTripsCount, unreadCount, trips] = await Promise.all([
    prisma.trip.count({ where: { driverId: driver.id, departureAt: { gte: start, lt: end } } }),
    prisma.trip.count({ where: { driverId: driver.id, status: { in: [TripStatus.COLLECTING, TripStatus.READY, TripStatus.IN_PROGRESS] } } }),
    prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
    prisma.trip.findMany({
      where: { driverId: driver.id, departureAt: { gte: start, lt: end } },
      include: { tripBookings: { include: { booking: true } } },
    }),
  ]);

  const bookings = trips.flatMap((t) => t.tripBookings.map((tb) => tb.booking));
  const totalNeedCollect = bookings.reduce((s, b) => s + Number(b.finalTotal || 0), 0);
  const totalCollected = bookings.reduce((s, b) => (b.paymentStatus === "UNPAID" ? s : s + Number(b.finalTotal || 0)), 0);
  const debtAmount = trips.reduce((s, t) => s + Number(t.driverDebtAmount || 0), 0);

  res.json({
    driverStatus: driver.status,
    currentLocation: driver.location,
    currentDirection: driver.direction,
    availableSeats: driver.seatsFree,
    todayTripsCount,
    activeTripsCount,
    pendingNotificationsCount: unreadCount,
    totalNeedCollect,
    totalCollected,
    debtAmount,
  });
});

driverRouter.patch("/availability", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  const updated = await prisma.driver.update({ where: { id: driver.id }, data: { status: req.body.status, location: req.body.location, direction: req.body.direction, seatsFree: Number(req.body.seatsFree || 0) } });
  res.json(updated);
});

driverRouter.post("/status", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: {
      ...(req.body.status ? { status: String(req.body.status) } : {}),
      ...(req.body.currentLocationName !== undefined ? { location: req.body.currentLocationName } : {}),
      ...(req.body.currentRouteDirection !== undefined ? { direction: req.body.currentRouteDirection } : {}),
      ...(req.body.availableSeats !== undefined ? { seatsFree: Number(req.body.availableSeats) } : {}),
    },
  });
  res.json(updated);
});

driverRouter.get("/jobs", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.json([]);
  const trips = await prisma.trip.findMany({ where: { driverId: driver.id }, include: { route: true, tripBookings: { include: { booking: true } } }, orderBy: { departureAt: "desc" } });
  res.json(trips);
});

driverRouter.get("/trips", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.json([]);
  const trips = await prisma.trip.findMany({
    where: { driverId: driver.id },
    include: { route: true, vehicle: true, tripBookings: { include: { booking: true } } },
    orderBy: { departureAt: "desc" },
  });

  const rows = trips.map((t) => {
    const bookings = (t.tripBookings || []).map((tb) => tb.booking);
    const passengers = bookings.filter((b) => b.type !== BookingType.CARGO);
    const parcels = bookings.filter((b) => b.type === BookingType.CARGO);
    const totalNeedCollect = bookings.reduce((s, b) => s + Number(b.finalTotal || 0), 0);
    const totalCollected = bookings.reduce((s, b) => (b.paymentStatus === "UNPAID" ? s : s + Number(b.finalTotal || 0)), 0);
    return {
      id: t.id,
      code: t.code,
      status: t.status,
      departureAt: t.departureAt,
      route: t.route,
      vehicle: t.vehicle,
      totalSeats: t.totalSeats,
      bookedSeats: t.bookedSeats,
      availableSeats: t.availableSeats,
      passengersCount: passengers.length,
      parcelsCount: parcels.length,
      totalNeedCollect,
      totalCollected,
      debtAmount: Number(t.driverDebtAmount || 0),
    };
  });
  res.json(rows);
});

driverRouter.get("/trips/:tripId", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  const tripId = Number(req.params.tripId);
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: driver.id },
    include: {
      route: true,
      vehicle: true,
      tripBookings: { include: { booking: true } },
    },
  });
  if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });

  const bookings = trip.tripBookings.map((tb) => tb.booking);
  const completionCheck = checkTripCompletionEligibility(bookings);
  const passengers = bookings
    .filter((b) => b.type !== BookingType.CARGO)
    .map((b) => ({
      id: b.id,
      code: b.code,
      customerName: b.customerName,
      customerPhoneMasked: maskPhone(b.customerPhone),
      customerPhone: b.customerPhone,
      passengerCount: b.passengerCount,
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      scheduledAt: b.scheduledAt,
      note: b.note,
      status: b.driverRideStatus,
      paymentStatus: b.paymentStatus,
      amount: Number(b.finalTotal || 0),
      paymentReceiver: b.paymentReceiver,
    }));
  const parcels = bookings
    .filter((b) => b.type === BookingType.CARGO)
    .map((b) => ({
      id: b.id,
      code: b.code,
      senderName: b.customerName,
      senderPhoneMasked: maskPhone(b.customerPhone),
      senderPhone: b.customerPhone,
      receiverName: b.customerName,
      receiverPhoneMasked: maskPhone(b.customerPhone),
      receiverPhone: b.customerPhone,
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      description: b.cargoDescription,
      note: b.note,
      status: b.driverCargoStatus,
      paymentStatus: b.paymentStatus,
      amount: Number(b.finalTotal || 0),
      paymentReceiver: b.paymentReceiver,
    }));

  const totalNeedCollect = bookings.reduce((s, b) => s + Number(b.finalTotal || 0), 0);
  const totalCollected = bookings.reduce((s, b) => (b.paymentStatus === "UNPAID" ? s : s + Number(b.finalTotal || 0)), 0);

  res.json({
    trip,
    passengers,
    parcels,
    completion: completionCheck,
    paymentSummary: {
      totalNeedCollect,
      totalCollected,
      totalUncollected: Math.max(0, totalNeedCollect - totalCollected),
    },
    debtSummary: {
      debtAmount: Number(trip.driverDebtAmount || 0),
    },
  });
});

driverRouter.get("/trips/:tripId/can-complete", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  const tripId = Number(req.params.tripId);
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: driver.id },
    include: { tripBookings: { include: { booking: true } } },
  });
  if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });
  const bookings = trip.tripBookings.map((tb) => tb.booking);
  res.json(checkTripCompletionEligibility(bookings));
});

driverRouter.post("/trips/:tripId/complete", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.tripId);
    const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId: driver.id } });
    if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });
    const result = await completeTrip(trip.id, { completedBy: "DRIVER", userId: req.user?.id });
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("POST /driver/trips/:tripId/complete error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không hoàn thành chuyến", details: error.details });
  }
});

driverRouter.patch("/jobs/:id/status", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    const trip = await prisma.trip.findFirst({ where: { id: Number(req.params.id), driverId: driver?.id } });
    if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });

    if (req.body.status === TripStatus.COMPLETED) {
      const result = await completeTrip(trip.id, { completedBy: "DRIVER", userId: req.user?.id });
      return res.json(result);
    }

    const updated = await prisma.trip.update({ where: { id: trip.id }, data: { status: req.body.status } });
    res.json(updated);
  } catch (error: any) {
    console.error("PATCH /driver/jobs/:id/status error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không cập nhật trạng thái" });
  }
});

driverRouter.post("/jobs/:id/complete", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    const trip = await prisma.trip.findFirst({ where: { id: Number(req.params.id), driverId: driver?.id } });
    if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });
    const result = await completeTrip(trip.id, { completedBy: "DRIVER", userId: req.user?.id });
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("POST /driver/jobs/:id/complete error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không hoàn thành chuyến" });
  }
});

driverRouter.post("/jobs/:id/accept", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.id);
    const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId: driver.id } });
    if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });

    const result = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({ where: { id: tripId }, data: { status: TripStatus.READY } });
      const links = await tx.tripBooking.findMany({ where: { tripId }, select: { bookingId: true } });
      if (links.length) {
        await tx.booking.updateMany({ where: { id: { in: links.map((l) => l.bookingId) } }, data: { status: BookingStatus.DRIVER_ACCEPTED } });
      }
      return updatedTrip;
    });
    res.json({ message: "Đã nhận chuyến", trip: result });
  } catch (error) {
    console.error("POST /driver/jobs/:id/accept error:", error);
    res.status(500).json({ message: "Không nhận được chuyến" });
  }
});

driverRouter.post("/jobs/:id/reject", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.id);
    const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId: driver.id } });
    if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });

    const reason = req.body?.reason ? String(req.body.reason).trim() : "";
    const result = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          driverId: null,
          vehicleId: null,
          status: TripStatus.COLLECTING,
          ...(reason ? { driverRejectReason: reason } : { driverRejectReason: null }),
        } as any,
      });
      const links = await tx.tripBooking.findMany({ where: { tripId }, select: { bookingId: true } });
      if (links.length) {
        await tx.booking.updateMany({ where: { id: { in: links.map((l) => l.bookingId) } }, data: { status: BookingStatus.ASSIGNED } });
      }
      return updatedTrip;
    });
    res.json({ message: "Đã từ chối chuyến", trip: result, reason: reason || undefined });
  } catch (error) {
    console.error("POST /driver/jobs/:id/reject error:", error);
    res.status(500).json({ message: "Không từ chối được chuyến" });
  }
});

driverRouter.post("/trips/:tripId/accept", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.tripId);
    const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId: driver.id } });
    if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });

    const result = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({ where: { id: tripId }, data: { status: TripStatus.READY } });
      const links = await tx.tripBooking.findMany({ where: { tripId }, select: { bookingId: true } });
      if (links.length) {
        await tx.booking.updateMany({
          where: { id: { in: links.map((l) => l.bookingId) } },
          data: { status: BookingStatus.DRIVER_ACCEPTED },
        });
      }
      return updatedTrip;
    });
    res.json({ message: "Đã nhận chuyến", trip: result });
  } catch (error) {
    console.error("POST /driver/trips/:tripId/accept error:", error);
    res.status(500).json({ message: "Không nhận được chuyến" });
  }
});

driverRouter.post("/trips/:tripId/reject", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.tripId);
    const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId: driver.id } });
    if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });

    const reason = req.body?.reason ? String(req.body.reason).trim() : "";
    const result = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          driverId: null,
          vehicleId: null,
          status: TripStatus.COLLECTING,
          ...(reason ? { driverRejectReason: reason } : { driverRejectReason: null }),
        } as any,
      });
      const links = await tx.tripBooking.findMany({ where: { tripId }, select: { bookingId: true } });
      if (links.length) {
        await tx.booking.updateMany({ where: { id: { in: links.map((l) => l.bookingId) } }, data: { status: BookingStatus.ASSIGNED } });
      }
      return updatedTrip;
    });
    res.json({ message: "Đã từ chối chuyến", trip: result, reason: reason || undefined });
  } catch (error) {
    console.error("POST /driver/trips/:tripId/reject error:", error);
    res.status(500).json({ message: "Không từ chối được chuyến" });
  }
});

driverRouter.post("/trips/:tripId/available-seats", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  const tripId = Number(req.params.tripId);
  const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId: driver.id }, include: { vehicle: true } });
  if (!trip) return res.status(404).json({ message: "Không tìm thấy chuyến" });

  const availableSeats = Number(req.body.availableSeats);
  if (!Number.isFinite(availableSeats) || availableSeats < 0) return res.status(400).json({ message: "Số ghế trống không hợp lệ" });
  const maxSeats = Number(trip.vehicle?.seats || trip.totalSeats || 0);
  if (maxSeats > 0 && availableSeats > maxSeats) return res.status(400).json({ message: `Số ghế trống không được vượt quá ${maxSeats}` });

  const result = await prisma.$transaction(async (tx) => {
    const updatedTrip = await tx.trip.update({ where: { id: trip.id }, data: { availableSeats } });
    await tx.driverSeatLog.create({
      data: {
        driverId: driver.id,
        tripId: trip.id,
        oldAvailableSeats: Number(trip.availableSeats || 0),
        newAvailableSeats: availableSeats,
        reason: req.body.reason ? String(req.body.reason) : null,
      },
    });
    return updatedTrip;
  });

  res.json(result);
});

driverRouter.post("/bookings/:bookingId/collect-payment", async (req, res) => {
  const method = String(req.body.method || "");
  if (!["CASH_COLLECTED", "TRANSFERRED"].includes(method)) return res.status(400).json({ message: "Phương thức thu tiền không hợp lệ" });

  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  const bookingId = Number(req.params.bookingId);

  // booking phải thuộc chuyến của tài xế
  const link = await prisma.tripBooking.findFirst({
    where: { bookingId, trip: { driverId: driver.id } },
    include: { trip: true, booking: true },
  });
  if (!link) return res.status(404).json({ message: "Không tìm thấy đơn trong chuyến của bạn" });
  if (link.booking.status === BookingStatus.CANCELLED) return res.status(400).json({ message: "Đơn đã hủy, không thể thu tiền" });

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { paymentStatus: method as any, paymentCollectedAt: new Date(), paymentCollectedByUserId: req.user!.id },
  });
  res.json({ ok: true, booking: updated });
});

driverRouter.post("/trips/:tripId/bookings/:bookingId/status", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  const tripId = Number(req.params.tripId);
  const bookingId = Number(req.params.bookingId);
  const status = String(req.body.status || "");

  const link = await prisma.tripBooking.findFirst({
    where: { tripId, bookingId, trip: { driverId: driver.id } },
    include: { booking: true },
  });
  if (!link) return res.status(404).json({ message: "Không tìm thấy đơn trong chuyến của bạn" });
  if (link.booking.status === BookingStatus.CANCELLED) return res.status(400).json({ message: "Đơn đã bị admin hủy" });
  if (link.booking.type === BookingType.CARGO) return res.status(400).json({ message: "Đơn này là gửi hàng, hãy cập nhật ở mục gửi hàng" });

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      driverRideStatus: status as any,
      ...(status === "CUSTOMER_CANCELLED" ? { status: BookingStatus.WAITING_DISPATCH } : {}),
      ...(status === "UNREACHABLE" || status === "NO_SHOW" ? { status: BookingStatus.CONTACTED } : {}),
    },
  });
  res.json(updated);
});

driverRouter.post("/trips/:tripId/parcels/:bookingId/status", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  const tripId = Number(req.params.tripId);
  const bookingId = Number(req.params.bookingId);
  const status = String(req.body.status || "");

  const link = await prisma.tripBooking.findFirst({
    where: { tripId, bookingId, trip: { driverId: driver.id } },
    include: { booking: true },
  });
  if (!link) return res.status(404).json({ message: "Không tìm thấy đơn gửi hàng trong chuyến của bạn" });
  if (link.booking.status === BookingStatus.CANCELLED) return res.status(400).json({ message: "Đơn đã bị admin hủy" });
  if (link.booking.type !== BookingType.CARGO) return res.status(400).json({ message: "Đơn này không phải gửi hàng" });

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { driverCargoStatus: status as any },
  });
  res.json(updated);
});

driverRouter.get("/reports", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.json({ totalTrips: 0, totalDebt: 0, totalAdminOwes: 0, trips: [], payments: [] });
  const trips = await prisma.trip.findMany({ where: { driverId: driver.id }, include: { route: true }, orderBy: { departureAt: "desc" } });
  const payments = await prisma.driverSettlementPayment.findMany({ where: { driverId: driver.id }, orderBy: { createdAt: "desc" } });
  let totalDebt = 0;
  let totalAdminOwes = 0;
  let totalPaid = 0;
  const tripRows = trips.map((t) => {
    const tripPays = payments.filter((p) => p.tripId === t.id);
    const driverPaid = tripPays.filter((p) => p.direction === "DRIVER_OWES_ADMIN").reduce((s, p) => s + Number(p.amount), 0);
    const adminPaid = tripPays.filter((p) => p.direction === "ADMIN_OWES_DRIVER").reduce((s, p) => s + Number(p.amount), 0);
    const driverRem = Math.max(0, Number(t.driverDebtAmount) - driverPaid);
    const adminRem = Math.max(0, Number((t as any).adminOwesDriverAmount || 0) - adminPaid);
    totalDebt += driverRem;
    totalAdminOwes += adminRem;
    totalPaid += driverPaid;
    return { ...t, driverPaidAdmin: driverPaid, adminPaidDriver: adminPaid, driverDebtRemaining: driverRem, adminOwesRemaining: adminRem };
  });
  res.json({ totalTrips: trips.length, totalDebt, totalAdminOwes, totalPaid, trips: tripRows, payments });
});

// Spec-compatible wrapper for notifications (đang dùng router chung /api/notifications)
driverRouter.get("/notifications", async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const unreadOnly = req.query.unreadOnly === "1" || req.query.unreadOnly === "true";
  const items = await prisma.notification.findMany({
    where: { userId: req.user!.id, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json(items);
});

driverRouter.post("/notifications/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  const row = await prisma.notification.findFirst({ where: { id, userId: req.user!.id } });
  if (!row) return res.status(404).json({ message: "Không tìm thấy thông báo" });
  const updated = await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  res.json(updated);
});
