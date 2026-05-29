import { BookingStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

export type BookingConfirmOutcome = "CONFIRMED" | "NO_CONTACT" | "CUSTOMER_CANCEL" | "WRONG_INFO";

const OUTCOME_STATUS: Record<BookingConfirmOutcome, BookingStatus> = {
  CONFIRMED: BookingStatus.WAITING_DISPATCH,
  NO_CONTACT: BookingStatus.CONTACTED,
  CUSTOMER_CANCEL: BookingStatus.CANCELLED,
  WRONG_INFO: BookingStatus.CANCELLED,
};

export async function confirmBookingAdmin(
  bookingId: number,
  body: { outcome: BookingConfirmOutcome; note?: string }
) {
  const outcome = body.outcome;
  if (!outcome || !OUTCOME_STATUS[outcome]) {
    throw Object.assign(new Error("Thiếu hoặc sai loại xác nhận"), { statusCode: 400 });
  }

  const existing = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!existing) throw Object.assign(new Error("Không tìm thấy đơn"), { statusCode: 404 });

  const notePrefix =
    outcome === "CONFIRMED"
      ? "[Admin xác nhận]"
      : outcome === "NO_CONTACT"
        ? "[Không liên hệ được]"
        : outcome === "CUSTOMER_CANCEL"
          ? "[Khách hủy]"
          : "[Sai thông tin]";
  const extra = body.note?.trim() ? ` ${body.note.trim()}` : "";
  const note = [existing.note, `${notePrefix}${extra}`].filter(Boolean).join("\n");

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: OUTCOME_STATUS[outcome], note },
    include: { route: true },
  });
}

export async function cancelBookingAdmin(bookingId: number, body: { reason?: string; note?: string }) {
  const existing = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!existing) throw Object.assign(new Error("Không tìm thấy đơn"), { statusCode: 404 });

  const prefix = body.reason?.trim() ? `[Hủy: ${body.reason.trim()}]` : "[Admin hủy đơn]";
  const extra = body.note?.trim() ? ` ${body.note.trim()}` : "";
  const note = [existing.note, `${prefix}${extra}`].filter(Boolean).join("\n");

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: BookingStatus.CANCELLED, note },
    include: { route: true },
  });
}
