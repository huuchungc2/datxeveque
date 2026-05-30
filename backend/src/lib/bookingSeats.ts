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

/** Số chỗ trên đơn (gửi hàng/đi chợ = 1 đơn = 1 chỗ logic) */
export function bookingSeatUnits(booking: { type?: string | BookingType | null; passengerCount?: number | null }) {
  if (!usesPassengerCount(booking.type)) return 1;
  return Math.max(0, Number(booking.passengerCount || 0));
}

export function tripBookingSeatUnits(tb: {
  seatCount?: number | null;
  booking?: { type?: string | BookingType | null; passengerCount?: number | null } | null;
}) {
  if (tb.seatCount != null && Number(tb.seatCount) > 0) return Number(tb.seatCount);
  if (tb.booking) return bookingSeatUnits(tb.booking);
  return 1;
}

export function bookingAssignedSeatUnits(
  booking: { type?: string | BookingType | null; passengerCount?: number | null },
  tripBookings?: { seatCount?: number | null; booking?: { type?: string | BookingType | null; passengerCount?: number | null } | null }[]
) {
  const links = tripBookings || [];
  if (!links.length) return 0;
  return links.reduce((s, tb) => s + tripBookingSeatUnits(tb), 0);
}

export function bookingRemainingSeatUnits(
  booking: { type?: string | BookingType | null; passengerCount?: number | null },
  tripBookings?: { seatCount?: number | null; booking?: { type?: string | BookingType | null; passengerCount?: number | null } | null }[]
) {
  return Math.max(0, bookingSeatUnits(booking) - bookingAssignedSeatUnits(booking, tripBookings));
}

export function bookingFullyAssigned(
  booking: { type?: string | BookingType | null; passengerCount?: number | null },
  tripBookings?: { seatCount?: number | null; booking?: { type?: string | BookingType | null; passengerCount?: number | null } | null }[]
) {
  return bookingRemainingSeatUnits(booking, tripBookings) <= 0;
}

/** Đơn còn ghế cần điều phối (kể cả đã gán một phần) */
export function bookingNeedsDispatch(
  booking: {
    type?: string | BookingType | null;
    passengerCount?: number | null;
    status?: string;
    tripBookings?: { seatCount?: number | null; booking?: { type?: string | BookingType | null; passengerCount?: number | null } | null }[];
  },
  unassignedStatuses: string[]
) {
  if (!unassignedStatuses.includes(String(booking.status || ""))) return false;
  return !bookingFullyAssigned(booking, booking.tripBookings);
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
  if (!usesPassengerCount(booking.type)) return "Gửi hàng";
  const n = Number(booking.passengerCount || 0);
  return n > 0 ? `${n} khách` : "—";
}
