import { BookingType } from "@prisma/client";

/** Gửi hàng / đi chợ: không có số hành khách trên đơn */
export const SERVICES_WITHOUT_PASSENGERS = new Set<BookingType | string>([
  BookingType.CARGO,
  BookingType.MARKET,
  "CARGO",
  "MARKET",
]);

export function usesPassengerCount(type?: string | BookingType | null) {
  return type != null && !SERVICES_WITHOUT_PASSENGERS.has(type);
}

/** Số chỗ chiếm khi gom chuyến (đơn hàng = 1 chỗ; xe khách = passengerCount) */
export function bookingSeatUnits(booking: { type?: string | BookingType | null; passengerCount?: number | null }) {
  if (!usesPassengerCount(booking.type)) return 1;
  return Math.max(0, Number(booking.passengerCount || 0));
}

export function resolvePassengerCountForSave(
  type: BookingType | string,
  raw?: number | string | null
) {
  if (!usesPassengerCount(type)) return 0;
  return Math.max(1, Number(raw || 1));
}

export function bookingCapacityLabel(booking: {
  type?: string | BookingType | null;
  passengerCount?: number | null;
}) {
  if (!usesPassengerCount(booking.type)) return "1 đơn";
  const n = Number(booking.passengerCount || 0);
  return n > 0 ? `${n} khách` : "—";
}
