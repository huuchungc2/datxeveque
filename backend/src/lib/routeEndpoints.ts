/** Hai đầu tuyến lớn: Sài Gòn (HCM) ↔ Đức Linh / Tánh Linh */

export type RouteEndpoint = "SG" | "PROVINCE";
export type RunDirection = "SG_TO_PROVINCE" | "PROVINCE_TO_SG";

const SG_PATTERNS = [/sài\s*gòn/i, /sai\s*gon/i, /hồ\s*chí\s*minh/i, /ho\s*chi\s*minh/i, /\bhcm\b/i, /tp\.?\s*hcm/i];
const PROVINCE_PATTERNS = [/đức\s*linh/i, /duc\s*linh/i, /tánh\s*linh/i, /tanh\s*linh/i, /bình\s*thuận/i];

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

export function driverStateAfterComplete(
  run: RunDirection,
  vehicleSeats: number
): { location: string; direction: string; status: string; seatsFree: number } {
  if (run === "SG_TO_PROVINCE") {
    return {
      location: "Đức Linh / Tánh Linh",
      direction: "Đức Linh/Tánh Linh → Sài Gòn (Hồ Chí Minh)",
      status: "Rảnh",
      seatsFree: vehicleSeats,
    };
  }
  return {
    location: "Sài Gòn (Hồ Chí Minh)",
    direction: "Sài Gòn (HCM) → Đức Linh/Tánh Linh",
    status: "Rảnh",
    seatsFree: vehicleSeats,
  };
}
