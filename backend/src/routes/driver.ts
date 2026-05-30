import { Router } from "express";
import { BookingStatus, BookingType, TripStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { assertValidCargoStatusTransition, assertValidRideStatusTransition } from "../lib/driverRideFlow.js";
import { driverSetTripStatus } from "../lib/driverTripStatus.js";
import { checkTripCompletionEligibility, completeTrip, tryAutoCompleteTrip } from "../lib/tripComplete.js";
import {
  countPendingAckOnTrip,
  driverAcceptTrip,
  driverRejectTrip,
  tripNeedsDriverAck,
} from "../lib/driverTripAck.js";
import {
  notifyStaffDriverTripAccepted,
  notifyStaffDriverTripRejected,
  safeNotify,
} from "../lib/notifications.js";
import {
  departureEndpointForRun,
  endpointLabel,
  runDirectionLabel,
  type RunDirection,
} from "../lib/routeEndpoints.js";
import { publicRouteWhere } from "../lib/routes.js";
import { loadDriverAvailabilityContext, patchDriverAvailability } from "../lib/driverAvailability.js";
import {
  assumedPaymentStatusAfterTripComplete,
  bookingCollectedAmount,
  rollupBookingFinancials,
  rollupBookingFinancialsPortion,
} from "../lib/settlement.js";
import { bookingSeatUnits, tripBookingSeatUnits } from "../lib/bookingSeats.js";
import { buildPaidByTrip, enrichTripDebtRow, loadPaymentsForTrips } from "../lib/tripSettlement.js";

async function notifyStaffAfterDriverTripResponse(
  tripId: number,
  driverName: string,
  kind: "accept" | "reject",
  reason?: string
) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { route: { select: { name: true } } },
  });
  if (!trip) return;
  const payload = {
    tripId: trip.id,
    tripCode: trip.code,
    driverName,
    departureAt: trip.departureAt,
    routeName: trip.route?.name,
  };
  if (kind === "accept") {
    await notifyStaffDriverTripAccepted(payload);
  } else {
    await notifyStaffDriverTripRejected({ ...payload, reason });
  }
}

export const driverRouter = Router();
driverRouter.use(requireAuth, requireRoles(["DRIVER"]));

