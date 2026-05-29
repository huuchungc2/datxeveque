import { BookingStatus, BookingType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { updateBookingMoney } from "./bookingFinance.js";
import { assertVnPhone } from "./phone.js";
import { createBookingRecord, type CreateBookingBody } from "./createBooking.js";
import { parseScheduledAtInput } from "./datetime.js";

export async function patchBookingAdmin(id: number, body: Record<string, unknown>) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error("Không tìm thấy đơn"), { statusCode: 404 });

  const scalar: Record<string, unknown> = {};
  if (body.customerName !== undefined) scalar.customerName = String(body.customerName).trim();
  if (body.customerPhone !== undefined) scalar.customerPhone = assertVnPhone(String(body.customerPhone));
  if (body.pickupAddress !== undefined) scalar.pickupAddress = body.pickupAddress || null;
  if (body.dropoffAddress !== undefined) scalar.dropoffAddress = body.dropoffAddress || null;
  if (body.direction !== undefined) scalar.direction = body.direction || null;
  if (body.note !== undefined) scalar.note = body.note || null;
  if (body.vehicleType !== undefined) scalar.vehicleType = body.vehicleType || null;
  if (body.cargoDescription !== undefined) scalar.cargoDescription = body.cargoDescription || null;
  if (body.marketDescription !== undefined) scalar.marketDescription = body.marketDescription || null;
  if (body.status !== undefined && Object.values(BookingStatus).includes(body.status as BookingStatus)) {
    scalar.status = body.status;
  }
  if (body.scheduledAt !== undefined) {
    scalar.scheduledAt = body.scheduledAt ? parseScheduledAtInput(String(body.scheduledAt)) : null;
  }

  const moneyFields =
    body.finalTotal !== undefined ||
    body.commissionAmount !== undefined ||
    body.recalcFromRules ||
    body.routeId !== undefined ||
    body.type ||
    body.passengerCount !== undefined ||
    body.paymentReceiver !== undefined;

  if (moneyFields) {
    await updateBookingMoney(id, {
      finalTotal: body.finalTotal as number | undefined,
      commissionAmount: body.commissionAmount as number | undefined,
      passengerCount: body.passengerCount as number | undefined,
      routeId:
        body.routeId !== undefined ? (body.routeId ? Number(body.routeId) : null) : undefined,
      type: body.type as BookingType | undefined,
      paymentReceiver: body.paymentReceiver as string | undefined,
      recalcFromRules: Boolean(body.recalcFromRules),
    });
  }

  if (Object.keys(scalar).length) {
    await prisma.booking.update({ where: { id }, data: scalar });
  }

  const full = await prisma.booking.findUnique({ where: { id }, include: { route: true } });
  if (!full) throw Object.assign(new Error("Không tìm thấy đơn"), { statusCode: 404 });
  return full;
}

export async function adminCreateBooking(body: CreateBookingBody) {
  return createBookingRecord({ ...body, source: "ADMIN" });
}
