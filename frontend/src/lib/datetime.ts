/** Date/time helpers — múi giờ VN (Asia/Ho_Chi_Minh), khớp server. */
export const APP_TIMEZONE = "Asia/Ho_Chi_Minh";

let serverAppTime: AppTimePayload | null = null;

/** Gọi từ appTime.ts sau khi tải /public/app-time. */
export function setServerAppTime(payload: AppTimePayload | null) {
  serverAppTime = payload;
}

export type AppTimePayload = {
  timezone: string;
  today: string;
  nowWallClock: string;
  minBookingDeparture: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

export type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/** Chuỗi từ input datetime-local / form — không có giây hay múi giờ, coi là giờ VN. */
const LOCAL_WALL_CLOCK_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

const zonedFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function zonedPartsFromInstant(d: Date): LocalDateTimeParts {
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

/** Fallback khi chưa gọi được /public/app-time. */
export function buildAppTimeFallback(): AppTimePayload {
  const now = new Date();
  const p = zonedPartsFromInstant(now);
  const today = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  const min = new Date(now.getTime() + 60 * 60 * 1000);
  const mp = zonedPartsFromInstant(min);
  return {
    timezone: APP_TIMEZONE,
    today,
    nowWallClock: `${today}T${pad(mp.hour)}:${pad(mp.minute)}`,
    minBookingDeparture: `${mp.year}-${pad(mp.month)}-${pad(mp.day)}T${pad(mp.hour)}:${pad(mp.minute)}`,
  };
}

/** Parse: form wall-clock VN, hoặc ISO instant → phần giờ VN. */
export function parseLocalDateTimeParts(v?: string | Date | null): LocalDateTimeParts | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return zonedPartsFromInstant(v);
  }
  const s = String(v).trim();
  const m = s.match(LOCAL_WALL_CLOCK_RE);
  if (m) {
    return {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3]),
      hour: m[4] != null ? Number(m[4]) : 0,
      minute: m[5] != null ? Number(m[5]) : 0,
    };
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return zonedPartsFromInstant(d);
}

/** Giá trị cho input type="datetime-local" (giờ VN). */
export function toDatetimeLocalValue(v?: string | Date | null): string {
  const p = parseLocalDateTimeParts(v);
  if (!p) return "";
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Dương lịch: dd/MM/yyyy */
export function formatDisplayDate(v?: string | Date | null, fallback = "Chưa có ngày"): string {
  const p = parseLocalDateTimeParts(v);
  if (!p) return fallback;
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

/** Dương lịch: HH:mm dd/MM/yyyy */
export function formatDisplayDateTime(v?: string | Date | null, fallback = "Chưa có giờ đi"): string {
  const p = parseLocalDateTimeParts(v);
  if (!p) return fallback;
  return `${pad(p.hour)}:${pad(p.minute)} ${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

/** Hiển thị giờ đi đơn — ưu tiên scheduledAtLocal từ server. */
export function fmtBookingScheduledAt(booking: {
  scheduledAt?: string | null;
  scheduledAtLocal?: string | null;
}): string {
  if (booking.scheduledAtLocal) return formatDisplayDateTime(booking.scheduledAtLocal);
  return formatDisplayDateTime(booking.scheduledAt, "Chưa có giờ đi");
}

/** Dương lịch ngắn cho chart: dd/MM */
export function formatShortDate(v?: string | Date | null): string {
  const p = parseLocalDateTimeParts(v);
  if (!p) return "--/--";
  return `${pad(p.day)}/${pad(p.month)}`;
}

export function formatInputDateTimePreview(v?: string | Date | null): string {
  const p = parseLocalDateTimeParts(v);
  if (!p) return "Dương lịch: chưa chọn ngày giờ";
  return `Dương lịch: ${formatDisplayDateTime(v)}`;
}

export function fmtDepartureTime(v?: string | Date | null): string {
  return formatDisplayDateTime(v, "Chưa có giờ đi");
}

/** Hôm nay theo server (hoặc VN fallback). */
export function todayLocalDateValue(): string {
  return serverAppTime?.today ?? buildAppTimeFallback().today;
}

export function nowDepartureLocal(): string {
  return serverAppTime?.nowWallClock ?? buildAppTimeFallback().nowWallClock;
}

export function defaultDepartureLocal(): string {
  const start = localPartsToDate(parseLocalDateTimeParts(todayLocalDateValue())!);
  const tomorrow = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const p = zonedPartsFromInstant(tomorrow);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T06:00`;
}

export function localPartsToDate(p: LocalDateTimeParts): Date {
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour - 7, p.minute, 0, 0));
}

function minBookingDepartureWallClock(): string {
  return serverAppTime?.minBookingDeparture ?? buildAppTimeFallback().minBookingDeparture;
}

export function minBookingDepartureDate(): Date {
  const p = parseLocalDateTimeParts(minBookingDepartureWallClock());
  return p ? localPartsToDate(p) : new Date(Date.now() + 60 * 60 * 1000);
}

export function minBookingDepartureParts(): LocalDateTimeParts {
  const p = parseLocalDateTimeParts(minBookingDepartureWallClock());
  return p!;
}

export function minBookingDepartureLocal(): string {
  return minBookingDepartureWallClock();
}

export function suggestedBookingDepartureHint(): string {
  const p = minBookingDepartureParts();
  return `Gợi ý hôm nay: từ ${pad(p.hour)}:${pad(p.minute)} (sau giờ hiện tại 1 giờ, theo giờ hệ thống)`;
}

export function resolveBookingScheduledAt(value?: string | null): string {
  if (!value?.trim()) return minBookingDepartureLocal();
  if (isLocalDateBeforeToday(value)) return value;
  if (isLocalDateTimeBeforeMinBooking(value)) return minBookingDepartureLocal();
  return toDatetimeLocalValue(value) || minBookingDepartureLocal();
}

function startOfLocalDayFromParts(p: LocalDateTimeParts): Date {
  return localPartsToDate({ ...p, hour: 0, minute: 0 });
}

export function isLocalDateBeforeToday(value?: string | null): boolean {
  const day = (value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return day < todayLocalDateValue();
}

export function isLocalDateTimeBeforeMinBooking(value?: string | null): boolean {
  const p = parseLocalDateTimeParts(value);
  if (!p) return false;
  const chosen = localPartsToDate(p);
  const today = todayLocalDateValue();
  const chosenDay = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  if (chosenDay < today) return true;
  if (chosenDay > today) return false;
  return chosen.getTime() < minBookingDepartureDate().getTime();
}

/** @deprecated Dùng isLocalDateTimeBeforeMinBooking cho form đặt xe. */
export function isLocalDateTimeBeforeNow(value?: string | null): boolean {
  return isLocalDateTimeBeforeMinBooking(value);
}