async function getAuthedDriver(userId: number) {
  return prisma.driver.findFirst({
    where: { userId },
    include: {
      vehicles: true,
      route: { select: { id: true, name: true, fromName: true, toName: true, direction: true } },
    },
  });
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

driverRouter.get("/routes", async (_req, res) => {
  const routes = await prisma.route.findMany({
    where: publicRouteWhere(),
    orderBy: { name: "asc" },
    select: { id: true, name: true, fromName: true, toName: true, direction: true },
  });
  res.json(routes);
});

driverRouter.get("/availability", async (req, res) => {
  const ctx = await loadDriverAvailabilityContext(req.user!.id);
  if (!ctx) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  res.json(ctx);
});

driverRouter.patch("/availability", async (req, res) => {
  try {
    const result = await patchDriverAvailability(req.user!.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message || "Không cập nhật được" });
  }
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

  const rows = await Promise.all(
    trips.map(async (t) => {
      const bookings = (t.tripBookings || []).map((tb) => tb.booking);
      const passengers = bookings.filter((b) => b.type !== BookingType.CARGO);
      const parcels = bookings.filter((b) => b.type === BookingType.CARGO);
      const tripCompleted = t.status === TripStatus.COMPLETED || t.status === TripStatus.CANCELLED;

      // Tổng tiền theo phần ghế thuộc chuyến (khớp settlement snapshot)
      const fin = (t.tripBookings || []).reduce(
        (acc, tb) => {
          const seats = tripBookingSeatUnits(tb);
          const portion = rollupBookingFinancialsPortion(tb.booking, seats, bookingSeatUnits(tb.booking));
          acc.total += portion.total;
          return acc;
        },
        { total: 0 }
      );
      const totalNeedCollect = tripCompleted ? Number((t as any).totalCustomerAmount || fin.total || 0) : fin.total;
      const totalCollected = bookings.reduce((s, b) => s + bookingCollectedAmount(b, tripCompleted), 0);
      const pendingAckCount = bookings.filter((b) => b.status === BookingStatus.ASSIGNED).length;
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
        pendingAckCount,
        needsDriverAck: tripNeedsDriverAck(t, pendingAckCount),
      };
    })
  );
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
  const tripCompleted = trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED;
  const completionCheck = checkTripCompletionEligibility(bookings);

  const seatByBookingId = new Map<number, number>();
  for (const tb of trip.tripBookings) {
    if (!tb?.bookingId) continue;
    seatByBookingId.set(Number(tb.bookingId), tripBookingSeatUnits(tb));
  }

  const mapBookingMoney = (b: (typeof bookings)[0]) => {
    const assignedSeatCount = seatByBookingId.get(Number(b.id)) ?? tripBookingSeatUnits({ booking: b } as any);
    const bookingTotalSeats = bookingSeatUnits(b as any);
    const fin = rollupBookingFinancialsPortion(b, assignedSeatCount, bookingTotalSeats);
    const fullTotal = Number(b.finalTotal || 0);
    return {
      paymentStatus: tripCompleted ? assumedPaymentStatusAfterTripComplete(b) : b.paymentStatus,
      amount: fin.total,
      bookingFullAmount: fullTotal,
      paymentReceiver: b.paymentReceiver,
      seatCountOnTrip: assignedSeatCount,
      bookingTotalSeats,
      commissionAmount: fin.commission,
      driverOwesAdmin: fin.driverOwesAdmin,
      adminOwesDriver: fin.adminOwesDriver,
      driverKeeps: fin.driverAmount,
    };
  };

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
      bookingStatus: b.status,
      needsAck: b.status === BookingStatus.ASSIGNED,
      ...mapBookingMoney(b),
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
      bookingStatus: b.status,
      needsAck: b.status === BookingStatus.ASSIGNED,
      ...mapBookingMoney(b),
    }));

  // Tổng tiền theo phần ghế thuộc chuyến (khớp settlement snapshot)
  const fin = trip.tripBookings.reduce(
    (acc, tb) => {
      const seats = tripBookingSeatUnits(tb);
      const portion = rollupBookingFinancialsPortion(tb.booking, seats, bookingSeatUnits(tb.booking));
      acc.total += portion.total;
      return acc;
    },
    { total: 0 }
  );
  const totalNeedCollect = tripCompleted ? Number((trip as any).totalCustomerAmount || fin.total || 0) : fin.total;
  const totalCollected = bookings.reduce((s, b) => s + bookingCollectedAmount(b, tripCompleted), 0);
  const rollup = trip.tripBookings.reduce(
    (acc, tb) => {
      const seats = tripBookingSeatUnits(tb);
      const portion = rollupBookingFinancialsPortion(tb.booking, seats, bookingSeatUnits(tb.booking));
      acc.totalCommission += portion.commission;
      acc.driverOwesAdmin += portion.driverOwesAdmin;
      acc.adminOwesDriver += portion.adminOwesDriver;
      acc.driverKeeps += portion.driverAmount;
      return acc;
    },
    { totalCommission: 0, driverOwesAdmin: 0, adminOwesDriver: 0, driverKeeps: 0 }
  );
  const pendingAckCount = await countPendingAckOnTrip(tripId);

  res.json({
    trip,
    passengers,
    parcels,
    pendingAckCount,
    needsDriverAck: tripNeedsDriverAck(trip, pendingAckCount),
    completion: completionCheck,
    paymentSummary: {
      totalNeedCollect,
      totalCollected,
      totalUncollected: tripCompleted ? 0 : Math.max(0, totalNeedCollect - totalCollected),
      totalCommission: tripCompleted ? Number(trip.adminCommission || 0) : rollup.totalCommission,
      driverOwesAdmin: tripCompleted ? Number(trip.driverDebtAmount || 0) : rollup.driverOwesAdmin,
      adminOwesDriver: tripCompleted ? Number(trip.adminOwesDriverAmount || 0) : rollup.adminOwesDriver,
      driverKeeps: tripCompleted ? Number(trip.driverNetAmount || 0) : rollup.driverKeeps,
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

async function handleDriverAccept(driverId: number, driverName: string, tripId: number) {
  const result = await driverAcceptTrip(driverId, tripId);
  void safeNotify(() => notifyStaffAfterDriverTripResponse(tripId, driverName, "accept"));
  return result;
}

async function handleDriverReject(driverId: number, driverName: string, tripId: number, reason?: string) {
  const result = await driverRejectTrip(driverId, tripId, reason);
  void safeNotify(() => notifyStaffAfterDriverTripResponse(tripId, driverName, "reject", reason));
  return result;
}

driverRouter.post("/jobs/:id/accept", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.id);
    const result = await handleDriverAccept(driver.id, driver.name, tripId);
    res.json({ message: result.message, trip: result.trip });
  } catch (error: any) {
    console.error("POST /driver/jobs/:id/accept error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không nhận được chuyến" });
  }
});

driverRouter.post("/jobs/:id/reject", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.id);
    const reason = req.body?.reason ? String(req.body.reason).trim() : "";
    const result = await handleDriverReject(driver.id, driver.name, tripId, reason);
    res.json({ message: result.message, trip: result.trip, reason: reason || undefined });
  } catch (error: any) {
    console.error("POST /driver/jobs/:id/reject error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không từ chối được chuyến" });
  }
});

