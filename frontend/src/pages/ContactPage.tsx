import { Helmet } from "react-helmet-async";
import { MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { useSiteSettings } from "../lib/useSiteSettings";

export default function ContactPage() {
  const { settings } = useSiteSettings();
  const hotline = settings.hotline_primary || "0900000000";
  const zalo = settings.zalo_phone || hotline;

  return (
    <>
      <Helmet><title>Liên hệ | {settings.brand_name}</title></Helmet>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Liên hệ</h1>
        <p className="mt-2 text-slate-600">Gọi hoặc nhắn Zalo để được tư vấn và xác nhận đơn nhanh.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <a href={`tel:${hotline}`} className="card flex items-center gap-4 transition hover:-translate-y-1">
            <Phone className="text-brand-700" size={32} />
            <div><p className="text-sm text-slate-600">Hotline</p><b className="text-lg">{hotline}</b></div>
          </a>
          <a href={settings.zalo_url || `https://zalo.me/${zalo}`} target="_blank" rel="noreferrer" className="card flex items-center gap-4 transition hover:-translate-y-1">
            <MessageCircle className="text-brand-700" size={32} />
            <div><p className="text-sm text-slate-600">Zalo</p><b className="text-lg">{zalo}</b></div>
          </a>
          {settings.email && (
            <div className="card flex items-center gap-4">
              <Mail className="text-brand-700" size={32} />
              <div><p className="text-sm text-slate-600">Thư điện tử</p><b>{settings.email}</b></div>
            </div>
          )}
          {settings.business_address && (
            <div className="card flex items-center gap-4">
              <MapPin className="text-brand-700" size={32} />
              <div><p className="text-sm text-slate-600">Địa chỉ</p><b>{settings.business_address}</b></div>
            </div>
          )}
        </div>
        {settings.working_hours && <p className="mt-6 text-sm text-slate-600">Giờ làm việc: {settings.working_hours}</p>}
      </div>
    </>
  );
}
