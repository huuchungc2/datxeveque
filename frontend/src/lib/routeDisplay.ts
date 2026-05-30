/** Hiển thị tuyến — tránh lặp name + direction + from→to cùng nghĩa */

export type RouteLike = {
  name?: string | null;
  direction?: string | null;
  fromName?: string | null;
  toName?: string | null;
};

function norm(s?: string | null) {
  return String(s || "").trim();
}

function normalizeCompare(s: string) {
  return s
    .toLowerCase()
    .replace(/[→\->]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Hai chuỗi mô tả cùng một tuyến (gần giống nhau) */
export function routeTextSimilar(a: string, b: string) {
  const na = normalizeCompare(a);
  const nb = normalizeCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 8 && nb.length >= 8 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

export function routeEndpointLine(route?: RouteLike | null) {
  const from = norm(route?.fromName);
  const to = norm(route?.toName);
  if (from && to) return `${from} → ${to}`;
  return "";
}

export function formatRouteCell(route?: RouteLike | null, fallback = "—") {
  if (!route) return { primary: fallback, secondary: null as string | null };

  const name = norm(route.name);
  const direction = norm(route.direction);
  const endpoints = routeEndpointLine(route);

  const primary = endpoints || direction || name || fallback;

  for (const extra of [name, direction]) {
    if (extra && !routeTextSimilar(extra, primary)) {
      return { primary, secondary: extra };
    }
  }

  return { primary, secondary: null };
}

/** Một dòng ngắn cho badge / filter */
export function routePrimaryLabel(route?: RouteLike | null, fallback = "—") {
  return formatRouteCell(route, fallback).primary;
}
