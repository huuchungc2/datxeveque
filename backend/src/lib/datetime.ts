/** Giờ nghiệp vụ: múi giờ Việt Nam (trùng cấu hình server TZ khuyến nghị). */
export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";

const pad = (n: number) => String(n).padStart(2, "0");

const WALL_CLOCK_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const zonedFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function zonedPartsFromInstant(d: Date): ZonedParts {
  const parts = zonedFormatter.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value || 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** YYYY-MM-DDTHH:mm theo giờ VN (không Z). */
export function toWallClockIso(d: Date): string {
  const p = zonedPartsFromInstant(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function todayZonedDateValue(): string {
  const p = zonedPartsFromInstant(new Date());
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Chuỗi form YYYY-MM-DD[THH:mm] → instant UTC (coi là giờ VN, UTC+7). */
export function parseWallClockToDate(value: string): Date {
  const m = value.trim().match(WALL_CLOCK_RE);
  if (!m) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw Object.assign(new Error("Ngày giờ không hợp lệ"), { statusCode: 400 });
    }
    return d;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const h = m[4] != null ? Number(m[4]) : 0;
  const min = m[5] != null ? Number(m[5]) : 0;
  return new Date(Date.UTC(y, mo - 1, day, h - 7, min, 0, 0));
}

export function parseScheduledAtInput(value: string | Date): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw Object.assign(new Error("Ngày giờ đi không hợp lệ"), { statusCode: 400 });
    }
    const d = new Date(value);
    d.setUTCSeconds(0, 0);
    return d;
  }
  const s = String(value).trim();
  if (WALL_CLOCK_RE.test(s)) {
    const d = parseWallClockToDate(s);
    d.setUTCSeconds(0, 0);
    return d;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw Object.assign(new Error("Ngày giờ đi không hợp lệ"), { statusCode: 400 });
  }
  d.setUTCSeconds(0, 0);
  return d;
}

export function startOfZonedDay(dateOnly: string): Date {
  const day = dateOnly.slice(0, 10);
  return parseWallClockToDate(`${day}T00:00`);
}

export function endOfZonedDay(dateOnly: string): Date {
  const start = startOfZonedDay(dateOnly);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Lọc đơn theo ngày dương lịch YYYY-MM-DD (đầu/cuối ngày giờ VN). */
export function parseScheduledAtDateRange(dateFrom?: unknown, dateTo?: unknown) {
  const fromStr = dateFrom != null && String(dateFrom).trim() ? String(dateFrom).trim() : "";
  const toStr = dateTo != null && String(dateTo).trim() ? String(dateTo).trim() : "";
  if (!fromStr && !toStr) return undefined;

  const dayRe = /^(\d{4})-(\d{2})-(\d{2})/;
  const gte = fromStr && dayRe.test(fromStr) ? startOfZonedDay(fromStr) : undefined;
  const lte = toStr && dayRe.test(toStr) ? endOfZonedDay(toStr) : undefined;
  if (gte === undefined && lte === undefined) return undefined;
  return { gte, lte };
}

export function minBookingDepartureInstant(): Date {
  const d = new Date();
  d.setUTCSeconds(0, 0);
  d.setUTCMilliseconds(0);
  return new Date(d.getTime() + 60 * 60 * 1000);
}

export function getAppTimePayload() {
  const now = new Date();
  const minDep = minBookingDepartureInstant();
  return {
    timezone: APP_TIMEZONE,
    today: todayZonedDateValue(),
    nowWallClock: toWallClockIso(now),
    minBookingDeparture: toWallClockIso(minDep),
  };
}

export function formatZonedDateTime(d?: Date | string | null, fallback = "chưa hẹn giờ"): string {
  if (!d) return fallback;
  const p = zonedPartsFromInstant(new Date(d));
  return `${pad(p.hour)}:${pad(p.minute)} ${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

export function isZonedDateBeforeToday(wallOrIso: string): boolean {
  const day = wallOrIso.slice(0, 10);
  return day < todayZonedDateValue();
}
