/** Hai đầu tuyến lớn: Sài Gòn (HCM) ↔ Đức Linh / Tánh Linh */

export type RouteEndpoint = "SG" | "PROVINCE";
export type RunDirection = "SG_TO_PROVINCE" | "PROVINCE_TO_SG";

const SG_PATTERNS = [
  /sài\s*gòn/i,
  /sai\s*gon/i,
  /hồ\s*chí\s*minh/i,
  /ho\s*chi\s*minh/i,
  /\bhcm\b/i,
  /tp\.?\s*hcm/i,
  /bình\s*tân/i,
  /tân\s*bình/i,
  /tân\s*phú/i,
  /gò\s*vấp/i,
  /thủ\s*đức/i,
  /bình\s*thạnh/i,
  /phú\s*nhuận/i,
  /quận\s*\d+/i,
  /huyện\s*hóc\s*môn/i,
  /huyện\s*bình\s*chánh/i,
  /huyện\s*nhà\s*bè/i,
  /huyện\s*cần\s*giờ/i,
];
const PROVINCE_PATTERNS = [
  /đức\s*linh/i,
  /duc\s*linh/i,
  /tánh\s*linh/i,
  /tanh\s*linh/i,
  /bình\s*thuận/i,
  /võ\s*xu/i,
  /vo\s*xu/i,
  /la\s*ngâu/i,
  /mỹ\s*thanh/i,
  /đa\s*kai/i,
  /thị\s*trấn\s*đức\s*linh/i,
  /thị\s*trấn\s*tánh\s*linh/i,
];

export function classifyEndpoint(text?: string | null): RouteEndpoint | null {
  const t = String(text || "").trim();
  if (!t) return null;
  if (SG_PATTERNS.some((p) => p.test(t))) return "SG";
  if (PROVINCE_PATTERNS.some((p) => p.test(t))) return "PROVINCE";
  return null;
}

export function inferRunDirection(input: {
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  direction?: string | null;
  routeFromName?: string | null;
  routeToName?: string | null;
  routeDirection?: string | null;
}): RunDirection {
  const fromRoute = runDirectionFromRoute({
    fromName: input.routeFromName,
    toName: input.routeToName,
    direction: input.routeDirection,
  });
  if (fromRoute) return fromRoute;

  const fromBookingDir = directionTextToRun(input.direction);
  if (fromBookingDir) return fromBookingDir;

  const pickup = classifyEndpoint(input.pickupAddress);
  const drop = classifyEndpoint(input.dropoffAddress);
  if (pickup === "SG") return "SG_TO_PROVINCE";
  if (pickup === "PROVINCE") return "PROVINCE_TO_SG";
  if (drop === "PROVINCE") return "SG_TO_PROVINCE";
  if (drop === "SG") return "PROVINCE_TO_SG";

  const dir = String(input.direction || input.routeDirection || "");
  if (/sài\s*gòn|sai\s*gon|hcm/i.test(dir) && /đức|tánh|duc|tanh/i.test(dir)) {
    const sgFirst = dir.search(/sài|sai|hcm|hồ\s*chí/i);
    const provFirst = dir.search(/đức|tánh|duc|tanh/i);
    if (sgFirst >= 0 && (provFirst < 0 || sgFirst < provFirst)) return "SG_TO_PROVINCE";
    if (provFirst >= 0 && (sgFirst < 0 || provFirst < sgFirst)) return "PROVINCE_TO_SG";
  }

  const from = classifyEndpoint(input.routeFromName);
  if (from === "SG") return "SG_TO_PROVINCE";
  if (from === "PROVINCE") return "PROVINCE_TO_SG";

  return "SG_TO_PROVINCE";
}

/** Chiều chạy chuẩn từ bản ghi tuyến — nguồn tin cậy nhất khi khách đã chọn vé/tuyến */
export function runDirectionFromRoute(route?: {
  fromName?: string | null;
  toName?: string | null;
  direction?: string | null;
} | null): RunDirection | null {
  if (!route) return null;
  const fromDir = directionTextToRun(route.direction);
  if (fromDir) return fromDir;
  const from = classifyEndpoint(route.fromName);
  if (from === "SG") return "SG_TO_PROVINCE";
  if (from === "PROVINCE") return "PROVINCE_TO_SG";
  return null;
}

export function inferRunDirectionFromBooking(booking: {
  direction?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  route?: { fromName?: string | null; toName?: string | null; direction?: string | null } | null;
}): RunDirection {
  return inferRunDirection({
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    direction: booking.direction,
    routeFromName: booking.route?.fromName,
    routeToName: booking.route?.toName,
    routeDirection: booking.route?.direction,
  });
}

/** Đầu khởi hành theo chiều chạy */
export function departureEndpointForRun(run: RunDirection): RouteEndpoint {
  return run === "SG_TO_PROVINCE" ? "SG" : "PROVINCE";
}

export function endpointLabel(ep: RouteEndpoint) {
  return ep === "SG" ? "Sài Gòn (HCM)" : "Đức Linh / Tánh Linh";
}

export function runDirectionLabel(run: RunDirection) {
  return run === "SG_TO_PROVINCE" ? "Sài Gòn → Đức Linh/Tánh Linh" : "Đức Linh/Tánh Linh → Sài Gòn";
}

