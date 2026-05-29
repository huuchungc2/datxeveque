import { BookingStatus, TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

function dayBounds(d = new Date()) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getAdminDashboard() {
  const { start, end } = dayBounds();
  const busyDriverIds = await prisma.trip.findMany({
    where: { status: { in: [TripStatus.COLLECTING, TripStatus.READY, TripStatus.IN_PROGRESS] }, driverId: { not: null } },
    select: { driverId: true },
    distinct: ["driverId"],
  });
  const busyIds = busyDriverIds.map((r) => r.driverId).filter(Boolean) as number[];

  const [
    newBookings,
    waitingDispatch,
    collectingTrips,
    inProgressTrips,
    completedTodayTrips,
    driversAvailable,
    driversOnTrip,
    driverRejectedTrips,
    adminReviewBookings,
    todayTrips,
    recentBookings,
    recentAlerts,
  ] = await Promise.all([
    prisma.booking.count({ where: { status: BookingStatus.NEW } }),
    prisma.booking.count({ where: { status: BookingStatus.WAITING_DISPATCH, tripBookings: { none: {} } } }),
    prisma.trip.count({ where: { status: { in: [TripStatus.COLLECTING, TripStatus.READY] } } }),
    prisma.trip.count({ where: { status: TripStatus.IN_PROGRESS } }),
    prisma.trip.count({
      where: { status: TripStatus.COMPLETED, completedAt: { gte: start, lte: end } },
    }),
    prisma.driver.count({
      where: busyIds.length ? { id: { notIn: busyIds }, status: { contains: "Rảnh" } } : { status: { contains: "Rảnh" } },
    }),
    prisma.driver.count({ where: busyIds.length ? { id: { in: busyIds } } : { id: -1 } }),
    prisma.trip.count({
      where: { driverRejectReason: { not: null }, status: { in: [TripStatus.COLLECTING, TripStatus.READY] } },
    }),
    prisma.booking.count({
      where: {
        OR: [
          { driverRideStatus: "WAITING_ADMIN_REVIEW" },
          { driverCargoStatus: "WAITING_ADMIN_REVIEW" },
          { status: { in: [BookingStatus.NO_SHOW, BookingStatus.CANCELLED] } },
        ],
      },
    }),
    prisma.trip.findMany({
      where: { departureAt: { gte: start, lte: end } },
      select: {
        totalCustomerAmount: true,
        adminCommission: true,
        driverDebtAmount: true,
        tripBookings: { include: { booking: { select: { type: true, finalTotal: true, paymentStatus: true } } } },
      },
    }),
    prisma.booking.findMany({
      where: { status: { in: [BookingStatus.NEW, BookingStatus.WAITING_DISPATCH] } },
      include: { route: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.user
      .findMany({ where: { role: { in: ["ADMIN", "DISPATCHER"] } }, select: { id: true } })
      .then((users) =>
        prisma.notification.findMany({
          where: { userId: { in: users.map((u) => u.id) } },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      ),
  ]);

  let revenueToday = 0;
  let passengerRevenue = 0;
  let cargoRevenue = 0;
  let collected = 0;
  let unpaid = 0;
  let driverDebt = 0;

  for (const t of todayTrips) {
    revenueToday += Number(t.totalCustomerAmount || 0);
    driverDebt += Number(t.driverDebtAmount || 0);
    for (const tb of t.tripBookings) {
      const b = tb.booking;
      const amt = Number(b.finalTotal || 0);
      if (b.type === "CARGO") cargoRevenue += amt;
      else passengerRevenue += amt;
      if (["CASH_COLLECTED", "TRANSFERRED", "ADMIN_COLLECTED"].includes(String(b.paymentStatus))) {
        collected += amt;
      } else {
        unpaid += amt;
      }
    }
  }

  return {
    operations: {
      newAwaitingConfirm: newBookings,
      waitingDispatch,
      adminReviewBookings,
      collectingTrips,
      inProgressTrips,
      completedTodayTrips,
      driversAvailable,
      driversOnTrip,
      driverRejectedTrips,
    },
    money: {
      revenueToday,
      passengerRevenue,
      cargoRevenue,
      collected,
      unpaid,
      driverDebt,
    },
    todo: {
      recentBookings,
      recentNotifications: recentAlerts,
    },
  };
}