driverRouter.post("/trips/:tripId/accept", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.tripId);
    const result = await handleDriverAccept(driver.id, driver.name, tripId);
    res.json({ message: result.message, trip: result.trip });
  } catch (error: any) {
    console.error("POST /driver/trips/:tripId/accept error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không nhận được chuyến" });
  }
});

driverRouter.post("/trips/:tripId/reject", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.tripId);
    const reason = req.body?.reason ? String(req.body.reason).trim() : "";
    const result = await handleDriverReject(driver.id, driver.name, tripId, reason);
    res.json({ message: result.message, trip: result.trip, reason: reason || undefined });
  } catch (error: any) {
    console.error("POST /driver/trips/:tripId/reject error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không từ chối được chuyến" });
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

  try {
    assertValidRideStatusTransition(link.booking.driverRideStatus, status);
  } catch (e: any) {
    return res.status(e.statusCode || 400).json({ message: e.message });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      driverRideStatus: status as any,
      ...(status === "CUSTOMER_CANCELLED" ? { status: BookingStatus.WAITING_DISPATCH } : {}),
      ...(status === "UNREACHABLE" || status === "NO_SHOW" ? { status: BookingStatus.CONTACTED } : {}),
    },
  });

  const auto = await tryAutoCompleteTrip(tripId, { completedBy: "DRIVER", userId: req.user?.id });
  if (auto.autoCompleted) {
    return res.json({
      ...updated,
      autoCompleted: true,
      message: auto.message || "Tất cả khách đã trả — chuyến đã tự hoàn thành. Bạn đã chuyển sang rảnh, chiều ngược.",
    });
  }

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

  try {
    assertValidCargoStatusTransition(link.booking.driverCargoStatus, status);
  } catch (e: any) {
    return res.status(e.statusCode || 400).json({ message: e.message });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { driverCargoStatus: status as any },
  });

  const auto = await tryAutoCompleteTrip(tripId, { completedBy: "DRIVER", userId: req.user?.id });
  if (auto.autoCompleted) {
    return res.json({
      ...updated,
      autoCompleted: true,
      message: auto.message || "Đã giao hết — chuyến tự hoàn thành. Bạn đã chuyển sang rảnh, chiều ngược.",
    });
  }

  res.json(updated);
});

driverRouter.post("/trips/:tripId/trip-status", async (req, res) => {
  try {
    const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
    if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
    const tripId = Number(req.params.tripId);
    const target = String(req.body.status || "").toUpperCase();
    if (!["READY", "IN_PROGRESS", "COMPLETED"].includes(target)) {
      return res.status(400).json({ message: "Trạng thái phải là READY, IN_PROGRESS hoặc COMPLETED" });
    }
    const result = await driverSetTripStatus(driver.id, tripId, target as "READY" | "IN_PROGRESS" | "COMPLETED", req.user?.id);
    res.json(result);
  } catch (error: any) {
    console.error("POST /driver/trips/:tripId/trip-status error:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Không đổi được trạng thái chuyến" });
  }
});

driverRouter.get("/reports", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) {
    return res.json({ totalTrips: 0, totalDebt: 0, totalAdminOwes: 0, totalPaid: 0, trips: [], payments: [] });
  }

  const trips = await prisma.trip.findMany({
    where: { driverId: driver.id, status: TripStatus.COMPLETED },
    include: { route: { select: { id: true, name: true, direction: true } } },
    orderBy: { departureAt: "desc" },
  });
  const tripIds = trips.map((t) => t.id);
  const tripPayments = await loadPaymentsForTrips(tripIds);
  const paidByTrip = buildPaidByTrip(tripPayments);

  let totalDebt = 0;
  let totalAdminOwes = 0;
  let totalPaid = 0;
  const tripRows = trips.map((t) => {
    const debt = enrichTripDebtRow(t, paidByTrip);
    totalDebt += debt.driverDebtRemaining;
    totalAdminOwes += debt.adminOwesRemaining;
    totalPaid += debt.driverPaidAdmin;
    return { ...t, ...debt };
  });

  const paymentsRaw = await prisma.driverSettlementPayment.findMany({
    where: { driverId: driver.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const payTripIds = [...new Set(paymentsRaw.map((p) => p.tripId).filter(Boolean))] as number[];
  const payTrips =
    payTripIds.length > 0
      ? await prisma.trip.findMany({ where: { id: { in: payTripIds } }, select: { id: true, code: true } })
      : [];
  const tripCodeById = new Map(payTrips.map((t) => [t.id, t.code]));
  const payments = paymentsRaw.map((p) => ({
    ...p,
    trip: p.tripId ? { id: p.tripId, code: tripCodeById.get(p.tripId) || null } : null,
  }));

  res.json({
    totalTrips: trips.length,
    totalDebt,
    totalAdminOwes,
    totalPaid,
    trips: tripRows,
    payments,
  });
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
