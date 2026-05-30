/** Gửi hàng / đi chợ: không nhập số hành khách */
export const SERVICES_WITHOUT_PASSENGERS = new Set(["CARGO", "MARKET"]);

export function usesPassengerCount(type?: string | null) {
  return !!type && !SERVICES_WITHOUT_PASSENGERS.has(type);
}

export function bookingSeatUnits(booking: { type?: string; passengerCount?: number | null }) {
  if (!usesPassengerCount(booking.type)) return 1;
  return Math.max(0, Number(booking.passengerCount || 0));
}

export function tripBookingSeatUnits(tb: {
  seatCount?: number | null;
  booking?: { type?: string; passengerCount?: number | null };
}) {
  if (tb.seatCount != null && Number(tb.seatCount) > 0) return Number(tb.seatCount);
  if (tb.booking) return bookingSeatUnits(tb.booking);
  return 1;
}

export function bookingRemainingSeatUnits(
  booking: { type?: string; passengerCount?: number | null; dispatchSeatRemaining?: number },
  tripBookings?: { seatCount?: number | null; booking?: { type?: string; passengerCount?: number | null } }[]
) {
  if (booking.dispatchSeatRemaining != null) return Math.max(0, Number(booking.dispatchSeatRemaining));
  const total = bookingSeatUnits(booking);
  if (!tripBookings?.length) return total;
  const assigned = tripBookings.reduce((s, tb) => s + tripBookingSeatUnits(tb), 0);
  return Math.max(0, total - assigned);
}

export function bookingCapacityLabel(booking: {
  type?: string;
  passengerCount?: number | null;
  dispatchSeatRemaining?: number;
  dispatchSeatTotal?: number;
}) {
  if (!usesPassengerCount(booking.type)) return "1 đơn";
  const total = booking.dispatchSeatTotal ?? Number(booking.passengerCount || 0);
  const remaining = booking.dispatchSeatRemaining ?? total;
  if (total > 0 && remaining > 0 && remaining < total) {
    return `${remaining}/${total} ghế còn gán`;
  }
  const n = Number(booking.passengerCount || 0);
  return n > 0 ? `${n} khách` : "—";
}

/** Nhãn số ghế / khối lượng / loại xe — dùng danh sách & chi tiết admin. */
export function adminBookingQuantityLabel(booking: {
  type?: string | null;
  passengerCount?: number | null;
  weightKg?: number | string | null;
  hasAccompanyingCargo?: boolean | null;
  vehicleType?: string | null;
}) {
  const type = booking.type || "";
  if (type === "CARGO") {
    const kg = Number(booking.weightKg || 0);
    return kg > 0 ? `${kg} kg` : "Hàng";
  }
  if (type === "MARKET") return "Đi chợ";
  if (usesPassengerCount(type)) {
    const n = Math.max(0, Number(booking.passengerCount || 0));
    const seats = n > 0 ? `${n} ghế` : "Chưa nhập ghế";
    return booking.hasAccompanyingCargo ? `${seats} + hàng kèm` : seats;
  }
  if (booking.vehicleType?.trim()) return booking.vehicleType.trim();
  return "—";
}

export function adminBookingSeatUnits(booking: { type?: string | null; passengerCount?: number | null }) {
  return bookingSeatUnits({ type: booking.type || undefined, passengerCount: booking.passengerCount });
}

/** Chia ghế gán lần này cho danh sách đơn đã chọn (theo thứ tự, tối đa tripAvail). */
export function computeAssignSeatCounts(
  bookings: { id: number; type?: string; passengerCount?: number | null; dispatchSeatRemaining?: number }[],
  tripAvail: number
) {
  const seatCounts: Record<number, number> = {};
  let left = Math.max(0, tripAvail);
  for (const b of bookings) {
    const remaining = bookingRemainingSeatUnits(b);
    const assign = Math.min(remaining, left);
    if (assign > 0) {
      seatCounts[b.id] = assign;
      left -= assign;
    }
  }
  return { seatCounts, total: Object.values(seatCounts).reduce((a, n) => a + n, 0) };
}
