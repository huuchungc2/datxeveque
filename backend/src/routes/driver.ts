import { Router } from "express";
import { BookingStatus, TripStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { completeTrip } from "../lib/tripComplete.js";

export const driverRouter = Router();
driverRouter.use(requireAuth, requireRoles(["DRIVER"]));

driverRouter.get("/me", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id }, include: { vehicles: true } });
  res.json(driver);
});

driverRouter.patch("/availability", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.status(404).json({ message: "Không tìm thấy tài xế" });
  const updated = await prisma.driver.update({ where: { id: driver.id }, data: { status: req.body.status, location: req.body.location, direction: req.body.direction, seatsFree: Number(req.body.seatsFree || 0) } });
  res.json(updated);
});

driverRouter.get("/jobs", async (req, res) => {
  const driver = await prisma.driver.findFirst({ where: { userId: req.user!.id } });
  if (!driver) return res.json([]);
  const trips = await prisma.trip.findMany({ where: { driverId: driver.id }, include: { route: true, tripBookings: { include: { booking: true } } }, orderBy: { departureAt: "desc" } });
  res.json(trips);
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

    const result = await prisma.$transaction(async (tx) => {
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { driverId: null, vehicleId: null, status: TripStatus.COLLECTING },
      });
      const links = await tx.tripBooking.findMany({ where: { tripId }, select: { bookingId: true } });
      if (links.length) {
        await tx.booking.updateMany({ where: { id: { in: links.map((l) => l.bookingId) } }, data: { status: BookingStatus.ASSIGNED } });
      }
      return updatedTrip;
    });
    res.json({ message: "Đã từ chối chuyến", trip: result });
  } catch (error) {
    console.error("POST /driver/jobs/:id/reject error:", error);
    res.status(500).json({ message: "Không từ chối được chuyến" });
  }
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
