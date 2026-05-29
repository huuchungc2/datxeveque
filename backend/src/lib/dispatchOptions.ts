import { bookingSeatUnits } from "./bookingSeats.js";
import {
  driverMatchesRun,
  driverMismatchReason,
  inferRunDirectionFromBooking,
  tripMatchesRun,
  tripMismatchReason,
  type RunDirection,
} from "./routeEndpoints.js";

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
  /** computed */
  seatsNeeded: number;
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

function driverEligibility(d: any, seatsNeeded: number, run: RunDirection | null, opts?: { forNewTrip?: boolean }) {
  if (!d) return { ok: false, reason: "Không tìm thấy tài xế" };
  const v = d.vehicles?.[0];
  if (!v) return { ok: false, reason: "Tài xế chưa khai báo xe" };
  const cap = Number(v.seats || 0);
  if (cap <= 0) return { ok: false, reason: "Xe chưa có số chỗ" };
  if (cap < seatsNeeded) return { ok: false, reason: `Xe chỉ ${cap} chỗ, cần ${seatsNeeded}` };
  if (run && !driverMatchesRun(d, run)) return { ok: false, reason: driverMismatchReason(d, run) };
  if (opts?.forNewTrip !== false) {
    return { ok: true as const };
  }
  const free = Number(d.seatsFree ?? cap);
  if (Math.min(cap, free) < seatsNeeded) {
    return { ok: false, reason: `Tài xế báo còn ${free} ghế rảnh (ghép), cần ${seatsNeeded}` };
  }
  return { ok: true as const };
}

function tripEligibility(t: any, routeId: number, seatsNeeded: number, run: RunDirection | null) {
  if (!t) return { ok: false, reason: "Không tìm thấy chuyến" };
  if (Number(t.routeId) !== Number(routeId)) return { ok: false, reason: "Khác tuyến" };
  const st = String(t.status || "");
  if (!["COLLECTING", "READY"].includes(st)) return { ok: false, reason: `Trạng thái ${st} không nhận thêm` };
  const avail = Number(t.availableSeats || 0);
  if (avail < seatsNeeded) return { ok: false, reason: `Chỉ còn ${avail} ghế, cần ${seatsNeeded}` };
  if (run && !tripMatchesRun(t, run)) return { ok: false, reason: tripMismatchReason(run) };
  if (!t.driverId) {
    return { ok: true as const, note: "Chưa gán tài xế — gom đơn trước, gán tài xế sau" };
  }
  return { ok: true as const };
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

  const bookings = suggestion.bookingIds
    .map((id) => unassignedBookings.find((b: any) => b.id === id))
    .filter(Boolean);
  const seatsNeeded =
    suggestion.seatsNeeded != null
      ? Number(suggestion.seatsNeeded)
      : bookings.reduce((s: number, b: any) => s + bookingSeatUnits(b), 0);
  const run = suggestion.runDirection ?? inferBookingRun(bookings);

  const options: DispatchOption[] = [];

  for (const t of collectingTrips || []) {
    const chk = tripEligibility(t, suggestion.routeId, seatsNeeded, run);
    const eligible = chk.ok;
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
      tripAvailableSeats: Number(t.availableSeats || 0),
      seatsNeeded,
      seatsRemainingAfter: Number(t.availableSeats || 0) - seatsNeeded,
      label: `Chuyến: ${fmtTripLabel(t)}${eligible ? "" : ` — (${chk.reason})`}${(chk as { note?: string }).note && eligible ? " — (chưa có tài xế)" : ""}`,
    });
  }

  for (const d of availableDrivers || []) {
    const v = d?.vehicles?.[0];
    const chk = driverEligibility(d, seatsNeeded, run);
    const eligible = chk.ok;
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
      vehicleSeats: Number(v?.seats ?? 0),
      seatsNeeded,
      seatsRemainingAfter: eligible ? Number(v?.seats ?? 0) - seatsNeeded : undefined,
      label: `Tài xế: ${fmtDriverLabel(d)}${eligible ? "" : ` — (${(chk as any).reason})`}`,
    });
  }

  const sorted = options.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "existing_trip" ? -1 : 1;
    const ra = a.seatsRemainingAfter ?? Number.MAX_SAFE_INTEGER;
    const rb = b.seatsRemainingAfter ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label, "vi");
  });

  /** UI dropdown chỉ cần phương án gán được — không list chuyến/tài thiếu ghế. */
  if (input.eligibleOnly !== false) return sorted.filter((o) => o.eligible);
  return sorted;
}

