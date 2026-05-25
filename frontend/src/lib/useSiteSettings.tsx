import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

export type SiteSettings = Record<string, string>;

/** Chỉ fallback tên thương hiệu — SĐT/Zalo lấy từ DB, không hard-code số hiển thị. */
export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  brand_name: "Đặt Xe Về Quê",
  hotline_primary: "",
  zalo_phone: "",
  zalo_url: "",
  service_area: "",
};

function phoneFromZaloUrl(url: string) {
  const m = String(url || "").match(/zalo\.me\/(0?\d{9,10})/i);
  if (!m) return "";
  const digits = m[1];
  return digits.startsWith("0") ? digits : `0${digits}`;
}

export function getContactInfo(settings: SiteSettings) {
  const hotline = (settings.hotline_primary || "").trim();
  const zaloUrlRaw = (settings.zalo_url || "").trim();
  const zaloUrl = zaloUrlRaw || (hotline ? `https://zalo.me/${hotline}` : "");
  const zaloPhone = (settings.zalo_phone || "").trim() || phoneFromZaloUrl(zaloUrl) || hotline;
  const ready = Boolean(hotline);
  const footerLine = ready
    ? zaloPhone && zaloPhone !== hotline
      ? `Hotline: ${hotline} · Zalo: ${zaloPhone}`
      : `Hotline/Zalo: ${hotline}`
    : "";
  return { hotline, zaloPhone, zaloUrl, footerLine, ready };
}

type Ctx = {
  settings: SiteSettings;
  loading: boolean;
  reload: () => void;
};

const SiteSettingsContext = createContext<Ctx | null>(null);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(SITE_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/settings")
      .then((r) => setSettings({ ...SITE_SETTINGS_DEFAULTS, ...(r.data || {}) }))
      .catch(() => setSettings(SITE_SETTINGS_DEFAULTS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, reload: load }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (ctx) return ctx;
  const [settings, setSettings] = useState<SiteSettings>(SITE_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get("/settings")
      .then((r) => setSettings({ ...SITE_SETTINGS_DEFAULTS, ...(r.data || {}) }))
      .catch(() => setSettings(SITE_SETTINGS_DEFAULTS))
      .finally(() => setLoading(false));
  }, []);
  return { settings, loading, reload: () => {} };
}
