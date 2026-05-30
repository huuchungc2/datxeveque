import {
  classifyEndpoint,
  endpointLabel,
  inferRunDirectionFromBooking,
  inferRunDirection,
  driverMatchesRun,
  tripMatchesRun,
  type RouteEndpoint,
  type RunDirection,
} from "./routeEndpoints.js";
import { bookingRemainingSeatUnits, bookingSeatUnits } from "./bookingSeats.js";

export type BookingSeatLine = {
  id: number;
  code: string;
  passengerCount: number;
};

/** Nhãn UI gợi ý điều phối — đồng bộ với frontend serviceTypes / GHI_CHU_LOGIC.md */
const TYPE_LABELS: Record<string, string> = {
  SHARED_RIDE: "Xe ghép",
  PRIVATE_RIDE: "Bao xe",
  CARGO: "Gửi hàng",
  MARKET: "Đi chợ quê",
  CONTRACT: "Xe hợp đồng",
  WEDDING: "Xe đám cưới",
  TOUR: "Xe tham quan",
  HOSPITAL: "Xe bệnh viện",
  AIRPORT: "Xe sân bay",
};

const MIN_ORDERS_PER_HOUR_BUCKET = 2;

export type DispatchSuggestion = {
  id: string;
  kind: "assign_trip" | "new_trip";
  title: string;
  reason: string;
  bookingIds: number[];
  bookings: BookingSeatLine[];
  routeId: number;
  routeName: string;
  orderType: string;
  orderTypeLabel: string;
  departureEndpoint: string;
  runDirection: RunDirection;
  departureAt: string;
  seatsNeeded: number;
  vehicleSeats: number;
  seatsRemainingAfter: number;
  tripId?: number;
  tripCode?: string;
  tripBookedSeats?: number;
  tripAvailableSeats?: number;
  driverId?: number | null;
  driverName?: string | null;
  vehicleId?: number | null;
  vehicleType?: string | null;
  totalSeats: number;
};

function dayKey(scheduledAt?: string | Date | null) {
  if (!scheduledAt) return "nodate";
  return new Date(scheduledAt).toISOString().slice(0, 10);
}

function hourKey(scheduledAt?: string | Date | null) {
  if (!scheduledAt) return "anytime";
  const d = new Date(scheduledAt);
  return `${dayKey(d)}-${String(d.getUTCHours()).padStart(2, "0")}`;
}

function seatsOf(bookings: any[]) {
  return bookings.reduce((s, b) => s + bookingRemainingSeatUnits(b, b.tripBookings), 0);
}

function bookingLines(bookings: any[]): BookingSeatLine[] {
  return bookings.map((b) => ({
    id: b.id,
    code: b.code,
    passengerCount: bookingRemainingSeatUnits(b, b.tripBookings),
  }));
}

function earliestDeparture(bookings: any[]) {
  const times = bookings.map((b) => b.scheduledAt).filter(Boolean).map((t) => new Date(t).getTime());
  if (times.length) return new Date(Math.min(...times)).toISOString();
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
}

export function bookingDepartureEndpoint(booking: any): RouteEndpoint {
  const pickup = classifyEndpoint(booking.pickupAddress);
  if (pickup) return pickup;
  const drop = classifyEndpoint(booking.dropoffAddress);
  if (drop === "SG") return "PROVINCE";
  if (drop === "PROVINCE") return "SG";
  const run = inferRunDirection({
    direction: booking.direction,
    routeFromName: booking.route?.fromName,
    routeToName: booking.route?.toName,
    routeDirection: booking.route?.direction,
  });
  return run === "SG_TO_PROVINCE" ? "SG" : "PROVINCE";
}

/** Gom: tuyến + đầu đi + loại đơn + (giờ nếu đủ đơn, không thì cả ngày) */
export function groupBookingsForDispatch(bookings: any[]): any[][] {
  const byMeta = new Map<string, any[]>();

  for (const b of bookings) {
    if (!b.routeId) continue;
    const ep = bookingDepartureEndpoint(b);
    const day = dayKey(b.scheduledAt);
    const hour = hourKey(b.scheduledAt);
    const meta = `${b.routeId}-${ep}-${b.type}-${day}`;
    if (!byMeta.has(meta)) byMeta.set(meta, []);
    byMeta.get(meta)!.push({ ...b, _ep: ep, _hour: hour });
  }

  const result: any[][] = [];

  for (const [, list] of byMeta) {
    const byHour = new Map<string, any[]>();
    for (const b of list) {
      if (!byHour.has(b._hour)) byHour.set(b._hour, []);
      byHour.get(b._hour)!.push(b);
    }

    const singles: any[] = [];
    for (const [, hourList] of byHour) {
      if (hourList.length >= MIN_ORDERS_PER_HOUR_BUCKET) result.push(hourList);
      else singles.push(...hourList);
    }
    if (singles.length) result.push(singles);
  }

  return result;
}

