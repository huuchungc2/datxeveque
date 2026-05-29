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
