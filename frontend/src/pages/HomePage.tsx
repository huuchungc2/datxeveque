import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Box, ShoppingBasket, Users, MapPin, ArrowRightLeft, Calendar } from "lucide-react";
import { api, unwrapList } from "../lib/api";
import {
  minBookingDepartureLocal,
  resolveBookingScheduledAt,
  suggestedBookingDepartureHint,
} from "../lib/datetime";
import { FieldError } from "../components/ui/FieldError";
import { GregorianDateTimeInput } from "../components/ui/GregorianDateInputs";
import { focusFormField, inputInvalidClass } from "../lib/formFieldFocus";
import { coreBookableServices } from "../routes/bookableServices";
import { SEOHead } from "../components/SEOHead";
import { getBrandAssets, useSiteSettings } from "../lib/useSiteSettings";

const serviceIcons: Record<string, typeof Car> = {
  SHARED_RIDE: Car,
  PRIVATE_RIDE: Car,
  CARGO: Box,
  MARKET: ShoppingBasket,
  CONTRACT: Users,
};

const serviceDesc: Record<string, string> = {
  SHARED_RIDE: "Gom khách theo tuyến, giá tiết kiệm",
  PRIVATE_RIDE: "Xe riêng 4–7–16 chỗ, chủ động hành trình",
  CARGO: "Nhận hàng 2 chiều, giao tận tay",
  MARKET: "Mua đồ quê, đóng gói gửi lên phố",
  CONTRACT: "Thuê xe du lịch, hợp đồng riêng",
};

