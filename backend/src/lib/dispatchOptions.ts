import {
  bookingRemainingSeatUnits,
  bookingSeatUnits,
  tripBookingSeatUnits,
} from "./bookingSeats.js";
import {
  driverMatchesRun,
  driverMismatchReason,
  inferRunDirectionFromBooking,
  inferRunDirection,
  tripMatchesRun,
  tripMismatchReason,
  type RunDirection,
} from "./routeEndpoints.js";
import { effectiveTripDispatchSeats } from "./driverAvailability.js";

export type DispatchOption = {
  key: string;
  kind: "existing_trip" | "available_driver";
  eligible: boolean;
  disabledReason?: string;
  /** present when kind=existing_trip */
  tripId?: number;
  tripCode?: string;
  tripStatus?: string;
  tripTotalSeats?: number;
  tripBookedSeats?: number;
  tripAvailableSeats?: number;
  /** present when kind=available_driver */
  driverId?: number;
  driverName?: string;
  driverStatus?: string;
  driverSeatsFree?: number;
  vehicleId?: number | null;
  vehicleType?: string | null;
  vehicleSeats?: number;
  /** tổng ghế còn cần gán (cả nhóm đơn) */
  seatsNeeded: number;
  /** ghế sẽ gán lần này nếu chọn phương án */
  seatsAssignable: number;
  seatsRemainingAfter?: number;
  label: string;
};

function fmtTripLabel(t: any) {
  const driver = t?.driver?.name || "chưa gán tài xế";
  return `${t.code} — xe ${t.totalSeats} chỗ, đã ${t.bookedSeats} khách, còn ${t.availableSeats} — ${driver}`;
}

function fmtDriverLabel(d: any) {
  const v = d?.vehicles?.[0];
  const vTxt = v ? `xe ${v.seats} chỗ${v.vehicleType ? ` (${v.vehicleType})` : ""}` : "chưa có xe";
  const free = Number(d?.seatsFree ?? 0);
  return `${d.name} — ${vTxt}, báo rảnh ${free}`;
}

function inferBookingRun(bookings: any[]): RunDirection | null {
  const b = bookings[0];
  if (!b) return null;
  return inferRunDirectionFromBooking(b);
}

function resolveBookings(suggestion: { bookingIds: number[] }, unassignedBookings: any[]) {
  return suggestion.bookingIds
    .map((id) => unassignedBookings.find((b: any) => b.id === id))
    .filter(Boolean);
}

function sumRemainingSeats(bookings: any[]) {
  return bookings.reduce((s, b) => s + bookingRemainingSeatUnits(b, b.tripBookings), 0);
}

function driverEligibility(
  d: any,
  seatsNeeded: number,
  seatsAssignable: number,
  run: RunDirection | null,
  opts?: { forNewTrip?: boolean }
) {
  if (!d) return { ok: false, reason: "Không tìm thấy tài xế" };
  const v = d.vehicles?.[0];
  if (!v) return { ok: false, reason: "Tài xế chưa khai báo xe" };
  const cap = Number(v.seats || 0);
  if (cap <= 0) return { ok: false, reason: "Xe chưa có số chỗ" };
  if (seatsAssignable <= 0) return { ok: false, reason: "Không còn ghế cần gán" };
  if (run && !driverMatchesRun(d, run)) return { ok: false, reason: driverMismatchReason(d, run) };
  if (opts?.forNewTrip !== false) {
    const assign = Math.min(seatsNeeded, cap);
    if (assign <= 0) return { ok: false, reason: "Xe không còn chỗ trống" };
    return { ok: true as const, seatsAssignable: assign };
  }
  const free = Number(d.seatsFree ?? cap);
  const effective = Math.min(cap, free);
  const assign = Math.min(seatsNeeded, effective);
  if (assign <= 0) {
    return { ok: false, reason: `Tài xế báo còn ${free} ghế rảnh (ghép)` };
  }
  return { ok: true as const, seatsAssignable: assign };
}

function tripEligibility(t: any, routeId: number, seatsNeeded: number, run: RunDirection | null) {
  if (!t) return { ok: false, reason: "Không tìm thấy chuyến" };
  if (Number(t.routeId) !== Number(routeId)) return { ok: false, reason: "Khác tuyến" };
  const st = String(t.status || "");
  if (!["COLLECTING", "READY"].includes(st)) return { ok: false, reason: `Trạng thái ${st} không nhận thêm` };
  const rawTripAvail = Number(t.availableSeats || 0);
  const avail = effectiveTripDispatchSeats(t, t.driver);
  if (avail <= 0) {
    const booked = Number(t.bookedSeats || 0);
    if (t.driverId && rawTripAvail > 0 && t.driver && Number(t.driver.seatsFree ?? 0) <= 0) {
      return { ok: false, reason: "Tài xế báo 0 ghế còn nhận thêm cho chuyến này" };
    }
    if (t.driverId && rawTripAvail > 0 && t.driver && Number(t.driver.seatsFree ?? 0) < rawTripAvail) {
      return {
        ok: false,
        reason: `Tài xế báo còn ${Number(t.driver.seatsFree)} ghế (chuyến còn ${rawTripAvail} chỗ trống trên xe)`,
      };
    }
    return {
      ok: false,
      reason: booked > 0 ? "Chuyến đã đủ khách — không gán thêm" : "Hết ghế trống",
    };
  }
  const seatsAssignable = Math.min(seatsNeeded, avail);
  if (run && !tripMatchesRun(t, run)) return { ok: false, reason: tripMismatchReason(run) };
  if (!t.driverId) {
    return { ok: true as const, seatsAssignable, note: "Chưa gán tài xế — gom đơn trước, gán tài xế sau" };
  }
  return { ok: true as const, seatsAssignable };
}

