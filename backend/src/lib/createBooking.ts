import { BookingStatus, BookingType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { generateCode } from "./codes.js";
import { calculatePrice } from "./pricing.js";
import { assertVnPhone } from "./phone.js";
import { notifyStaffNewBooking, safeNotify } from "./notifications.js";
import { resolvePassengerCountForSave } from "./bookingSeats.js";

const ROUTE_REQUIRED = new Set<BookingType>(["SHARED_RIDE", "PRIVATE_RIDE", "CARGO"]);

export type CreateBookingBody = {
  customerName?: string;
  customerPhone?: string;
  type?: BookingType | string;
  routeId?: number | null;
  direction?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  scheduledAt?: string | Date | null;
  passengerCount?: number;
  weightKg?: number;
  vehicleType?: string | null;
  cargoDescription?: string | null;
  marketDescription?: string | null;
  note?: string | null;
  status?: BookingStatus;
  paymentReceiver?: string;
  source?: string;
  finalTotal?: number;
  commissionAmount?: number;
};

export function validateCreateBookingBody(body: CreateBookingBody) {
  const type = body.type as BookingType;
  if (!type) throw Object.assign(new Error("Vui lòng chọn loại dịch vụ"), { statusCode: 400 });

  const routeId = body.routeId ? Number(body.routeId) : null;
  if (ROUTE_REQUIRED.has(type) && !routeId) {
    throw Object.assign(new Error("Vui lòng chọn tuyến"), { statusCode: 400 });
  }
  if (!body.customerName?.trim()) {
    throw Object.assign(new Error("Vui lòng nhập họ tên khách"), { statusCode: 400 });
  }
  const customerPhone = assertVnPhone(body.customerPhone || "");
  if (!body.scheduledAt) {
    throw Object.assign(new Error("Vui lòng chọn ngày giờ đi"), { statusCode: 400 });
  }
  const scheduledAt = new Date(body.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw Object.assign(new Error("Ngày giờ đi không hợp lệ"), { statusCode: 400 });
  }

  const passengerCount = resolvePassengerCountForSave(type, body.passengerCount);
  return { type, routeId, customerPhone, scheduledAt, passengerCount };
}

export async function createBookingRecord(body: CreateBookingBody) {
  const { type, routeId, customerPhone, scheduledAt, passengerCount } = validateCreateBookingBody(body);

  const price = await calculatePrice({
    type,
    routeId,
    passengerCount,
    weightKg: body.weightKg,
    vehicleType: body.vehicleType,
  });

  const finalTotal =
    body.finalTotal !== undefined ? Number(body.finalTotal) : Number(price.estimatedTotal || 0);
  const commissionAmount =
    body.commissionAmount !== undefined
      ? Number(body.commissionAmount)
      : Number(price.commissionAmount || 0);

  let customer = await prisma.customer.findFirst({ where: { phone: customerPhone } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: body.customerName!.trim(), phone: customerPhone },
    });
  } else if (body.customerName?.trim() && customer.name !== body.customerName.trim()) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name: body.customerName.trim() },
    });
  }

  const status = body.status && Object.values(BookingStatus).includes(body.status)
    ? body.status
    : BookingStatus.WAITING_DISPATCH;

  const data = {
    customerId: customer.id,
    customerName: body.customerName!.trim(),
    customerPhone,
    type,
    routeId,
    direction: body.direction || null,
    pickupAddress: body.pickupAddress || null,
    dropoffAddress: body.dropoffAddress || null,
    scheduledAt,
    passengerCount,
    vehicleType: body.vehicleType || null,
    cargoDescription: body.cargoDescription || null,
    marketDescription: body.marketDescription || null,
    note: body.note || null,
    status,
    estimatedTotal: finalTotal,
    finalTotal,
    commissionAmount,
    pricingSnapshotJson: JSON.stringify({
      at: body.source === "ADMIN" ? "ADMIN_CREATE" : "BOOKING",
      type,
      routeId,
      passengerCount,
      paymentReceiver: body.paymentReceiver || "DRIVER",
      price,
    }),
    paymentReceiver: body.paymentReceiver || "DRIVER",
    source: body.source || "WEBSITE",
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const booking = await prisma.booking.create({
        include: { route: true },
        data: { code: generateCode("DX"), ...data },
      });
      void safeNotify(() => notifyStaffNewBooking(booking));
      return booking;
    } catch (err: any) {
      if (String(err?.code) !== "P2002" || attempt === 4) throw err;
    }
  }
  throw new Error("Không tạo được mã đơn");
}
