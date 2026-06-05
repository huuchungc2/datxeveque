function normalizeBaseUrl(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  const fromEnv = normalizeBaseUrl(import.meta.env.VITE_SITE_URL);
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin);
  }
  return "";
}

export function toCanonicalUrl(canonicalPath?: string): string | undefined {
  const base = getSiteUrl();
  const path = String(canonicalPath || "").trim();
  if (!path) return base || undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (!base) return undefined;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function toAbsoluteUrl(maybePath?: string): string | undefined {
  const value = String(maybePath || "").trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  const base = getSiteUrl();
  if (!base) return undefined;
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

