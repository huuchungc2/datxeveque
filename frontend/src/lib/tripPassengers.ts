/** Tóm tắt đón/trả khách & giao hàng trên một chuyến (admin). */

const PASSENGER_DONE = new Set(["DROPPED_OFF", "CANCELLED_BY_ADMIN", "WAITING_REDISPATCH", "CUSTOMER_CANCELLED"]);
const CARGO_DONE = new Set([
  "DELIVERED",
  "PARCEL_CANCELLED",
  "FAILED_PICKUP",
  "FAILED_DELIVERY",
  "WAITING_ADMIN_REVIEW",
]);

export type TripBookingRow = {
  id?: number;
  seatCount?: number;
  booking?: {
    id?: number;
    code?: string;
    customerName?: string;
    type?: string;
    driverRideStatus?: string | null;
    driverCargoStatus?: string | null;
  } | null;
};

export function summarizeTripBookings(tripBookings: TripBookingRow[] = []) {
  let passengerOrders = 0;
  let passengerDone = 0;
  let cargoOrders = 0;
  let cargoDone = 0;
  const names: string[] = [];

  for (const tb of tripBookings) {
    const b = tb.booking;
    if (!b) continue;
    if (names.length < 3 && b.customerName) names.push(b.customerName);
    if (b.type === "CARGO") {
      cargoOrders++;
      if (b.driverCargoStatus && CARGO_DONE.has(b.driverCargoStatus)) cargoDone++;
    } else {
      passengerOrders++;
      if (b.driverRideStatus && PASSENGER_DONE.has(b.driverRideStatus)) passengerDone++;
    }
  }

  const totalOrders = passengerOrders + cargoOrders;
  const totalDone = passengerDone + cargoDone;

  return {
    totalOrders,
    totalDone,
    passengerOrders,
    passengerDone,
    cargoOrders,
    cargoDone,
    names,
  };
}

export function tripProgressLabel(summary: ReturnType<typeof summarizeTripBookings>) {
  if (!summary.totalOrders) return "Chưa có đơn";
  const parts: string[] = [];
  if (summary.passengerOrders) {
    parts.push(`${summary.passengerDone}/${summary.passengerOrders} khách xong`);
  }
  if (summary.cargoOrders) {
    parts.push(`${summary.cargoDone}/${summary.cargoOrders} hàng xong`);
  }
  return parts.join(" · ") || `${summary.totalDone}/${summary.totalOrders} đơn xong`;
}

export function rideStatusBadgeClass(status?: string | null, isCargo?: boolean) {
  const s = status || "";
  if (!s) return "badge-info";
  if (isCargo) {
    if (s === "DELIVERED") return "badge-success";
    if (s.startsWith("FAILED") || s === "PARCEL_CANCELLED") return "badge-danger";
    if (s === "DELIVERING" || s === "PICKING_UP") return "badge-warning";
    return "badge-info";
  }
  if (s === "DROPPED_OFF") return "badge-success";
  if (s === "CUSTOMER_CANCELLED" || s === "CANCELLED_BY_ADMIN") return "badge-danger";
  if (s === "PICKING_UP" || s === "DROPPING_OFF" || s === "PICKED_UP") return "badge-warning";
  if (s === "UNREACHABLE" || s === "NO_SHOW" || s === "WAITING_ADMIN_REVIEW") return "badge-danger";
  return "badge-info";
}
