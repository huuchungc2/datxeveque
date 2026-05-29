import { BookingStatus, BookingType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { generateCode } from "./codes.js";
import { calculatePrice } from "./pricing.js";
import { assertVnPhone } from "./phone.js";
import { notifyStaffNewBooking, safeNotify } from "./notifications.js";
import { resolvePassengerCountForSave, usesPassengerCount } from "./bookingSeats.js";
import { isZonedDateBeforeToday, parseScheduledAtInput, todayZonedDateValue, toWallClockIso } from "./datetime.js";

const ROUTE_REQUIRED = new Set<BookingType>(["SHARED_RIDE", "PRIVATE_RIDE", "CARGO", "MARKET"]);

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
  cargoReceiverName?: string | null;
  cargoReceiverPhone?: string | null;
  parcelDropoffAddress?: string | null;
  hasAccompanyingCargo?: boolean;
  marketDescription?: string | null;
  note?: string | null;
  status?: BookingStatus;
  paymentReceiver?: string;
  source?: string;
  finalTotal?: number;
  commissionAmount?: number;
  /** Gắn đơn với tài khoản khách đang đăng nhập (tuỳ chọn). */
  loggedInUserId?: number;
};

/** Tìm hoặc tạo bản ghi khách; ưu tiên liên kết userId khi đã đăng nhập. */
export async function resolveCustomerForBooking(
  customerPhone: string,
  customerName: string,
  loggedInUserId?: number
) {
  if (loggedInUserId) {
    const byUser = await prisma.customer.findFirst({ where: { userId: loggedInUserId } });
    if (byUser) {
      if (customerName && byUser.name !== customerName) {
        return prisma.customer.update({
          where: { id: byUser.id },
          data: { name: customerName, phone: customerPhone },
        });
      }
      if (byUser.phone !== customerPhone) {
        return prisma.customer.update({
          where: { id: byUser.id },
          data: { phone: customerPhone },
        });
      }
      return byUser;
    }
    const byPhone = await prisma.customer.findFirst({ where: { phone: customerPhone } });
    if (byPhone && !byPhone.userId) {
      return prisma.customer.update({
        where: { id: byPhone.id },
        data: { userId: loggedInUserId, name: customerName },
      });
    }
    if (byPhone) return byPhone;
    return prisma.customer.create({
      data: { userId: loggedInUserId, name: customerName, phone: customerPhone },
    });
  }

  let customer = await prisma.customer.findFirst({ where: { phone: customerPhone } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: customerName, phone: customerPhone },
    });
  } else if (customerName && customer.name !== customerName) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name: customerName },
    });
  }
  return customer;
}

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
  const scheduledAt = parseScheduledAtInput(body.scheduledAt);
  const chosenDay = toWallClockIso(scheduledAt).slice(0, 10);
  if (isZonedDateBeforeToday(chosenDay)) {
    throw Object.assign(
      new Error("Ngày đi không được là ngày trong quá khứ."),
      { statusCode: 400 }
    );
  }
  if (chosenDay === todayZonedDateValue() && scheduledAt.getTime() < Date.now() + 60 * 60 * 1000 - 60_000) {
    throw Object.assign(
      new Error("Giờ đi hôm nay phải sau giờ hiện tại ít nhất 1 giờ."),
      { statusCode: 400 }
    );
  }
  const passengerCount = resolvePassengerCountForSave(type, body.passengerCount);

  if (type === BookingType.CARGO) {
    if (!body.cargoReceiverName?.trim()) {
      throw Object.assign(new Error("Vui lòng nhập tên người nhận"), { statusCode: 400 });
    }
    try {
      assertVnPhone(body.cargoReceiverPhone || "");
    } catch {
      throw Object.assign(new Error("Vui lòng nhập số điện thoại người nhận hợp lệ"), { statusCode: 400 });
    }
    if (!body.cargoDescription?.trim()) {
      throw Object.assign(new Error("Vui lòng mô tả hàng gửi"), { statusCode: 400 });
    }
  }

  if (type === BookingType.MARKET) {
    if (!body.marketDescription?.trim()) {
      throw Object.assign(new Error("Vui lòng mô tả đồ cần mua"), { statusCode: 400 });
    }
    if (!body.cargoReceiverName?.trim()) {
      throw Object.assign(new Error("Vui lòng nhập tên người nhận"), { statusCode: 400 });
    }
    try {
      assertVnPhone(body.cargoReceiverPhone || "");
    } catch {
      throw Object.assign(new Error("Vui lòng nhập số điện thoại người nhận hợp lệ"), { statusCode: 400 });
    }
  }

  if (body.hasAccompanyingCargo && usesPassengerCount(type)) {
    if (!body.cargoDescription?.trim()) {
      throw Object.assign(new Error("Vui lòng mô tả hàng đi kèm"), { statusCode: 400 });
    }
  }

  return { type, routeId, customerPhone, scheduledAt, passengerCount };
}

export async function createBookingRecord(body: CreateBookingBody) {
  const { type, routeId, customerPhone, scheduledAt, passengerCount } = validateCreateBookingBody(body);

  if (routeId && body.source !== "ADMIN") {
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
      throw Object.assign(new Error("Tuyến không tồn tại"), { statusCode: 400 });
    }
    if (route.locked) {
      throw Object.assign(new Error("Tuyến này đã bị khóa, không nhận đặt mới."), { statusCode: 400 });
    }
  }

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

  const customer = await resolveCustomerForBooking(
    customerPhone,
    body.customerName!.trim(),
    body.loggedInUserId
  );

  let direction = body.direction?.trim() || null;
  if (routeId && !direction) {
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (route?.direction) direction = route.direction;
  }

  const status =
    body.status && Object.values(BookingStatus).includes(body.status)
      ? body.status
      : body.source === "ADMIN"
        ? BookingStatus.WAITING_DISPATCH
        : BookingStatus.NEW;

  const data = {
    customerId: customer.id,
    customerName: body.customerName!.trim(),
    customerPhone,
    type,
    routeId,
    direction,
    pickupAddress: body.pickupAddress || null,
    dropoffAddress: body.dropoffAddress || null,
    scheduledAt,
    passengerCount,
    vehicleType: body.vehicleType || null,
    cargoDescription: body.cargoDescription || null,
    cargoReceiverName: body.cargoReceiverName?.trim() || null,
    cargoReceiverPhone: body.cargoReceiverPhone
      ? assertVnPhone(body.cargoReceiverPhone)
      : null,
    parcelDropoffAddress: body.parcelDropoffAddress?.trim() || null,
    hasAccompanyingCargo: Boolean(body.hasAccompanyingCargo && usesPassengerCount(type)),
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
