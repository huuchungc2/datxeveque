import { Link } from "react-router-dom";
import { Car, MessageCircle, Phone } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { getContactInfo, useSiteSettings } from "../lib/useSiteSettings";

export function PostExperienceCta({ compact = false }: { compact?: boolean }) {
  const { settings } = useSiteSettings();
  const contact = getContactInfo(settings);

  if (compact) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-brand-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <div>
          <p className="font-bold text-ink-900">Cần đặt xe về quê?</p>
          <p className="mt-0.5 text-sm text-slate-600">Xe ghép, 4–7 chỗ — đón tận nơi.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/dat-xe" className="btn-primary inline-flex items-center gap-2 py-2 text-sm">
            <Car size={15} /> Đặt xe
          </Link>
          {contact.ready && (
            <>
              <a
                className="btn-secondary inline-flex items-center gap-2 py-2 text-sm"
                href={`tel:${contact.hotline}`}
                onClick={() => trackEvent("click_call", { source: "post" })}
              >
                <Phone size={15} /> Gọi
              </a>
              <a
                className="btn-secondary inline-flex items-center gap-2 py-2 text-sm"
                href={contact.zaloUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent("click_zalo", { source: "post" })}
              >
                <MessageCircle size={15} /> Zalo
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel rounded-3xl bg-gradient-to-br from-brand-900 to-slate-900 p-6 text-white shadow-xl">
      <h2 className="text-xl font-extrabold">Cần đặt xe về quê?</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">
        Hỗ trợ xe ghép, xe 4 chỗ, xe 7 chỗ, đưa đón tận nơi. Gửi yêu cầu online hoặc liên hệ hotline/Zalo để được xác nhận nhanh.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/dat-xe" className="btn-primary inline-flex items-center gap-2 py-2.5">
          <Car size={16} /> Đặt xe
        </Link>
        {contact.ready && (
          <>
            <a
              className="btn-secondary inline-flex items-center gap-2 py-2.5"
              href={`tel:${contact.hotline}`}
              onClick={() => trackEvent("click_call", { source: "post" })}
            >
              <Phone size={16} /> Gọi
            </a>
            <a
              className="btn-secondary inline-flex items-center gap-2 py-2.5"
              href={contact.zaloUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("click_zalo", { source: "post" })}
            >
              <MessageCircle size={16} /> Zalo
            </a>
          </>
        )}
      </div>
    </div>
  );
}
