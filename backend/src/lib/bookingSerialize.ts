import { toWallClockIso } from "./datetime.js";

/** Thêm scheduledAtLocal (giờ VN) cho JSON API. */
export function serializeBooking<T extends Record<string, unknown>>(booking: T): T & { scheduledAtLocal: string | null } {
  const raw = booking.scheduledAt;
  const scheduledAtLocal = raw ? toWallClockIso(new Date(raw as string | Date)) : null;
  return { ...booking, scheduledAtLocal };
}

export function serializeBookings<T extends Record<string, unknown>>(items: T[]) {
  return items.map((b) => serializeBooking(b));
}

export function serializePaginatedBookings<T extends Record<string, unknown>>(payload: {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}) {
  return { ...payload, items: serializeBookings(payload.items) };
}
