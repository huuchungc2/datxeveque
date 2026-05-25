import { BookingStatus, SettlementStatus, TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { inferRunDirection, driverStateAfterComplete } from "./routeEndpoints.js";
import { rollupBookingFinancials, sumBookingRollups } from "./settlement.js";

export type CompleteTripOptions = {
  completedBy: "ADMIN" | "DRIVER";
  userId?: number | null;
};

function bookingSnapshotRow(booking: any) {
  const fin = rollupBookingFinancials(booking);
  let parsedSnapshot: unknown = null;
  if (booking.pricingSnapshotJson) {
    try {
      parsedSnapshot = JSON.parse(booking.pricingSnapshotJson);
    } catch {
      parsedSnapshot = null;
    }
  }
  return {
    bookingId: booking.id,
    code: booking.code,
    type: booking.type,
    passengerCount: booking.passengerCount,
    paymentReceiver: booking.paymentReceiver,
    estimatedTotal: Number(booking.estimatedTotal ?? 0),
    finalTotal: Number(booking.finalTotal ?? 0),
    commissionAmount: Number(booking.commissionAmount ?? 0),
    pricingSnapshotAtBooking: parsedSnapshot,
    financials: fin,
  };
}

export async function completeTrip(tripId: number, opts: CompleteTripOptions) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: {
        route: true,
        driver: { include: { vehicles: true } },
        vehicle: true,
        tripBookings: { include: { booking: true } },
      },
    });

    if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });
    if (trip.status === TripStatus.COMPLETED) {
      return { trip, message: "Chuyến đã hoàn thành trước đó", alreadyCompleted: true };
    }
    if (trip.status === TripStatus.CANCELLED) {
      throw Object.assign(new Error("Chuyến đã hủy, không thể hoàn thành"), { statusCode: 400 });
    }

    const bookings = trip.tripBookings.map((tb) => tb.booking);
    if (!bookings.length) {
      throw Object.assign(new Error("Chuyến chưa có đơn, không thể chốt hoa hồng"), { statusCode: 400 });
    }

    const fin = sumBookingRollups(bookings);
    const first = bookings[0];
    const runDirection = inferRunDirection({
      pickupAddress: first.pickupAddress,
      dropoffAddress: first.dropoffAddress,
      direction: first.direction,
      routeFromName: trip.route.fromName,
      routeToName: trip.route.toName,
      routeDirection: trip.route.direction,
    });

    const completedAt = new Date();
    const snapshotPayload = {
      event: "TRIP_COMPLETED",
      tripId: trip.id,
      tripCode: trip.code,
      routeId: trip.routeId,
      routeName: trip.route.name,
      runDirection,
      completedAt: completedAt.toISOString(),
      completedBy: opts.completedBy,
      userId: opts.userId ?? null,
      totals: fin,
      bookings: bookings.map(bookingSnapshotRow),
    };

    await tx.tripFinancialSnapshot.create({
      data: {
        tripId: trip.id,
        eventType: "COMPLETED",
        snapshotJson: JSON.stringify(snapshotPayload),
        completedBy: opts.completedBy,
        userId: opts.userId ?? null,
      },
    });

    const updatedTrip = await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: TripStatus.COMPLETED,
        completedAt,
        totalCustomerAmount: fin.total,
        adminCommission: fin.commission,
        driverNetAmount: fin.driverAmount,
        driverDebtAmount: fin.driverOwesAdmin,
        adminOwesDriverAmount: fin.adminOwesDriver,
        settlementStatus: SettlementStatus.PENDING,
      },
      include: { route: true, driver: true, vehicle: true },
    });

    await tx.booking.updateMany({
      where: { id: { in: bookings.map((b) => b.id) } },
      data: { status: BookingStatus.COMPLETED },
    });

    if (trip.driverId) {
      const vehicleSeats = Number(trip.vehicle?.seats || trip.driver?.vehicles?.[0]?.seats || trip.totalSeats || 0);
      const after = driverStateAfterComplete(runDirection, Math.max(vehicleSeats, 1));
      await tx.driver.update({
        where: { id: trip.driverId },
        data: after,
      });
    }

    return {
      trip: updatedTrip,
      snapshot: snapshotPayload,
      message: `Đã hoàn thành chuyến ${trip.code}. Hoa hồng ${fin.commission.toLocaleString("vi-VN")}đ đã chốt theo snapshot.`,
      alreadyCompleted: false,
    };
  });
}
