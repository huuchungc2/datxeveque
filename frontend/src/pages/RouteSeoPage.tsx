import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRight, Car, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { api, unwrapList } from "../lib/api";
import { SEOHead } from "../components/SEOHead";
import { EmptyState } from "../components/ui/DesignKit";
import { getBrandAssets, getContactInfo, useSiteSettings } from "../lib/useSiteSettings";
import {
  buildRouteFaqJsonLd,
  filterExistingLinks,
  getRouteSeoBySlug,
  type RouteSeoEntry,
} from "../data/routeSeoData";

function bookingHref(entry: RouteSeoEntry, apiRouteId?: number | null) {
  const params = new URLSearchParams();
  if (apiRouteId) params.set("routeId", String(apiRouteId));
  else params.set("route", entry.slug);
  const qs = params.toString();
  return `/dat-xe?${qs}`;
}

export default function RouteSeoPage({ slug: slugProp }: { slug?: string }) {
  const { slug: paramSlug } = useParams<{ slug?: string }>();
  const location = useLocation();
  const slug = slugProp || paramSlug || location.pathname.replace(/^\/+/, "");
  const entry = getRouteSeoBySlug(slug);
  const { settings } = useSiteSettings();
  const contact = getContactInfo(settings);
  const brand = getBrandAssets(settings);
  const [apiRouteId, setApiRouteId] = useState<number | null>(null);

  useEffect(() => {
    if (!entry) return;
    api
      .get("/routes")
      .then((res) => {
        const list = unwrapList(res.data);
        const match = list.find((r: { slug?: string }) => r.slug === entry.slug);
        setApiRouteId(match?.id ? Number(match.id) : null);
      })
      .catch(() => setApiRouteId(null));
  }, [entry]);

  const relatedLinks = useMemo(
    () => (entry ? filterExistingLinks(entry.relatedLinks) : []),
    [entry]
  );

  const faqJsonLd = useMemo(
    () => (entry ? buildRouteFaqJsonLd(entry.faqs) : undefined),
    [entry]
  );

  if (!entry) {
    return (
      <div className="page py-10">
        <EmptyState
          title="Không tìm thấy trang tuyến"
          subtitle="Đường dẫn không đúng hoặc tuyến chưa được cấu hình SEO."
          icon={<MapPin size={26} />}
        />
      </div>
    );
  }

  const bookUrl = bookingHref(entry, apiRouteId);

  return (
    <>
      <SEOHead
        title={entry.title}
        description={entry.description}
        canonicalPath={`/${entry.slug}`}
        ogImage={brand.logoUrl}
        jsonLd={faqJsonLd}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 py-12 text-white md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.12),transparent_40%)]" />
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-300">{entry.routeName}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{entry.h1}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">{entry.intro}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={bookUrl} className="btn-primary inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold shadow-lg">
              Đặt xe tuyến này <ArrowRight size={16} />
            </Link>
            {contact.ready && (
              <>
                <a
                  href={`tel:${contact.hotline}`}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/50 px-6 text-sm font-bold hover:bg-slate-800"
                >
                  <Phone size={16} className="text-brand-400" /> Gọi hotline
                </a>
                <a
                  href={contact.zaloUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/50 px-6 text-sm font-bold hover:bg-slate-800"
                >
                  <MessageCircle size={16} className="text-brand-400" /> Zalo
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="page max-w-4xl space-y-8 py-10">
        <section className="panel">
          <h2 className="text-xl font-extrabold text-slate-900">Khu vực đón tại Sài Gòn / TP.HCM</h2>
          <p className="mt-2 text-sm text-slate-600">Hỗ trợ đón khách tại các quận/huyện phổ biến:</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {entry.originAreas.map((area) => (
              <li key={area} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {area}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2 className="text-xl font-extrabold text-slate-900">Khu vực trả khách tại địa phương</h2>
          <p className="mt-2 text-sm text-slate-600">Trả tận nơi tại các điểm sau (có thể cập nhật trong cấu hình tuyến):</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {entry.destinationAreas.map((area) => (
              <li key={area} className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin size={14} className="shrink-0 text-brand-600" />
                {area}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2 className="text-xl font-extrabold text-slate-900">Loại xe hỗ trợ</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {entry.vehicleTypes.map((v) => (
              <li key={v} className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
                <Car size={18} className="mt-0.5 shrink-0 text-brand-700" />
                {v}
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2 className="text-xl font-extrabold text-slate-900">Quy trình đặt xe</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
            {entry.bookingSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="panel">
          <h2 className="text-xl font-extrabold text-slate-900">Từ khóa liên quan</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {entry.keywords.join(" · ")}
          </p>
        </section>

        <section className="panel">
          <h2 className="text-xl font-extrabold text-slate-900">Câu hỏi thường gặp</h2>
          <div className="mt-4 space-y-4">
            {entry.faqs.map((f) => (
              <div key={f.question} className="rounded-2xl border border-slate-100 bg-white p-4">
                <h3 className="font-bold text-slate-900">{f.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {relatedLinks.length > 0 && (
          <section className="panel">
            <h2 className="text-xl font-extrabold text-slate-900">Xem thêm</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {relatedLinks.map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-sm font-semibold text-brand-700 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel flex flex-col items-center gap-4 bg-gradient-to-br from-brand-50 to-white text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 shrink-0 text-brand-700" size={22} />
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Sẵn sàng đặt xe?</h2>
              <p className="mt-1 text-sm text-slate-600">Gửi yêu cầu online hoặc liên hệ hotline/Zalo để được xác nhận nhanh.</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link to={bookUrl} className="btn-primary py-2.5">
              Đặt xe ngay
            </Link>
            {contact.ready && (
              <>
                <a className="btn-secondary py-2.5" href={`tel:${contact.hotline}`}>
                  <Phone size={16} /> Gọi
                </a>
                <a className="btn-secondary py-2.5" href={contact.zaloUrl} target="_blank" rel="noreferrer">
                  <MessageCircle size={16} /> Zalo
                </a>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