function directionTextToRun(text?: string | null): RunDirection | null {
  const d = String(text || "").trim();
  if (!d) return null;
  const sgFirst = d.search(/sài|sai|hcm|hồ\s*chí/i);
  const provFirst = d.search(/đức|tánh|duc|tanh/i);
  if (sgFirst < 0 && provFirst < 0) return null;
  if (sgFirst >= 0 && (provFirst < 0 || sgFirst < provFirst)) return "SG_TO_PROVINCE";
  if (provFirst >= 0 && (sgFirst < 0 || provFirst < sgFirst)) return "PROVINCE_TO_SG";
  return null;
}

export type DriverRouteFields = {
  routeId?: number | null;
  runDirection?: string | null;
  location?: string | null;
  direction?: string | null;
};

/** Tài xế chạy mọi tuyến cùng chiều — chỉ so khớp chiều chạy (đơn/chuyến vẫn có routeId riêng). */
export function driverMatchesBooking(
  driver: DriverRouteFields,
  _bookingRouteId: number | null | undefined,
  run: RunDirection
): boolean {
  return driverMatchesRun(driver, run);
}

/** Tài xế: ưu tiên runDirection đã chọn; không thì suy từ vị trí / chiều text (legacy) */
export function driverMatchesRun(driver: DriverRouteFields, run: RunDirection): boolean {
  if (driver.runDirection) return String(driver.runDirection) === run;
  const loc = classifyEndpoint(driver.location);
  if (loc) return loc === departureEndpointForRun(run);
  const fromDir = directionTextToRun(driver.direction);
  return fromDir === run;
}

export function inferTripRunDirection(trip: {
  tripBookings?: { booking: Record<string, unknown> }[];
  driver?: DriverRouteFields | null;
  route?: { fromName?: string | null; toName?: string | null; direction?: string | null } | null;
}): RunDirection | null {
  if (trip.driver?.runDirection === "SG_TO_PROVINCE" || trip.driver?.runDirection === "PROVINCE_TO_SG") {
    return trip.driver.runDirection as RunDirection;
  }
  const fromRoute = runDirectionFromRoute(trip.route);
  if (fromRoute) return fromRoute;

  const bookings = (trip.tripBookings || []).map((tb) => tb.booking).filter(Boolean);
  if (bookings.length) {
    const b = bookings[0] as Record<string, unknown>;
    const route = b.route as Record<string, unknown> | undefined;
    return inferRunDirection({
      pickupAddress: b.pickupAddress as string | null,
      dropoffAddress: b.dropoffAddress as string | null,
      direction: b.direction as string | null,
      routeFromName: (route?.fromName as string) ?? trip.route?.fromName,
      routeToName: (route?.toName as string) ?? trip.route?.toName,
      routeDirection: (route?.direction as string) ?? trip.route?.direction,
    });
  }
  if (trip.driver && driverMatchesRun(trip.driver, "SG_TO_PROVINCE")) return "SG_TO_PROVINCE";
  if (trip.driver && driverMatchesRun(trip.driver, "PROVINCE_TO_SG")) return "PROVINCE_TO_SG";
  return null;
}

/** Chuyến đang gom phải cùng chiều với đơn; chuyến trống chưa có tài xế thì chấp nhận (đơn đầu định chiều) */
export function tripMatchesRun(
  trip: {
    tripBookings?: { booking: Record<string, unknown> }[];
    driverId?: number | null;
    driver?: { location?: string | null; direction?: string | null } | null;
    route?: { fromName?: string | null; toName?: string | null; direction?: string | null } | null;
  },
  run: RunDirection
): boolean {
  const tripRun = inferTripRunDirection(trip);
  if (tripRun !== null) return tripRun === run;
  if (!trip.driverId && !(trip.tripBookings || []).length) return true;
  if (trip.driver) return driverMatchesRun(trip.driver, run);
  return false;
}

export function driverMismatchReason(
  driver: { name?: string; location?: string | null; routeId?: number | null; runDirection?: string | null; route?: { name?: string } | null },
  run: RunDirection,
  _bookingRouteId?: number | null
): string {
  if (driver.runDirection && driver.runDirection !== run) {
    return `Tài xế ${driver.name || ""} chạy ${runDirectionLabel(driver.runDirection as RunDirection)}, đơn cần ${runDirectionLabel(run)}`.trim();
  }
  const need = endpointLabel(departureEndpointForRun(run));
  const at = driver.location?.trim() || "chưa cập nhật vị trí";
  return `Tài xế ${driver.name || ""} đang ở ${at}, cần tài xế ở ${need}`.trim();
}

export function tripMismatchReason(run: RunDirection): string {
  return `Chuyến khác chiều — đơn đi từ ${endpointLabel(departureEndpointForRun(run))}`;
}

export function driverStateAfterComplete(run: RunDirection, vehicleSeats: number): {
  location: string;
  direction: string;
  status: string;
  seatsFree: number;
  runDirection: RunDirection;
} {
  const nextRun: RunDirection = run === "SG_TO_PROVINCE" ? "PROVINCE_TO_SG" : "SG_TO_PROVINCE";
  if (run === "SG_TO_PROVINCE") {
    return {
      location: "Đức Linh / Tánh Linh",
      direction: runDirectionLabel(nextRun),
      status: "Rảnh",
      seatsFree: vehicleSeats,
      runDirection: nextRun,
    };
  }
  return {
    location: "Sài Gòn (Hồ Chí Minh)",
    direction: runDirectionLabel(nextRun),
    status: "Rảnh",
    seatsFree: vehicleSeats,
    runDirection: nextRun,
  };
}
