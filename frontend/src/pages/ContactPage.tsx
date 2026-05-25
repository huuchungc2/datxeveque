import { Helmet } from "react-helmet-async";
import { Mail, MapPin } from "lucide-react";
import { ContactQuickBlock } from "../components/ContactQuickBlock";
import { useSiteSettings } from "../lib/useSiteSettings";

export default function ContactPage() {
  const { settings } = useSiteSettings();

  return (
    <>
      <Helmet>
        <title>Liên hệ | {settings.brand_name || "Đặt Xe Về Quê"}</title>
      </Helmet>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Liên hệ</h1>
        <p className="mt-2 text-slate-600">Gọi hoặc nhắn Zalo theo số đã cấu hình trong admin.</p>
        <div className="mt-8">
          <ContactQuickBlock variant="grid" />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {settings.email && (
            <div className="card flex items-center gap-4">
              <Mail className="text-brand-700" size={32} />
              <div>
                <p className="text-sm text-slate-600">Thư điện tử</p>
                <b>{settings.email}</b>
              </div>
            </div>
          )}
          {settings.business_address && (
            <div className="card flex items-center gap-4">
              <MapPin className="text-brand-700" size={32} />
              <div>
                <p className="text-sm text-slate-600">Địa chỉ</p>
                <b>{settings.business_address}</b>
              </div>
            </div>
          )}
        </div>
        {settings.working_hours && (
          <p className="mt-6 text-sm text-slate-600">Giờ làm việc: {settings.working_hours}</p>
        )}
      </div>
    </>
  );
}
