import { MessageCircle, Phone } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { getContactInfo, useSiteSettings } from "../lib/useSiteSettings";

export function PostExperienceCta({ compact = false }: { compact?: boolean }) {
  const { settings } = useSiteSettings();
  const contact = getContactInfo(settings);

  if (compact) {
    return (
      <div className="rounded-2xl bg-brand-50 px-4 py-5 md:px-5">
        <p className="text-base font-bold leading-snug text-ink-900">
          Cần đặt xe về quê cho gia đình có người già hoặc trẻ nhỏ?
        </p>
        {contact.ready ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className="btn-primary inline-flex items-center gap-2 py-2.5 text-sm"
              href={`tel:${contact.hotline}`}
              onClick={() => trackEvent("click_call", { source: "post" })}
            >
              <Phone size={16} /> Gọi ngay
            </a>
            <a
              className="btn-secondary inline-flex items-center gap-2 py-2.5 text-sm"
              href={contact.zaloUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("click_zalo", { source: "post" })}
            >
              <MessageCircle size={16} /> Nhắn Zalo
            </a>
          </div>
        ) : (
          <p className="mt-3 text-sm text-amber-700">Chưa cấu hình hotline trong admin → Cài đặt.</p>
        )}
      </div>
    );
  }

  return (
    <div className="panel rounded-3xl bg-gradient-to-br from-brand-900 to-slate-900 p-6 text-white shadow-xl">
      <h2 className="text-xl font-extrabold">Cần đặt xe về quê cho gia đình có người già hoặc trẻ nhỏ?</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Hỗ trợ xe ghép, xe 4 chỗ, xe 7 chỗ, đưa đón tận nơi. Liên hệ hotline/Zalo để được xác nhận nhanh.
      </p>
      {contact.ready ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            className="btn-primary inline-flex items-center gap-2 py-2.5"
            href={`tel:${contact.hotline}`}
            onClick={() => trackEvent("click_call", { source: "post" })}
          >
            <Phone size={16} /> Gọi ngay
          </a>
          <a
            className="btn-secondary inline-flex items-center gap-2 py-2.5"
            href={contact.zaloUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent("click_zalo", { source: "post" })}
          >
            <MessageCircle size={16} /> Nhắn Zalo
          </a>
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-200">Chưa cấu hình hotline trong admin → Cài đặt.</p>
      )}
    </div>
  );
}