export function buildDispatchOptionsForSuggestion(input: {
  suggestion: { id: string; routeId: number; bookingIds: number[]; seatsNeeded?: number; runDirection?: RunDirection };
  unassignedBookings: any[];
  collectingTrips: any[];
  availableDrivers: any[];
  /** false = trả cả phương án không đủ ghế (debug); mặc định chỉ eligible */
  eligibleOnly?: boolean;
}): DispatchOption[] {
  const { suggestion, unassignedBookings, collectingTrips, availableDrivers } = input;

  const bookings = resolveBookings(suggestion, unassignedBookings);
  const seatsNeeded =
    suggestion.seatsNeeded != null
      ? Number(suggestion.seatsNeeded)
      : sumRemainingSeats(bookings);
  const run = suggestion.runDirection ?? inferBookingRun(bookings);

  const options: DispatchOption[] = [];

  for (const t of collectingTrips || []) {
    const chk = tripEligibility(t, suggestion.routeId, seatsNeeded, run);
    const dispatchAvail = effectiveTripDispatchSeats(t, t.driver);
    const seatsAssignable = chk.ok ? (chk as { seatsAssignable: number }).seatsAssignable : 0;
    const eligible = chk.ok && seatsAssignable > 0;
    const partial = eligible && seatsAssignable < seatsNeeded;
    options.push({
      key: `trip:${t.id}`,
      kind: "existing_trip",
      eligible,
      disabledReason: eligible ? undefined : chk.reason,
      tripId: t.id,
      tripCode: t.code,
      tripStatus: t.status,
      tripTotalSeats: Number(t.totalSeats || 0),
      tripBookedSeats: Number(t.bookedSeats || 0),
      tripAvailableSeats: dispatchAvail,
      seatsNeeded,
      seatsAssignable,
      seatsRemainingAfter: dispatchAvail - seatsAssignable,
      label: `Chuyến: ${fmtTripLabel(t)}${
        eligible
          ? partial
            ? ` — gán ${seatsAssignable}/${seatsNeeded} ghế lần này`
            : ` — gán đủ ${seatsAssignable} ghế`
          : ` — (${chk.reason})`
      }${(chk as { note?: string }).note && eligible ? " — (chưa có tài xế)" : ""}`,
    });
  }

  for (const d of availableDrivers || []) {
    const v = d?.vehicles?.[0];
    const cap = Number(v?.seats ?? 0);
    const seatsAssignable = Math.min(seatsNeeded, cap);
    const chk = driverEligibility(d, seatsNeeded, seatsAssignable, run);
    const eligible = chk.ok;
    const assign = eligible ? (chk as { seatsAssignable: number }).seatsAssignable : 0;
    const partial = eligible && assign < seatsNeeded;
    options.push({
      key: `driver:${d.id}`,
      kind: "available_driver",
      eligible,
      disabledReason: eligible ? undefined : (chk as any).reason,
      driverId: d.id,
      driverName: d.name,
      driverStatus: d.status,
      driverSeatsFree: Number(d.seatsFree ?? 0),
      vehicleId: v?.id ?? null,
      vehicleType: v?.vehicleType ?? null,
      vehicleSeats: cap,
      seatsNeeded,
      seatsAssignable: assign,
      seatsRemainingAfter: eligible ? cap - assign : undefined,
      label: `Tài xế: ${fmtDriverLabel(d)}${
        eligible
          ? partial
            ? ` — tạo chuyến, gán ${assign}/${seatsNeeded} ghế`
            : ` — tạo chuyến, gán ${assign} ghế`
          : ` — (${(chk as any).reason})`
      }`,
    });
  }

  const sorted = options.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "existing_trip" ? -1 : 1;
    const fullA = a.seatsAssignable >= a.seatsNeeded ? 1 : 0;
    const fullB = b.seatsAssignable >= b.seatsNeeded ? 1 : 0;
    if (fullB !== fullA) return fullB - fullA;
    const ra = a.seatsRemainingAfter ?? Number.MAX_SAFE_INTEGER;
    const rb = b.seatsRemainingAfter ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label, "vi");
  });

  if (input.eligibleOnly !== false) return sorted.filter((o) => o.eligible);
  return sorted;
}

/** Ghế còn lại trên đơn (dùng serialize API) */
export function enrichBookingDispatchSeats<T extends Record<string, unknown>>(booking: T) {
  const tripBookings = (booking.tripBookings as any[]) || [];
  const total = bookingSeatUnits(booking as any);
  const assigned = tripBookings.reduce((s, tb) => s + tripBookingSeatUnits(tb), 0);
  const remaining = Math.max(0, total - assigned);
  return {
    ...booking,
    dispatchSeatTotal: total,
    dispatchSeatAssigned: assigned,
    dispatchSeatRemaining: remaining,
  };
}
