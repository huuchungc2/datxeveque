import { useEffect, useState } from "react";
import { api } from "./api";

export type SiteSettings = Record<string, string>;

const defaults: SiteSettings = {
  brand_name: "Đặt Xe Về Quê",
  hotline_primary: "0900000000",
  zalo_phone: "0900000000",
  zalo_url: "https://zalo.me/0900000000",
  service_area: "Sài Gòn ⇄ Đức Linh, Tánh Linh",
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/settings")
      .then((r) => setSettings({ ...defaults, ...r.data }))
      .catch(() => setSettings(defaults))
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}
