/** Gửi hàng / đi chợ: không nhập số hành khách */
export const SERVICES_WITHOUT_PASSENGERS = new Set(["CARGO", "MARKET"]);

export function usesPassengerCount(type?: string | null) {
  return !!type && !SERVICES_WITHOUT_PASSENGERS.has(type);
}

export function bookingSeatUnits(booking: { type?: string; passengerCount?: number | null }) {
  if (!usesPassengerCount(booking.type)) return 1;
  return Math.max(0, Number(booking.passengerCount || 0));
}

export function bookingCapacityLabel(booking: { type?: string; passengerCount?: number | null }) {
  if (!usesPassengerCount(booking.type)) return "1 đơn";
  const n = Number(booking.passengerCount || 0);
  return n > 0 ? `${n} khách` : "—";
}
