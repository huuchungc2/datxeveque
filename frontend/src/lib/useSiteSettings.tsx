import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

export type SiteSettings = Record<string, string>;

export const SITE_SETTINGS_DEFAULTS: SiteSettings = {
  brand_name: "Đặt Xe Về Quê",
  hotline_primary: "0900000000",
  zalo_phone: "0900000000",
  zalo_url: "https://zalo.me/0900000000",
  service_area: "Sài Gòn ⇄ Đức Linh, Tánh Linh",
};

export function getContactInfo(settings: SiteSettings) {
  const hotline = settings.hotline_primary || SITE_SETTINGS_DEFAULTS.hotline_primary!;
  const zaloUrl = settings.zalo_url || `https://zalo.me/${hotline}`;
  const zaloPhone = settings.zalo_phone || hotline;
  const footerLine = settings.zalo_url
    ? `Hotline: ${hotline} · Zalo: ${zaloPhone}`
    : `Hotline/Zalo: ${hotline}`;
  return { hotline, zaloPhone, zaloUrl, footerLine };
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
