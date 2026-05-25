/** Giá trị cho input type="datetime-local" (local timezone). */
export function toDatetimeLocalValue(v?: string | Date | null): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDepartureTime(v?: string | Date | null): string {
  if (!v) return "Chưa có giờ đi";
  return new Date(v).toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Mặc định: ngày mai 06:00 (local). */
export function defaultDepartureLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(6, 0, 0, 0);
  return toDatetimeLocalValue(d);
}
