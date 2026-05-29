import type { Prisma } from "@prisma/client";

/** Tuyến hiển thị cho khách / form đặt xe công khai */
export function publicRouteWhere(): Prisma.RouteWhereInput {
  return { locked: false };
}

export function buildAdminRouteListWhere(query: Record<string, unknown>): Prisma.RouteWhereInput {
  const where: Prisma.RouteWhereInput = {};
  const q = String(query.q || query.keyword || "").trim();
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { fromName: { contains: q } },
      { toName: { contains: q } },
      { direction: { contains: q } },
    ];
  }
  const locked = query.locked;
  if (locked === "true" || locked === "1") where.locked = true;
  else if (locked === "false" || locked === "0") where.locked = false;
  return where;
}

export function normalizeRouteLocked(body: Record<string, unknown>) {
  if (body.locked === undefined) return undefined;
  if (typeof body.locked === "boolean") return body.locked;
  if (body.locked === "true" || body.locked === "1" || body.locked === 1) return true;
  if (body.locked === "false" || body.locked === "0" || body.locked === 0) return false;
  return Boolean(body.locked);
}
