import { BookingType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { calculatePrice } from "./pricing.js";
import { sumBookingRollups } from "./settlement.js";
import { bookingSeatUnits, resolvePassengerCountForSave, usesPassengerCount } from "./bookingSeats.js";

export async function syncTripFinancials(tripId: number) {
  const links = await prisma.tripBooking.findMany({ where: { tripId }, include: { booking: true } });
  const bookings = links.map((l) => l.booking);
  const seats = bookings.reduce((s, b) => s + bookingSeatUnits(b), 0);
  const fin = sumBookingRollups(bookings);

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });

  return prisma.trip.update({
    where: { id: tripId },
    data: {
      bookedSeats: seats,
      availableSeats: Math.max(0, Number(trip.totalSeats) - seats),
      totalCustomerAmount: fin.total,
      adminCommission: fin.commission,
      driverNetAmount: fin.driverAmount,
      driverDebtAmount: fin.driverOwesAdmin,
      adminOwesDriverAmount: fin.adminOwesDriver,
    },
  });
}

export async function updateBookingMoney(
  bookingId: number,
  body: {
    finalTotal?: number;
    commissionAmount?: number;
    passengerCount?: number;
    routeId?: number | null;
    type?: BookingType;
    paymentReceiver?: string;
    recalcFromRules?: boolean;
  }
) {
  const existing = await prisma.booking.findUnique({ where: { id: bookingId }, include: { route: true } });
  if (!existing) throw Object.assign(new Error("Không tìm thấy đơn"), { statusCode: 404 });

  const type = (body.type || existing.type) as BookingType;
  const routeId = body.routeId !== undefined ? body.routeId : existing.routeId;
  const passengerCount = !usesPassengerCount(type)
    ? 0
    : body.passengerCount !== undefined
      ? resolvePassengerCountForSave(type, body.passengerCount)
      : Math.max(1, Number(existing.passengerCount || 1));

  let finalTotal = body.finalTotal !== undefined ? Number(body.finalTotal) : Number(existing.finalTotal);
  let commissionAmount =
    body.commissionAmount !== undefined ? Number(body.commissionAmount) : Number(existing.commissionAmount);

  if (body.recalcFromRules || body.routeId !== undefined || body.type || body.passengerCount !== undefined) {
    const price = await calculatePrice({ type, routeId, passengerCount });
    if (body.finalTotal === undefined) finalTotal = Number(price.estimatedTotal || 0);
    if (body.commissionAmount === undefined) commissionAmount = Number(price.commissionAmount || 0);
  }

  const snapshot = {
    at: "ADMIN_EDIT",
    finalTotal,
    commissionAmount,
    passengerCount,
    routeId,
    type,
    paymentReceiver: body.paymentReceiver ?? existing.paymentReceiver,
    previous: {
      finalTotal: Number(existing.finalTotal),
      commissionAmount: Number(existing.commissionAmount),
    },
    editedAt: new Date().toISOString(),
  };

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      ...(body.type ? { type } : {}),
      ...(body.routeId !== undefined ? { routeId } : {}),
      ...(body.passengerCount !== undefined ? { passengerCount } : {}),
      ...(body.paymentReceiver ? { paymentReceiver: body.paymentReceiver } : {}),
      finalTotal,
      estimatedTotal: finalTotal,
      commissionAmount,
      pricingSnapshotJson: JSON.stringify(snapshot),
    },
    include: { route: true },
  });

  const link = await prisma.tripBooking.findFirst({ where: { bookingId } });
  if (link) await syncTripFinancials(link.tripId);

  return booking;
}
