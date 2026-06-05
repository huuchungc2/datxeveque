import { MessageCircle, Phone } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { getContactInfo, useSiteSettings } from "../lib/useSiteSettings";

type Props = {
  title?: string;
  /** card = khối Hỗ trợ nhanh; grid = như trang Liên hệ */
  variant?: "card" | "grid" | "compact";
  className?: string;
  /** Nguồn click cho GA4: header | footer | post | route_page */
  analyticsSource?: string;
};

/** Hotline / Zalo từ Cài đặt admin (`site_settings`) — không hard-code SĐT. */
export function ContactQuickBlock({
  title = "Hỗ trợ nhanh",
  variant = "card",
  className = "",
  analyticsSource,
}: Props) {
  const { settings, loading } = useSiteSettings();
  const contact = getContactInfo(settings);
  const clickParams = analyticsSource ? { source: analyticsSource } : undefined;
  const onCallClick = () => trackEvent("click_call", clickParams);
  const onZaloClick = () => trackEvent("click_zalo", clickParams);

  if (loading) {
    return (
      <div className={className}>
        {title && variant === "card" && <b>{title}</b>}
        <p className="mt-2 text-sm text-slate-500">Đang tải thông tin liên hệ…</p>
      </div>
    );
  }

  if (!contact.ready) {
    return (
      <div className={className}>
        {title && variant === "card" && <b>{title}</b>}
        <p className="mt-2 text-sm text-amber-700">Chưa cấu hình hotline trong admin → Cài đặt.</p>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className={`grid gap-4 md:grid-cols-2 ${className}`}>
        <a href={`tel:${contact.hotline}`} className="card flex items-center gap-4 transition hover:-translate-y-1" onClick={onCallClick}>
          <Phone className="text-brand-700" size={32} />
          <div>
            <p className="text-sm text-slate-600">Hotline</p>
            <b className="text-lg">{contact.hotline}</b>
          </div>
        </a>
        <a
          href={contact.zaloUrl}
          target="_blank"
          rel="noreferrer"
          className="card flex items-center gap-4 transition hover:-translate-y-1"
          onClick={onZaloClick}
        >
          <MessageCircle className="text-brand-700" size={32} />
          <div>
            <p className="text-sm text-slate-600">Zalo</p>
            <b className="text-lg">{contact.zaloPhone}</b>
          </div>
        </a>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <p className={`text-sm text-slate-600 ${className}`}>
        Gọi{" "}
        <a className="font-semibold text-brand-700" href={`tel:${contact.hotline}`} onClick={onCallClick}>
          {contact.hotline}
        </a>
        {" · "}
        <a
          className="font-semibold text-brand-700"
          href={contact.zaloUrl}
          target="_blank"
          rel="noreferrer"
          onClick={onZaloClick}
        >
          Zalo
        </a>
      </p>
    );
  }

  return (
    <div className={className}>
      <b>{title}</b>
      <p className="mt-2 text-slate-600">{contact.footerLine}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn-secondary py-2 text-sm" href={`tel:${contact.hotline}`} onClick={onCallClick}>
          <Phone size={16} /> Gọi {contact.hotline}
        </a>
        <a
          className="btn-secondary py-2 text-sm"
          href={contact.zaloUrl}
          target="_blank"
          rel="noreferrer"
          onClick={onZaloClick}
        >
          <MessageCircle size={16} /> Zalo
        </a>
      </div>
      <p className="mt-1 text-sm text-slate-500">Gửi form xong nhân viên sẽ gọi lại xác nhận.</p>
    </div>
  );
}