export default function HomePage() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<any[]>([]);
  const { settings } = useSiteSettings();
  const brand = getBrandAssets(settings);
  
  const [searchForm, setSearchForm] = useState({
    routeId: "",
    type: "SHARED_RIDE",
    scheduledAt: minBookingDepartureLocal(),
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const routeSelectRef = useRef<HTMLSelectElement>(null);
  const scheduledAtTriggerRef = useRef<HTMLButtonElement>(null);

  const bookingQuery = () => {
    const params = new URLSearchParams();
    if (searchForm.routeId) params.set("routeId", String(searchForm.routeId));
    const scheduledAt = resolveBookingScheduledAt(searchForm.scheduledAt);
    if (scheduledAt) params.set("scheduledAt", scheduledAt);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  useEffect(() => {
    api.get("/routes").then((res) => {
      setRoutes(unwrapList(res.data));
    }).catch(() => setRoutes([]));
  }, []);

  const markSearchFieldError = (key: string, message: string) => {
    setFieldErrors({ [key]: message });
    const el = key === "routeId" ? routeSelectRef.current : scheduledAtTriggerRef.current;
    focusFormField(el);
    return false;
  };

  const clearSearchFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateSearchForm = () => {
    setFieldErrors({});
    if (!searchForm.routeId) {
      return markSearchFieldError("routeId", "Vui lòng chọn tuyến đường trước khi tìm chuyến.");
    }
    if (!searchForm.scheduledAt) {
      return markSearchFieldError("scheduledAt", "Vui lòng chọn ngày giờ đi dự kiến.");
    }
    return true;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSearchForm()) return;

    const selectedService = coreBookableServices.find((s) => s.type === searchForm.type);
    const basePath = selectedService?.path ?? "/dat-xe";
    const scheduledAt = resolveBookingScheduledAt(searchForm.scheduledAt);
    const params = new URLSearchParams();
    params.set("routeId", String(searchForm.routeId));
    if (scheduledAt) params.set("scheduledAt", scheduledAt);
    navigate(`${basePath}?${params.toString()}`);
  };

  return (
    <>
      <SEOHead
        title="Đặt Xe Về Quê | Xe 4 Chỗ, 7 Chỗ, Xe Ghép Tận Nơi"
        description="Đặt xe về quê nhanh chóng, an toàn, tiện lợi. Hỗ trợ xe 4 chỗ, 7 chỗ, xe ghép, gửi hàng, đi chợ quê, đưa đón tận nơi."
        canonicalPath="/"
        ogImage={brand.logoUrl}
      />

      {/* 1. HERO SECTION & FORM TÌM KIẾM NHANH */}
      <section className="relative bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 py-12 text-white md:py-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.15),transparent_40%)]" />
        
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-block rounded-full bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-400 backdrop-blur-md">
            🚀 Giải pháp về quê an toàn & tiết kiệm
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Đặt Xe Về Quê Nhanh Chóng
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
            Hỗ trợ xe ghép tiện chuyến, bao xe riêng và ký gửi hàng hóa hai chiều. Nhận xe chạy ngay sau khi xác nhận.
          </p>

          <form
            noValidate
            onSubmit={handleSearchSubmit}
            className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left text-ink-900 shadow-2xl backdrop-blur-lg sm:p-5"
          >
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-950 p-1">
              {coreBookableServices.map((s) => (
                <button
                  key={s.type}
                  type="button"
                  onClick={() => {
                    setFieldErrors({});
                    setSearchForm({ ...searchForm, type: s.type });
                  }}
                  className={`min-w-[100px] flex-1 rounded-lg px-3 py-2 text-center text-xs font-bold transition-all ${
                    searchForm.type === s.type
                      ? "bg-cta-500 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {s.menuLabel}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
              <div className="flex flex-col gap-1.5 md:col-span-4">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <MapPin size={14} className="text-brand-400" /> Tuyến đường
                </label>
                <select
                  ref={routeSelectRef}
                  value={searchForm.routeId}
                  onChange={(e) => {
                    clearSearchFieldError("routeId");
                    setSearchForm({ ...searchForm, routeId: e.target.value });
                  }}
                  aria-invalid={!!fieldErrors.routeId || undefined}
                  aria-describedby={fieldErrors.routeId ? "home-routeId-err" : undefined}
                  className={`h-12 w-full rounded-xl border bg-white px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 ${inputInvalidClass(!!fieldErrors.routeId)}`}
                >
                  <option value="">-- Chọn tuyến đường đi --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <FieldError id="home-routeId-err" message={fieldErrors.routeId} className="text-red-300" />
              </div>

              <div className="relative z-20 flex flex-col gap-1.5 md:col-span-5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <Calendar size={14} className="text-brand-400" /> Ngày giờ đi
                </label>
                <GregorianDateTimeInput
                  suggestPlus1h
                  compact
                  triggerRef={scheduledAtTriggerRef}
                  invalid={!!fieldErrors.scheduledAt}
                  aria-describedby={fieldErrors.scheduledAt ? "home-scheduledAt-err" : undefined}
                  className="[&_.input]:!h-12 [&_.input]:!rounded-xl [&_.input]:!border-slate-200 [&_.input]:!bg-white [&_.input]:!py-0"
                  value={searchForm.scheduledAt}
                  onChange={(scheduledAt) => {
                    clearSearchFieldError("scheduledAt");
                    setSearchForm({ ...searchForm, scheduledAt: resolveBookingScheduledAt(scheduledAt) });
                  }}
                />
                <FieldError id="home-scheduledAt-err" message={fieldErrors.scheduledAt} className="text-red-300" />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-3">
                <span className="hidden text-xs font-bold uppercase tracking-wider text-slate-300 md:block md:invisible">
                  Tìm chuyến
                </span>
                <button
                  type="submit"
                  className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-lg md:text-base"
                >
                  Tìm chuyến xe <ArrowRightLeft size={18} />
                </button>
              </div>
            </div>

            <p className="mt-2 text-left text-[11px] font-semibold leading-snug text-brand-300">
              {suggestedBookingDepartureHint()}
            </p>
          </form>
        </div>
      </section>

      {/* 2. KHU VỰC CHỌN DỊCH VỤ CHI TIẾT */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Tất cả dịch vụ</h2>
          <p className="mt-1.5 text-sm text-slate-600">Chọn đúng loại hình bạn cần để tối ưu chi phí di chuyển.</p>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {coreBookableServices.map((s) => {
            const Icon = serviceIcons[s.type] || Car;
            return (
              <button
                key={s.path}
                onClick={() => navigate(`${s.path}${bookingQuery()}`)}
                className="card text-left transition-all hover:-translate-y-1 hover:shadow-lg hover:border-brand-300 group"
              >
                <div className="inline-flex p-3 rounded-2xl bg-brand-50 text-brand-700 mb-4 group-hover:bg-brand-700 group-hover:text-white transition-all">
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-700">{s.menuLabel}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{serviceDesc[s.type] || s.title}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. QUY TRÌNH ĐẶT XE ĐƠN GIẢN */}
      <section className="bg-white border-y border-slate-100">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-3">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-cta-50 text-cta-600 font-black flex items-center justify-center shrink-0">1</div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Gửi thông tin</h3>
              <p className="text-sm text-slate-600 mt-1">Chọn lộ trình, ngày giờ và số chỗ mong muốn cực nhanh gọn.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-cta-50 text-cta-600 font-black flex items-center justify-center shrink-0">2</div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Tổng đài gọi lại</h3>
              <p className="text-sm text-slate-600 mt-1">Nhân viên sẽ kiểm tra xe trống và gọi điện xác nhận điểm đón trả tận nơi.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-cta-50 text-cta-600 font-black flex items-center justify-center shrink-0">3</div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Lên xe về quê</h3>
              <p className="text-sm text-slate-600 mt-1">Tài xế đón đúng hẹn, đi an toàn. Hoàn thành chuyến đi mới trả tiền.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
