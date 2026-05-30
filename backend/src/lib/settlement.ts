/** Tài chính booking/chuyến theo spec 08 — payment_receiver */

export type BookingMoney = {
  finalTotal?: unknown;
  estimatedTotal?: unknown;
  commissionAmount?: unknown;
  paymentReceiver?: string | null;
};

export function rollupBookingFinancials(booking: BookingMoney) {
  const total = Number(booking.finalTotal ?? booking.estimatedTotal ?? 0);
  const commission = Number(booking.commissionAmount ?? 0);
  const driverAmount = Math.max(0, total - commission);
  const receiver = String(booking.paymentReceiver || "DRIVER").toUpperCase();
  const customerPaysAdmin = receiver === "ADMIN" || receiver === "CUSTOMER_PAYS_ADMIN";

  return {
    total,
    commission,
    driverAmount,
    driverOwesAdmin: customerPaysAdmin ? 0 : commission,
    adminOwesDriver: customerPaysAdmin ? driverAmount : 0,
  };
}

export function sumBookingRollups(bookings: BookingMoney[]) {
  return bookings.reduce(
    (acc, b) => {
      const f = rollupBookingFinancials(b);
      acc.total += f.total;
      acc.commission += f.commission;
      acc.driverAmount += f.driverAmount;
      acc.driverOwesAdmin += f.driverOwesAdmin;
      acc.adminOwesDriver += f.adminOwesDriver;
      return acc;
    },
    { total: 0, commission: 0, driverAmount: 0, driverOwesAdmin: 0, adminOwesDriver: 0 }
  );
}

/** Chia tiền/HH theo số ghế gán trên chuyến (đơn tách nhiều chuyến) */
export function rollupBookingFinancialsPortion(booking: BookingMoney, seatCount: number, bookingTotalSeats: number) {
  const full = rollupBookingFinancials(booking);
  if (bookingTotalSeats <= 0 || seatCount >= bookingTotalSeats) return full;
  const ratio = Math.max(0, Math.min(1, seatCount / bookingTotalSeats));
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    total: round(full.total * ratio),
    commission: round(full.commission * ratio),
    driverAmount: round(full.driverAmount * ratio),
    driverOwesAdmin: round(full.driverOwesAdmin * ratio),
    adminOwesDriver: round(full.adminOwesDriver * ratio),
  };
}

export function customerPaysAdmin(receiver?: string | null) {
  const r = String(receiver || "DRIVER").toUpperCase();
  return r === "ADMIN" || r === "CUSTOMER_PAYS_ADMIN";
}

/** Chốt chuyến: mặc định tài xế đã thu đủ (tiền mặt) hoặc VP đã thu — không giữ UNPAID */
export function assumedPaymentStatusAfterTripComplete(booking: {
  paymentStatus?: string | null;
  paymentReceiver?: string | null;
}) {
  const st = String(booking.paymentStatus || "UNPAID");
  if (st !== "UNPAID") return st;
  return customerPaysAdmin(booking.paymentReceiver) ? "ADMIN_COLLECTED" : "CASH_COLLECTED";
}

export function bookingCollectedAmount(
  booking: { finalTotal?: unknown; paymentStatus?: string | null; paymentReceiver?: string | null },
  tripCompleted: boolean
) {
  const status = tripCompleted ? assumedPaymentStatusAfterTripComplete(booking) : String(booking.paymentStatus || "UNPAID");
  if (status === "UNPAID") return 0;
  return Number(booking.finalTotal ?? 0);
}
