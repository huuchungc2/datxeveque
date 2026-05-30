import { BookingStatus, TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { bookingRemainingSeatUnits, bookingSeatUnits, tripBookingSeatUnits } from "./bookingSeats.js";
import { notifyDispatchAssigned, safeNotify } from "./notifications.js";
import { rollupBookingFinancialsPortion } from "./settlement.js";

const ACTIVE_TRIP: TripStatus[] = [TripStatus.COLLECTING, TripStatus.READY, TripStatus.IN_PROGRESS];

export async function moveBookingBetweenTrips(
  bookingId: number,
  input: { fromTripId: number; toTripId: number; customerAgreed?: boolean; note?: string }
) {
  const fromTripId = Number(input.fromTripId);
  const toTripId = Number(input.toTripId);
  if (!fromTripId || !toTripId) throw Object.assign(new Error("Thiếu chuyến nguồn hoặc đích"), { statusCode: 400 });
  if (fromTripId === toTripId) throw Object.assign(new Error("Chuyến đích trùng chuyến nguồn"), { statusCode: 400 });
  if (input.customerAgreed === false) {
    throw Object.assign(new Error("Cần xác nhận khách đồng ý chuyển chuyến"), { statusCode: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const link = await tx.tripBooking.findFirst({ where: { bookingId, tripId: fromTripId } });
    if (!link) throw Object.assign(new Error("Đơn không thuộc chuyến nguồn"), { statusCode: 400 });

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw Object.assign(new Error("Không tìm thấy đơn"), { statusCode: 404 });
    if (booking.status === BookingStatus.COMPLETED) {
      throw Object.assign(new Error("Đơn đã hoàn thành, không chuyển được"), { statusCode: 400 });
    }

    const fromTrip = await tx.trip.findUnique({ where: { id: fromTripId } });
    const toTrip = await tx.trip.findUnique({ where: { id: toTripId } });
    if (!fromTrip || !toTrip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });
    if (!ACTIVE_TRIP.includes(toTrip.status)) {
      throw Object.assign(new Error("Chuyến đích không nhận thêm đơn"), { statusCode: 400 });
    }

    const seats = tripBookingSeatUnits(link);
    const fin = rollupBookingFinancialsPortion(booking, seats, bookingSeatUnits(booking));

    if (seats > 0 && Number(toTrip.availableSeats) < seats) {
      throw Object.assign(
        new Error(`Chuyến đích chỉ còn ${toTrip.availableSeats} ghế, cần ${seats}`),
        { statusCode: 400 }
      );
    }

    const dup = await tx.tripBooking.findFirst({ where: { bookingId, tripId: toTripId } });
    if (dup) throw Object.assign(new Error("Đơn đã có trong chuyến đích"), { statusCode: 400 });

    await tx.tripBooking.delete({ where: { id: link.id } });
    await tx.trip.update({
      where: { id: fromTripId },
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
      const left = bookingRemainingSeatUnits(
        booking,
        await tx.tripBooking.findMany({ where: { bookingId } })
      );
      if (left > 0) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.WAITING_DISPATCH },
        });
      }
    }

    await tx.tripBooking.create({ data: { tripId: toTripId, bookingId, seatCount: seats } });
    const updatedTo = await tx.trip.update({
      where: { id: toTripId },
      data: {
        bookedSeats: { increment: seats },
        availableSeats: { decrement: seats },
        totalCustomerAmount: { increment: fin.total },
        adminCommission: { increment: fin.commission },
        driverNetAmount: { increment: fin.driverAmount },
        driverDebtAmount: { increment: fin.driverOwesAdmin },
        adminOwesDriverAmount: { increment: fin.adminOwesDriver },
      },
      include: { route: { select: { name: true } }, driver: true },
    });

    if (input.note?.trim()) {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          note: [booking.note, `[Chuyển chuyến] ${input.note.trim()}`].filter(Boolean).join("\n"),
          status: BookingStatus.ASSIGNED,
        },
      });
    } else {
      await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.ASSIGNED } });
    }

    return { fromTripId, toTripId, toTrip: updatedTo, oldDriverId: fromTrip.driverId };
  });

  await safeNotify(() =>
    notifyDispatchAssigned({
      tripId: result.toTrip.id,
      tripCode: result.toTrip.code,
      bookingIds: [bookingId],
      driverId: result.toTrip.driverId,
      departureAt: result.toTrip.departureAt,
      routeName: result.toTrip.route?.name,
      isNewTrip: false,
    })
  );

  return {
    message: `Đã chuyển đơn sang chuyến ${result.toTrip.code}`,
    ...result,
  };
}
