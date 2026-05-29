import { BookingStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { assertVnPhone } from "./phone.js";
import { notifyStaffBookingRequest, safeNotify } from "./notifications.js";

/** Trước khi gán chuyến — khách được gửi yêu cầu sửa/hủy qua web */
const CUSTOMER_SELF_SERVICE_STATUSES: BookingStatus[] = [
  BookingStatus.NEW,
  BookingStatus.CONTACTED,
  BookingStatus.QUOTED,
  BookingStatus.WAITING_DEPOSIT,
  BookingStatus.DEPOSITED,
  BookingStatus.WAITING_DISPATCH,
];

export function canCustomerRequestChange(status: BookingStatus) {
  return CUSTOMER_SELF_SERVICE_STATUSES.includes(status);
}

async function findBookingForGuest(code: string, phone: string) {
  const customerPhone = assertVnPhone(phone);
  const booking = await prisma.booking.findFirst({
    where: { code: code.trim(), customerPhone },
    include: { route: true },
  });
  if (!booking) {
    throw Object.assign(new Error("Không tìm thấy đơn hoặc số điện thoại không đúng."), { statusCode: 404 });
  }
  return booking;
}

async function findBookingForCustomer(bookingId: number, userId: number) {
  const customer = await prisma.customer.findFirst({ where: { userId } });
  if (!customer) {
    throw Object.assign(new Error("Không tìm thấy tài khoản khách."), { statusCode: 404 });
  }
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId: customer.id },
    include: { route: true },
  });
  if (!booking) {
    throw Object.assign(new Error("Không tìm thấy đơn."), { statusCode: 404 });
  }
  return booking;
}

export async function resolveBookingForCustomerRequest(
  bookingId: number,
  body: { code?: string; phone?: string },
  userId?: number
) {
  if (userId) return findBookingForCustomer(bookingId, userId);
  if (!body.code?.trim() || !body.phone?.trim()) {
    throw Object.assign(new Error("Vui lòng nhập mã đơn và số điện thoại."), { statusCode: 400 });
  }
  const booking = await findBookingForGuest(body.code, body.phone);
  if (booking.id !== bookingId) {
    throw Object.assign(new Error("Mã đơn không khớp."), { statusCode: 400 });
  }
  return booking;
}

export async function submitCustomerChangeRequest(
  bookingId: number,
  body: { code?: string; phone?: string; message?: string },
  userId?: number
) {
  const booking = await resolveBookingForCustomerRequest(bookingId, body, userId);
  if (!canCustomerRequestChange(booking.status)) {
    throw Object.assign(
      new Error("Đơn đã được điều phối. Vui lòng gọi hotline/Zalo để được hỗ trợ sửa đơn."),
      { statusCode: 403, code: "DISPATCH_LOCKED" }
    );
  }
  const msg = (body.message || "").trim() || "Khách gửi yêu cầu sửa qua website.";
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const line = `[YC_SUA ${stamp}] ${msg}`;
  const note = booking.note ? `${booking.note}\n${line}` : line;
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { note },
    include: { route: true },
  });
  await safeNotify(() => notifyStaffBookingRequest(updated, "change", msg));
  return { ok: true, message: "Đã gửi yêu cầu sửa đơn. Nhân viên sẽ liên hệ bạn." };
}

export async function submitCustomerCancelRequest(
  bookingId: number,
  body: { code?: string; phone?: string; reason?: string },
  userId?: number
) {
  const booking = await resolveBookingForCustomerRequest(bookingId, body, userId);
  if (!canCustomerRequestChange(booking.status)) {
    throw Object.assign(
      new Error("Đơn đã được điều phối. Vui lòng gọi hotline/Zalo để được hỗ trợ hủy đơn."),
      { statusCode: 403, code: "DISPATCH_LOCKED" }
    );
  }
  const msg = (body.reason || "").trim() || "Khách gửi yêu cầu hủy qua website.";
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const line = `[YC_HUY ${stamp}] ${msg}`;
  const note = booking.note ? `${booking.note}\n${line}` : line;
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { note },
    include: { route: true },
  });
  await safeNotify(() => notifyStaffBookingRequest(updated, "cancel", msg));
  return { ok: true, message: "Đã gửi yêu cầu hủy đơn. Nhân viên sẽ liên hệ xác nhận." };
}
