/** Gợi ý đầu/cuối tuyến + ghép địa chỉ chi tiết. */

import {
  composeServiceAreaAddress,
  findDistrict,
  findWard,
  regionForRouteEndpoint,
  type AreaRegion,
} from "../data/serviceAreaAddress";

export type RouteLike = { fromName?: string | null; toName?: string | null };

export type RouteAddressPreset = {
  id: "from" | "to";
  label: string;
  endpointName: string;
};

export type StructuredRouteAddress = {
  endpointKey: string;
  districtId: string;
  wardId: string;
  street: string;
};

/** Đón/lấy = đầu đi (from), trả/giao = đầu đến (to) theo tuyến đã chọn. */
export const ROUTE_ENDPOINT_PICKUP = "from" as const;
export const ROUTE_ENDPOINT_DROPOFF = "to" as const;

export function routeAddressPresets(route?: RouteLike | null): RouteAddressPreset[] {
  if (!route) return [];
  const out: RouteAddressPreset[] = [];
  const from = route.fromName?.trim();
  const to = route.toName?.trim();
  if (from) out.push({ id: "from", label: from, endpointName: from });
  if (to) out.push({ id: "to", label: to, endpointName: to });
  return out;
}

export function regionForPreset(
  route: RouteLike | null | undefined,
  presetId: string
): AreaRegion | null {
  const preset = routeAddressPresets(route).find((p) => p.id === presetId);
  if (!preset) return null;
  return regionForRouteEndpoint(preset.endpointName);
}

export function buildStructuredRouteAddress(
  route: RouteLike | null | undefined,
  presetId: string,
  districtId: string,
  wardId: string,
  street: string
): string {
  const region = regionForPreset(route, presetId);
  const district = findDistrict(region, districtId);
  const ward = findWard(district, wardId);
  if (!region || !district || !ward) return street.trim();
  return composeServiceAreaAddress({
    regionLabel: region.label,
    districtName: district.name,
    wardName: ward.name,
    street,
  });
}

/** Tách chuỗi địa chỉ đã ghép (DB) → quận/xã/đường cho form admin. */
export function parseServiceAreaAddress(
  address: string,
  route: RouteLike | null | undefined,
  endpointKey: string
): { districtId: string; wardId: string; street: string } {
  const raw = (address || "").trim();
  if (!raw) return { districtId: "", wardId: "", street: "" };

  const region = regionForPreset(route, endpointKey);
  if (!region) return { districtId: "", wardId: "", street: raw };

  let locationPart = raw;
  let street = "";
  const sep = raw.match(/^(.+?)\s*[—–]\s*(.+)$/);
  if (sep) {
    locationPart = sep[1].trim();
    street = sep[2].trim();
  }

  let best: { districtId: string; wardId: string; score: number } | null = null;

  for (const district of region.districts) {
    if (!locationPart.includes(district.name)) continue;
    for (const ward of district.wards) {
      if (!locationPart.includes(ward.name)) continue;
      const score = ward.name.length + district.name.length;
      if (!best || score > best.score) {
        best = { districtId: district.id, wardId: ward.id, score };
      }
    }
  }

  if (best) {
    return { districtId: best.districtId, wardId: best.wardId, street };
  }
  return { districtId: "", wardId: "", street: raw };
}
