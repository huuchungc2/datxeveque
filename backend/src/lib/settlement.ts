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

export function customerPaysAdmin(receiver?: string | null) {
  const r = String(receiver || "DRIVER").toUpperCase();
  return r === "ADMIN" || r === "CUSTOMER_PAYS_ADMIN";
}
