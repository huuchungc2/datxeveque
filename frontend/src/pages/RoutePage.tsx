import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { HelpCircle, MapPinned, ShieldCheck, Clock, CheckCircle, ArrowRight, PhoneCall, Star } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { api } from "../lib/api";
import BookingPage from "./BookingPage";
import { EmptyState } from "../components/ui/DesignKit";
import { getContactInfo, useSiteSettings } from "../lib/useSiteSettings";

export default function RoutePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { settings } = useSiteSettings();
  const contact = getContactInfo(settings);
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/routes/${slug}`)
      .then(r => setRoute(r.data))
      .catch(() => setRoute(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const scrollToBooking = () => {
    const element = document.getElementById("booking-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="page py-10">
        <EmptyState title="Đang tải tuyến" subtitle="Hệ thống đang lấy thông tin tuyến đường." icon={<MapPinned size={26} />} />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="page py-10">
        <EmptyState title="Không tìm thấy tuyến" subtitle="Tuyến này chưa được cấu hình hoặc đường dẫn không đúng." icon={<MapPinned size={26} />} />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{route.seoTitle || `Xe Khách Tuyến ${route.name} | Đặt Vé Nhanh`}</title>
        <meta name="description" content={route.seoDescription || `Dịch vụ xe ghép, bao xe riêng, ký gửi hàng hóa hai chiều chuyên nghiệp tuyến ${route.name}. Xe chạy liên tục, đón trả tận nơi.`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": route.name,
            "areaServed": [route.fromName, route.toName]
          })}
        </script>
      </Helmet>

      {/* 1. HERO SECTION BANNER TUYẾN ĐƯỜNG */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 py-12 text-white md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.12),transparent_40%)]" />
        <div className="mx-auto max-w-5xl px-4 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-cta-500/10 px-3 py-1 text-xs font-bold text-cta-400 backdrop-blur-md">
            <Star size={12} className="fill-cta-400" /> Tuyến xe chạy cố định mỗi ngày
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Dịch Vụ Xe Khách Tuyến {route.name}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base leading-relaxed">
            Hỗ trợ đưa đón tận nơi từ xóm làng đến trung tâm thành phố. Cam kết chạy đúng giờ, không bắt khách dọc đường, không tăng giá ngày lễ tết.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={scrollToBooking} className="h-12 btn-primary rounded-xl px-6 text-sm font-bold shadow-lg flex items-center gap-2">
              Đặt vé tuyến này ngay <ArrowRight size={16} />
            </button>
            {contact.ready && (
              <a
                href={`tel:${contact.hotline}`}
                className="h-12 btn-ghost !bg-transparent !border-slate-700 !text-white hover:!bg-slate-800 rounded-xl px-6 text-sm font-bold flex items-center gap-2"
                onClick={() =>
                  trackEvent("click_call", {
                    source: "route_page",
                    route_slug: slug,
                  })
                }
              >
                <PhoneCall size={16} className="text-brand-400" /> Tổng đài: {contact.hotline}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 2. THÔNG TIN LỘ TRÌNH VÀ KHUNG GIỜ CHẠY */}
      <section className="page max-w-5xl py-8">
        <div className="grid gap-6 md:grid-cols-[1.1fr_.9fr]">
          
          <div className="space-y-6">
            {/* Khối thông tin lộ trình */}
            <div className="panel shadow-sm">
              <div className="flex items-center gap-3 border-b pb-4 mb-4">
                <div className="p-2 bg-brand-50 rounded-xl text-brand-700">
                  <MapPinned size={20} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">Chi tiết tuyến đường</h2>
              </div>
              <p className="leading-relaxed text-sm text-slate-600 whitespace-pre-line">
                {route.content || `Dịch vụ vận chuyển hành khách và hàng hóa hai chiều chất lượng cao trên tuyến đường ${route.name}.\n\n• Điểm đi: ${route.fromName}\n• Điểm đến: ${route.toName}\n\nHệ thống hỗ trợ đa dạng giải pháp xe ghép tiết kiệm theo người hoặc thuê trọn gói xe riêng từ 4 đến 16 chỗ đời mới.`}
              </p>
            </div>

            {/* Khung giờ chạy dự kiến */}
            <div className="panel shadow-sm">
              <div className="flex items-center gap-3 border-b pb-4 mb-4">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                  <Clock size={20} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">Lịch trình & Giờ khởi hành</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <b className="text-slate-900 block mb-1">Chiều đi hằng ngày</b>
                  <p className="text-slate-600 font-medium">Khởi hành từ {route.fromName}: Chạy liên tục từ 04:00 sáng đến 20:00 tối (Cách 2 tiếng có 1 chuyến).</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <b className="text-slate-900 block mb-1">Chiều về hằng ngày</b>
                  <p className="text-slate-600 font-medium">Khởi hành từ {route.toName}: Chạy liên tục từ 05:00 sáng đến 21:00 đêm (Nhận đón tận nhà tiện lợi).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Khối cam kết dịch vụ */}
          <div className="space-y-4">
            <div className="card shadow-sm border-emerald-100 bg-emerald-50/20">
              <div className="flex items-start gap-3">
                <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={22} />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Xác nhận trước chuyến đi</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Nhân viên tổng đài luôn gọi điện xác nhận điểm đón, báo giá tổng trước khi điều xe đón. Tuyệt đối không có chi phí ẩn.</p>
                </div>
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-brand-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Tài xế bản địa văn minh</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Đội ngũ lái xe quen đường, chạy xe điềm đạm, lịch sự, nhiệt tình hỗ trợ khuân vác hành lý của hành khách lên xuống xe.</p>
                </div>
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="flex items-start gap-3">
                <HelpCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Hỗ trợ hủy lịch miễn phí</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Thay đổi kế hoạch đột xuất? Bạn chỉ cần gọi điện báo trước 1 tiếng, hệ thống hủy chuyến hoàn toàn không tính phí hủy đơn.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. ĐOẠN FORM ĐẶT XE ĐƯỢC ĐÍNH KÈM SẴN ROUTE ID */}
      <section id="booking-section" className="bg-slate-100/60 border-t border-slate-200 py-6">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900">Form Đăng Ký Vé Trực Tuyến</h2>
            <p className="text-xs text-slate-500 mt-1">Thông tin đăng ký của bạn sẽ được chuyển thẳng đến bộ phận điều phối tuyến {route.name}</p>
          </div>
          <BookingPage title={route.name} type="SHARED_RIDE" defaultRouteId={route.id} />
        </div>
      </section>
    </>
  );
}