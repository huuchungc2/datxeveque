import { Helmet } from "react-helmet-async";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactQuickBlock } from "../components/ContactQuickBlock";
import { useSiteSettings } from "../lib/useSiteSettings";
import { PublicHero } from "../components/ui/DesignKit";

export default function ContactPage() {
  const { settings } = useSiteSettings();

  return (
    <>
      <Helmet><title>Liên hệ | {settings.brand_name || "Đặt Xe Về Quê"}</title></Helmet>
      <PublicHero
        title="Liên hệ đặt xe, gửi hàng và hỗ trợ chuyến"
        subtitle="Gọi hoặc nhắn Zalo để xác nhận lịch xe, điểm đón/trả, gửi hàng và các dịch vụ về quê."
      />
      <div className="page py-10">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="panel">
            <h2 className="text-2xl font-extrabold">Kênh liên hệ nhanh</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Ưu tiên gọi/Zalo khi cần xác nhận chuyến gấp hoặc thay đổi điểm đón.</p>
            <div className="mt-6"><ContactQuickBlock variant="grid" /></div>
          </div>
          <div className="grid gap-4">
            {settings.hotline && <div className="card flex items-center gap-4"><Phone className="text-brand-700" size={32} /><div><p className="text-sm text-slate-600">Hotline</p><b>{settings.hotline}</b></div></div>}
            {settings.zalo_phone && <div className="card flex items-center gap-4"><MessageCircle className="text-brand-700" size={32} /><div><p className="text-sm text-slate-600">Zalo</p><b>{settings.zalo_phone}</b></div></div>}
            {settings.email && <div className="card flex items-center gap-4"><Mail className="text-brand-700" size={32} /><div><p className="text-sm text-slate-600">Thư điện tử</p><b>{settings.email}</b></div></div>}
            {settings.business_address && <div className="card flex items-center gap-4"><MapPin className="text-brand-700" size={32} /><div><p className="text-sm text-slate-600">Địa chỉ</p><b>{settings.business_address}</b></div></div>}
            {settings.working_hours && <div className="card flex items-center gap-4"><Clock className="text-orange-600" size={32} /><div><p className="text-sm text-slate-600">Giờ làm việc</p><b>{settings.working_hours}</b></div></div>}
          </div>
        </div>
      </div>
    </>
  );
}
