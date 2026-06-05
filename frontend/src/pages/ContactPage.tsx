import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Clock, MapPin, MessageCircle, Phone, Send, HelpCircle } from "lucide-react";
import { ContactQuickBlock } from "../components/ContactQuickBlock";
import { trackEvent } from "../lib/analytics";
import { getContactInfo, useSiteSettings } from "../lib/useSiteSettings";
import { PublicHero } from "../components/ui/DesignKit";
import { api } from "../lib/api";

export default function ContactPage() {
  const { settings } = useSiteSettings();
  const contact = getContactInfo(settings);
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone || !form.message) return alert("Vui lòng nhập số điện thoại và nội dung tin nhắn.");
    setLoading(true);
    try {
      await api.post("/public/feedback", form);
      alert("Cảm ơn bạn đã gửi liên hệ. Tổng đài viên sẽ phản hồi sớm nhất nếu cần thiết!");
      setForm({ name: "", phone: "", message: "" });
    } catch {
      alert("Hệ thống tiếp nhận đang bận, vui lòng gọi Hotline để được xử lý trực tiếp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Liên hệ tổng đài đặt xe | {settings.brand_name || "Đặt Xe Về Quê"}</title></Helmet>
      <PublicHero
        title="Liên hệ đặt xe, gửi hàng và hỗ trợ chuyến"
        subtitle="Mọi thắc mắc về lộ trình, hủy chuyến hoặc khiếu nại chất lượng phục vụ, vui lòng liên kết qua các kênh trực tiếp dưới đây."
      />
      
      <div className="page py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          
          <div className="panel bg-white p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-extrabold text-ink-900 flex items-center gap-2">
              <HelpCircle className="text-brand-700" size={24} /> Gửi yêu cầu hỗ trợ trực tuyến
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Bạn có yêu cầu đặc biệt hoặc góp ý dịch vụ? Hãy điền form bên dưới, phòng vận hành sẽ liên hệ lại ngay.
            </p>
            
            <form className="mt-6 space-y-4" onSubmit={handleFeedback}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Họ và tên của bạn</label>
                  <input 
                    className="input" 
                    placeholder="Nguyễn Văn A" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Số điện thoại liên hệ (*)</label>
                  <input 
                    className="input" 
                    placeholder="0912xxxxxx" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Nội dung cần hỗ trợ hoặc phản hồi (*)</label>
                <textarea 
                  className="input" 
                  rows={4} 
                  placeholder="Nhập chi tiết nội dung cần hỗ trợ gửi tới tổng đài..."
                  value={form.message}
                  onChange={e => setForm({...form, message: e.target.value})}
                  required
                />
              </div>

              <button className="btn-primary" disabled={loading}>
                <Send size={16} /> {loading ? "Đang gửi đi..." : "Gửi thông tin liên hệ"}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="panel !p-6">
              <h2 className="text-lg font-extrabold text-ink-900 mb-4">Kết nối nhanh qua mạng xã hội</h2>
              <ContactQuickBlock variant="grid" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {contact.ready && (
                <a
                  href={`tel:${contact.hotline}`}
                  className="card flex items-center gap-4 bg-white p-4 transition hover:-translate-y-0.5"
                  onClick={() => trackEvent("click_call")}
                >
                  <div className="rounded-2xl bg-red-50 p-3 text-red-600 shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Hotline Đặt Vé</p>
                    <b className="text-base text-ink-900 tracking-tight">{contact.hotline}</b>
                  </div>
                </a>
              )}

              {contact.zaloPhone && (
                <a
                  href={contact.zaloUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="card flex items-center gap-4 bg-white p-4 transition hover:-translate-y-0.5"
                  onClick={() => trackEvent("click_zalo")}
                >
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 shrink-0">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Zalo Chăm Sóc</p>
                    <b className="text-base text-ink-900 tracking-tight">{contact.zaloPhone}</b>
                  </div>
                </a>
              )}

              <div className="card flex items-center gap-4 bg-white p-4 sm:col-span-2">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-600 shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Thời gian tiếp nhận cuộc gọi</p>
                  <b className="text-sm text-slate-700">Hoạt động liên tục 24/7 (Bao gồm cả ngày lễ Tết)</b>
                </div>
              </div>

              {settings.business_address && (
                <div className="card flex items-start gap-4 bg-white p-4 sm:col-span-2">
                  <div className="rounded-2xl bg-brand-50 p-3 text-brand-700 shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Văn phòng đại diện</p>
                    <b className="text-sm text-slate-800 leading-relaxed block mt-0.5">{settings.business_address}</b>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}