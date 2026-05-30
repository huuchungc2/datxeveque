import { BookingStatus, BookingType, SettlementStatus, TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { inferRunDirection, driverStateAfterComplete } from "./routeEndpoints.js";
import {
  assumedPaymentStatusAfterTripComplete,
  rollupBookingFinancials,
  rollupBookingFinancialsPortion,
} from "./settlement.js";
import { bookingSeatUnits, tripBookingSeatUnits } from "./bookingSeats.js";

export type CompleteTripOptions = {
  completedBy: "ADMIN" | "DRIVER";
  userId?: number | null;
  /** Tài xế chốt chuyến: tự gán «Đã trả»/«Đã giao» cho vé chưa cập nhật (không cần thu tiền từng vé) */
  finalizeIncomplete?: boolean;
};

type CompletionBlocker = { bookingId: number; code: string; type: string; status: string | null };

const PASSENGER_TERMINAL = new Set([
  "DROPPED_OFF",
  "CANCELLED_BY_ADMIN",
  "WAITING_REDISPATCH",
  "CUSTOMER_CANCELLED",
]);
const CARGO_TERMINAL = new Set([
  "DELIVERED",
  "PARCEL_CANCELLED",
  "FAILED_PICKUP",
  "FAILED_DELIVERY",
  "WAITING_ADMIN_REVIEW",
]);

export function checkTripCompletionEligibility(bookings: any[]) {
  const passengers = bookings.filter((b) => String(b.type) !== "CARGO");
  const parcels = bookings.filter((b) => String(b.type) === "CARGO");

  const passengerTerminal = PASSENGER_TERMINAL;
  const cargoTerminal = CARGO_TERMINAL;

  const passengerBlockers: CompletionBlocker[] = [];
  const cargoBlockers: CompletionBlocker[] = [];

  for (const b of passengers) {
    const st = b.driverRideStatus ?? null;
    if (!st || !passengerTerminal.has(String(st))) {
      passengerBlockers.push({ bookingId: b.id, code: b.code, type: String(b.type), status: st ? String(st) : null });
    }
  }

  for (const b of parcels) {
    const st = b.driverCargoStatus ?? null;
    if (!st || !cargoTerminal.has(String(st))) {
      cargoBlockers.push({ bookingId: b.id, code: b.code, type: String(b.type), status: st ? String(st) : null });
    }
  }

  const canComplete = passengerBlockers.length === 0 && cargoBlockers.length === 0;
  const message = canComplete
    ? "OK"
    : `Chưa thể hoàn thành chuyến vì còn ${passengerBlockers.length} khách và ${cargoBlockers.length} đơn hàng chưa ở trạng thái kết thúc. Vui lòng cập nhật trạng thái từng khách/đơn hoặc chờ admin xử lý.`;

  return { canComplete, message, passengerBlockers, cargoBlockers };
}

/** Trước khi tài xế chốt chuyến — coi vé đang chạy là đã trả/giao (báo cáo theo giá vé, không cần thu tiền từng vé) */
async function finalizeIncompleteBookingsForDriver(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  bookings: any[]
) {
  for (const b of bookings) {
    if (b.status === BookingStatus.CANCELLED) continue;
    if (b.status === BookingStatus.ASSIGNED) {
      throw Object.assign(
        new Error("Còn đơn chờ bạn xác nhận nhận chuyến. Vui lòng Đồng ý hoặc Từ chối trước khi hoàn thành."),
        { statusCode: 400 }
      );
    }
    if (String(b.type) === String(BookingType.CARGO)) {
      const st = b.driverCargoStatus ?? null;
      if (!st || !CARGO_TERMINAL.has(String(st))) {
        await tx.booking.update({
          where: { id: b.id },
          data: { driverCargoStatus: "DELIVERED" as any },
        });
        b.driverCargoStatus = "DELIVERED";
      }
    } else {
      const st = b.driverRideStatus ?? null;
      if (!st || !PASSENGER_TERMINAL.has(String(st))) {
        await tx.booking.update({
          where: { id: b.id },
          data: { driverRideStatus: "DROPPED_OFF" as any },
        });
        b.driverRideStatus = "DROPPED_OFF";
      }
    }
  }
}

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

    const finalizeIncomplete =
      opts.finalizeIncomplete ?? opts.completedBy === "DRIVER";
    if (finalizeIncomplete) {
      await finalizeIncompleteBookingsForDriver(tx, bookings);
    }

    const eligibility = checkTripCompletionEligibility(bookings);
    if (!eligibility.canComplete) {
      const err: any = new Error(eligibility.message);
      err.statusCode = 400;
      err.details = {
        passengerBlockers: eligibility.passengerBlockers,
        cargoBlockers: eligibility.cargoBlockers,
      };
      throw err;
    }

    const fin = trip.tripBookings.reduce(
      (acc, tb) => {
        const seats = tripBookingSeatUnits(tb);
        const portion = rollupBookingFinancialsPortion(tb.booking, seats, bookingSeatUnits(tb.booking));
        acc.total += portion.total;
        acc.commission += portion.commission;
        acc.driverAmount += portion.driverAmount;
        acc.driverOwesAdmin += portion.driverOwesAdmin;
        acc.adminOwesDriver += portion.adminOwesDriver;
        return acc;
      },
      { total: 0, commission: 0, driverAmount: 0, driverOwesAdmin: 0, adminOwesDriver: 0 }
    );
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

    for (const b of bookings) {
      if (b.status === BookingStatus.CANCELLED) continue;
      const nextPayment = assumedPaymentStatusAfterTripComplete(b);
      const paymentPatch =
        String(b.paymentStatus || "UNPAID") === "UNPAID"
          ? {
              paymentStatus: nextPayment as any,
              paymentCollectedAt: completedAt,
              paymentCollectedByUserId: opts.userId ?? null,
            }
          : {};
      await tx.booking.update({
        where: { id: b.id },
        data: { status: BookingStatus.COMPLETED, ...paymentPatch },
      });
    }

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

/** Khi mọi khách đã trả / hàng đã giao — tự chốt chuyến (tài xế không cần bấm thêm nếu đủ điều kiện) */
export async function tryAutoCompleteTrip(tripId: number, opts: CompleteTripOptions) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { tripBookings: { include: { booking: true } } },
  });
  if (!trip || trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
    return { autoCompleted: false as const };
  }

  const bookings = trip.tripBookings.map((tb) => tb.booking);
  const eligibility = checkTripCompletionEligibility(bookings);
  if (!eligibility.canComplete) return { autoCompleted: false as const };

  try {
    const result = await completeTrip(tripId, opts);
    return { autoCompleted: true as const, ...result };
  } catch {
    return { autoCompleted: false as const };
  }
}
