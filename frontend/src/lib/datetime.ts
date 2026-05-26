/** Date/time helpers hiển thị DƯƠNG LỊCH Việt Nam, không phụ thuộc locale trình duyệt. */
const pad = (n: number) => String(n).padStart(2, "0");

function toValidDate(v?: string | Date | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Giá trị cho input type="datetime-local" (local timezone). */
export function toDatetimeLocalValue(v?: string | Date | null): string {
  const d = toValidDate(v);
  if (!d) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Dương lịch: dd/MM/yyyy */
export function formatDisplayDate(v?: string | Date | null, fallback = "Chưa có ngày"): string {
  const d = toValidDate(v);
  if (!d) return fallback;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Dương lịch: HH:mm dd/MM/yyyy */
export function formatDisplayDateTime(v?: string | Date | null, fallback = "Chưa có giờ đi"): string {
  const d = toValidDate(v);
  if (!d) return fallback;
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${formatDisplayDate(d, fallback)}`;
}

/** Dương lịch ngắn cho chart: dd/MM */
export function formatShortDate(v?: string | Date | null): string {
  const d = toValidDate(v);
  if (!d) return "--/--";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Hiển thị thêm dưới input date/datetime-local để người dùng thấy rõ dương lịch. */
export function formatInputDateTimePreview(v?: string | Date | null): string {
  const d = toValidDate(v);
  if (!d) return "Dương lịch: chưa chọn ngày giờ";
  return `Dương lịch: ${formatDisplayDateTime(d)}`;
}

export function fmtDepartureTime(v?: string | Date | null): string {
  return formatDisplayDateTime(v, "Chưa có giờ đi");
}

/** Mặc định: ngày mai 06:00 (local). */
export function defaultDepartureLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(6, 0, 0, 0);
  return toDatetimeLocalValue(d);
}