export function packBookingsByVehicleCapacity(bookings: any[], maxVehicleSeats: number): any[][] {
  const cap = Math.max(1, maxVehicleSeats);
  const sorted = [...bookings].sort(
    (a, b) => bookingRemainingSeatUnits(b, b.tripBookings) - bookingRemainingSeatUnits(a, a.tripBookings)
  );
  const chunks: any[][] = [];
  let current: any[] = [];
  let used = 0;

  for (const b of sorted) {
    const p = bookingRemainingSeatUnits(b, b.tripBookings);
    if (p <= 0) continue;
    if (p > cap) {
      if (current.length) {
        chunks.push(current);
        current = [];
        used = 0;
      }
      chunks.push([b]);
      continue;
    }
    if (used + p > cap) {
      chunks.push(current);
      current = [b];
      used = p;
    } else {
      current.push(b);
      used += p;
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function maxFleetCapacity(drivers: any[], trips: any[]) {
  const fromDrivers = drivers.map((d) => Number(d.vehicles?.[0]?.seats || 0));
  const fromTrips = trips.map((t) => Number(t.totalSeats || 0));
  return Math.max(0, ...fromDrivers, ...fromTrips);
}

function driverFitsSeats(driver: any, seatsNeeded: number, run: RunDirection) {
  const vehicle = driver.vehicles?.[0];
  if (!vehicle) return null;
  const cap = Number(vehicle.seats);
  if (cap <= 0) return null;
  if (!driverMatchesRun(driver, run)) return null;
  return { driver, vehicle, cap, effective: Math.min(cap, seatsNeeded) };
}

function pickDriver(drivers: any[], seatsNeeded: number, run: RunDirection) {
  const scored = drivers
    .map((d) => driverFitsSeats(d, seatsNeeded, run))
    .filter(Boolean) as { driver: any; vehicle: any; cap: number; effective: number }[];

  if (!scored.length) return null;

  return scored.sort((a, b) => a.cap - b.cap)[0];
}

function pickTrip(trips: any[], routeId: number, seatsNeeded: number, targetAt: string, run: RunDirection) {
  const ok = trips.filter(
    (t) =>
      t.routeId === routeId &&
      Number(t.availableSeats) > 0 &&
      ["COLLECTING", "READY"].includes(t.status) &&
      tripMatchesRun(t, run)
  );
  if (!ok.length) return null;
  const target = new Date(targetAt).getTime();
  return ok.sort((a, b) => {
    const assignA = Math.min(seatsNeeded, Number(a.availableSeats));
    const assignB = Math.min(seatsNeeded, Number(b.availableSeats));
    const fullA = assignA >= seatsNeeded ? 1 : 0;
    const fullB = assignB >= seatsNeeded ? 1 : 0;
    if (fullB !== fullA) return fullB - fullA;
    const wasteA = Number(a.availableSeats) - assignA;
    const wasteB = Number(b.availableSeats) - assignB;
    if (wasteA !== wasteB) return wasteA - wasteB;
    const aDriver = a.driverId ? 1 : 0;
    const bDriver = b.driverId ? 1 : 0;
    if (bDriver !== aDriver) return bDriver - aDriver;
    const aRun = a.driver && driverMatchesRun(a.driver, run) ? 1 : 0;
    const bRun = b.driver && driverMatchesRun(b.driver, run) ? 1 : 0;
    if (bRun !== aRun) return bRun - aRun;
    return Math.abs(new Date(a.departureAt).getTime() - target) - Math.abs(new Date(b.departureAt).getTime() - target);
  })[0];
}

function buildOneSuggestion(
  pack: any[],
  packIndex: number,
  groupKey: string,
  collectingTrips: any[],
  availableDrivers: any[]
): DispatchSuggestion {
  const routeId = Number(pack[0].routeId);
  const routeName = pack[0].route?.name || `Tuyến #${routeId}`;
  const orderType = String(pack[0].type);
  const ep = bookingDepartureEndpoint(pack[0]);
  const run = inferRunDirectionFromBooking(pack[0]);
  const bookingIds = pack.map((b) => b.id);
  const bookings = bookingLines(pack);
  const seatsNeeded = seatsOf(pack);
  const departureAt = earliestDeparture(pack);
  const id = `${groupKey}-v${packIndex}`;

  const trip = pickTrip(collectingTrips, routeId, seatsNeeded, departureAt, run);
  if (trip) {
    const vehicleSeats = Number(trip.totalSeats);
    const avail = Number(trip.availableSeats);
    const seatsAssignable = Math.min(seatsNeeded, avail);
    const partial = seatsAssignable < seatsNeeded;
    return {
      id: `assign-${id}`,
      kind: "assign_trip",
      title: `${seatsNeeded} khách • ${TYPE_LABELS[orderType] || orderType} • ${endpointLabel(ep)}`,
      reason: partial
        ? `Gom vào ${trip.code} (${vehicleSeats} chỗ, còn ${avail}) — gán ${seatsAssignable}/${seatsNeeded} ghế lần này`
        : `Gom vào ${trip.code} (${vehicleSeats} chỗ, còn ${avail}, gán ${seatsNeeded} khách)`,
      bookingIds,
      bookings,
      routeId,
      routeName,
      orderType,
      orderTypeLabel: TYPE_LABELS[orderType] || orderType,
      departureEndpoint: endpointLabel(ep),
      runDirection: run,
      departureAt,
      seatsNeeded,
      vehicleSeats,
      seatsRemainingAfter: avail - seatsAssignable,
      tripId: trip.id,
      tripCode: trip.code,
      tripBookedSeats: Number(trip.bookedSeats),
      tripAvailableSeats: avail,
      driverId: trip.driverId,
      driverName: trip.driver?.name || null,
      vehicleId: trip.vehicleId,
      vehicleType: trip.vehicle?.vehicleType || null,
      totalSeats: vehicleSeats,
    };
  }

  const fit = pickDriver(availableDrivers, seatsNeeded, run);
  const vehicle = fit?.vehicle;
  const vehicleSeats = fit ? fit.cap : Math.max(seatsNeeded, 7);

  return {
    id: `new-${id}`,
    kind: "new_trip",
    title: `${seatsNeeded} khách • ${TYPE_LABELS[orderType] || orderType} • ${endpointLabel(ep)}`,
    reason: fit
      ? `Tạo chuyến mới — ${fit.driver.name}, xe ${vehicleSeats} chỗ tại ${fit.driver.location || "—"}`
      : `Không có tài xế rảnh đúng đầu (${endpointLabel(ep)}) và đủ ${seatsNeeded} ghế`,
    bookingIds,
    bookings,
    routeId,
    routeName,
    orderType,
    orderTypeLabel: TYPE_LABELS[orderType] || orderType,
    departureEndpoint: endpointLabel(ep),
    runDirection: run,
    departureAt,
    seatsNeeded,
    vehicleSeats,
    seatsRemainingAfter: vehicleSeats - seatsNeeded,
    driverId: fit?.driver.id ?? null,
    driverName: fit?.driver.name ?? null,
    vehicleId: vehicle?.id ?? null,
    vehicleType: vehicle?.vehicleType ?? null,
    totalSeats: vehicleSeats,
  };
}

export function buildDispatchSuggestions(
  unassignedBookings: any[],
  collectingTrips: any[],
  availableDrivers: any[]
): DispatchSuggestion[] {
  const withRoute = unassignedBookings.filter((b) => b.routeId);
  const fleetMax = maxFleetCapacity(availableDrivers, collectingTrips) || 7;
  const metaGroups = groupBookingsForDispatch(withRoute);
  const suggestions: DispatchSuggestion[] = [];

  metaGroups.forEach((bookings, gi) => {
    bookings.sort((a, b) => {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return ta - tb;
    });
    const ep = bookingDepartureEndpoint(bookings[0]);
    const groupKey = `${bookings[0].routeId}-${ep}-${bookings[0].type}-${dayKey(bookings[0].scheduledAt)}-g${gi}`;
    const packs = packBookingsByVehicleCapacity(bookings, fleetMax);
    packs.forEach((pack, i) => {
      suggestions.push(buildOneSuggestion(pack, i, groupKey, collectingTrips, availableDrivers));
    });
  });

  return suggestions.sort((a, b) => b.departureAt.localeCompare(a.departureAt));
}

export function computeDispatchSeatSummary(unassignedBookings: any[]) {
  const withRoute = unassignedBookings.filter((b) => b.routeId);
  const noRoute = unassignedBookings.filter((b) => !b.routeId);
  return {
    orderCount: unassignedBookings.length,
    passengerCount: seatsOf(unassignedBookings),
    routedOrderCount: withRoute.length,
    routedPassengerCount: seatsOf(withRoute),
    missingRouteCount: noRoute.length,
  };
}
