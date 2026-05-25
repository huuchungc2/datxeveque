/** Chuẩn hóa base URL API (có /api). */
export function normalizeApiBase(value?: string) {
  const raw = (value || "http://localhost:4002").trim().replace(/\/+$/, "");
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

/**
 * Dev (Vite): `/api` + proxy.
 * VPS (Nginx cùng domain): khuyên `VITE_API_URL=same-origin` hoặc để trống → `/api`.
 * Khác subdomain: `VITE_API_URL=https://api.tenmien.vn`.
 */
export function resolveApiBase(): string {
  if (import.meta.env.DEV) {
    return "/api";
  }

  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!fromEnv || fromEnv === "same-origin") {
    return "/api";
  }

  const envBase = normalizeApiBase(fromEnv);

  if (typeof window === "undefined") return envBase;

  const pageHost = window.location.hostname;
  const envLooksLocal = !fromEnv || /localhost|127\.0\.0\.1/i.test(fromEnv);
  const pageIsLan =
    pageHost !== "localhost" &&
    pageHost !== "127.0.0.1" &&
    /^\d{1,3}(\.\d{1,3}){3}$/.test(pageHost);

  if (envLooksLocal && pageIsLan) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${pageHost}:4002/api`;
  }

  return envBase;
}
