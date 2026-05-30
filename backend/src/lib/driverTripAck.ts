import { BookingStatus, BookingType, TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { assertDriverHasNoOtherBusyTrip, syncDriverIdleFromTrips } from "./dispatchDrivers.js";
import { assertDriverMatchesTrip } from "./dispatchApply.js";
import { bookingRemainingSeatUnits, bookingSeatUnits, tripBookingSeatUnits } from "./bookingSeats.js";
import { rollupBookingFinancialsPortion } from "./settlement.js";

/** Đơn admin vừa gán — tài xế chưa bấm đồng ý */
export function isPendingDriverAck(status: string) {
  return status === BookingStatus.ASSIGNED;
}

export async function countPendingAckOnTrip(tripId: number) {
  const links = await prisma.tripBooking.findMany({
    where: { tripId },
    include: { booking: { select: { status: true } } },
  });
  return links.filter((l) => isPendingDriverAck(l.booking.status)).length;
}

export function tripNeedsDriverAck(trip: { status: string }, pendingAckCount: number) {
  return trip.status === TripStatus.COLLECTING || pendingAckCount > 0;
}

export async function driverAcceptTrip(driverId: number, tripId: number) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId } });
  if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });

  await assertDriverMatchesTrip(driverId, tripId);
  await assertDriverHasNoOtherBusyTrip(driverId, tripId);

  const pendingIds = await pendingAckBookingIds(tripId);
  if (!pendingIds.length) {
    throw Object.assign(new Error("Không có khách mới cần xác nhận"), { statusCode: 400 });
  }

  const isFirstAccept = trip.status === TripStatus.COLLECTING;

  const result = await prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { id: { in: pendingIds } },
      data: { status: BookingStatus.DRIVER_ACCEPTED },
    });

    await tx.booking.updateMany({
      where: { id: { in: pendingIds }, type: { not: BookingType.CARGO } },
      data: { driverRideStatus: "WAITING_PICKUP" as any },
    });
    await tx.booking.updateMany({
      where: { id: { in: pendingIds }, type: BookingType.CARGO },
      data: { driverCargoStatus: "WAITING_PICKUP" as any },
    });

    if (isFirstAccept) {
      return tx.trip.update({ where: { id: tripId }, data: { status: TripStatus.READY } });
    }
    return tx.trip.findUnique({ where: { id: tripId } });
  });

  return {
    trip: result,
    acceptedBookingIds: pendingIds,
    isFirstAccept,
    message: isFirstAccept
      ? "Đã nhận chuyến."
      : `Đã đồng ý thêm ${pendingIds.length} khách/hàng vào chuyến.`,
  };
}

export async function driverRejectTrip(driverId: number, tripId: number, reason?: string) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId } });
  if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });

  const pendingIds = await pendingAckBookingIds(tripId);
  if (!pendingIds.length) {
    throw Object.assign(new Error("Không có khách mới để từ chối"), { statusCode: 400 });
  }

  const acceptedOnTrip = await prisma.booking.count({
    where: {
      tripBookings: { some: { tripId } },
      status: BookingStatus.DRIVER_ACCEPTED,
    },
  });

  if (trip.status === TripStatus.COLLECTING && acceptedOnTrip === 0) {
    return driverRejectWholeTrip(driverId, tripId, reason);
  }

  return driverRejectPendingBookings(tripId, pendingIds, reason);
}

async function pendingAckBookingIds(tripId: number) {
  const links = await prisma.tripBooking.findMany({
    where: { tripId },
    include: { booking: { select: { id: true, status: true } } },
  });
  return links.filter((l) => isPendingDriverAck(l.booking.status)).map((l) => l.bookingId);
}

async function driverRejectWholeTrip(driverId: number, tripId: number, reason?: string) {
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
      await tx.booking.updateMany({
        where: { id: { in: links.map((l) => l.bookingId) } },
        data: { status: BookingStatus.ASSIGNED },
      });
    }
    return updatedTrip;
  });
  await syncDriverIdleFromTrips(driverId);
  return {
    trip: result,
    rejectedBookingIds: [] as number[],
    wholeTrip: true,
    message: "Đã từ chối chuyến.",
  };
}

async function driverRejectPendingBookings(tripId: number, bookingIds: number[], reason?: string) {
  const result = await prisma.$transaction(async (tx) => {
    for (const bookingId of bookingIds) {
      const link = await tx.tripBooking.findFirst({ where: { tripId, bookingId } });
      if (!link) continue;
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking || !isPendingDriverAck(booking.status)) continue;

      const seats = tripBookingSeatUnits(link);
      const fin = rollupBookingFinancialsPortion(booking, seats, bookingSeatUnits(booking));

      await tx.tripBooking.delete({ where: { id: link.id } });
      await tx.trip.update({
        where: { id: tripId },
        data: {
          bookedSeats: { decrement: seats },
          availableSeats: { increment: seats },
          totalCustomerAmount: { decrement: fin.total },
          adminCommission: { decrement: fin.commission },
          driverNetAmount: { decrement: fin.driverAmount },
          driverDebtAmount: { decrement: fin.driverOwesAdmin },
          adminOwesDriverAmount: { decrement: fin.adminOwesDriver },
        },
      });

      const remainingLinks = await tx.tripBooking.count({ where: { bookingId } });
      if (!remainingLinks) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.WAITING_DISPATCH },
        });
      } else {
        const others = await tx.tripBooking.findMany({ where: { bookingId } });
        const left = bookingRemainingSeatUnits(booking, others);
        if (left > 0) {
          await tx.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.WAITING_DISPATCH },
          });
        }
      }

      if (reason?.trim()) {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            note: [booking.note, `[Tài xế từ chối] ${reason.trim()}`].filter(Boolean).join("\n"),
          },
        });
      }
    }

    return tx.trip.findUnique({ where: { id: tripId } });
  });

  return {
    trip: result,
    rejectedBookingIds: bookingIds,
    wholeTrip: false,
    message: `Đã từ chối ${bookingIds.length} khách/hàng admin vừa gán.`,
  };
}
