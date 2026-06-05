const MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? "").trim();

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

let initialized = false;

export type AnalyticsEventParams = {
  page_path?: string;
  route_slug?: string;
  post_slug?: string;
  source?: string;
};

function currentPagePath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/** Chỉ bật khi có VITE_GA_MEASUREMENT_ID. */
export function isGaEnabled(): boolean {
  return Boolean(MEASUREMENT_ID);
}

/** Tải gtag.js một lần; không làm gì nếu thiếu env. */
export function initGA(): void {
  if (!MEASUREMENT_ID || initialized || typeof window === "undefined") return;
  initialized = true;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

/** Gửi page_view thủ công khi React Router đổi route. */
export function trackPageView(path: string): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  const pagePath = path || "/";
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
  });
}

/** Gửi custom event — không gửi PII (tên, SĐT, địa chỉ, ghi chú). */
export function trackEvent(eventName: string, params?: AnalyticsEventParams): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  const payload: Record<string, string> = {
    page_path: params?.page_path ?? currentPagePath(),
  };
  if (params?.route_slug) payload.route_slug = params.route_slug;
  if (params?.post_slug) payload.post_slug = params.post_slug;
  if (params?.source) payload.source = params.source;
  window.gtag("event", eventName, payload);
}
