import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CalendarClock, CheckCircle2, MapPin, PhoneCall, ReceiptText, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { api, API_BASE, formatMoney, unwrapList } from "../lib/api";
import { defaultDepartureLocal } from "../lib/datetime";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { allBookingServiceOptions, ROUTE_REQUIRED_SERVICE_TYPES } from "../routes/bookableServices";
import { usesPassengerCount } from "../lib/bookingSeats";
import { serviceTypeLabel } from "../lib/serviceTypes";
import { ContactQuickBlock } from "../components/ContactQuickBlock";
import { useSiteSettings } from "../lib/useSiteSettings";
import { InfoPill } from "../components/ui/DesignKit";
import { GregorianDateTimeInput } from "../components/ui/GregorianDateInputs";

function canEstimatePrice(form: { type?: string; routeId?: string }) {
  if (!form.type) return false;
  if (ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId) return false;
  return true;
}

function priceHint(form: { type?: string; routeId?: string }) {
  if (!form.type) return "Chọn loại dịch vụ để xem giá tạm tính";
  if (ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId) return "Chọn tuyến để xem giá tạm tính";
  return null;
}

type Route = {
  id: number;
  name: string;
  slug?: string;
  direction?: string | null;
  fromName?: string | null;
  toName?: string | null;
};

const serviceLabels: Record<string, string> = {
  SHARED_RIDE: "Xe ghép",
  PRIVATE_RIDE: "Bao xe",
  CARGO: "Gửi hàng",
  MARKET: "Đi chợ quê",
  CONTRACT: "Xe hợp đồng",
  WEDDING: "Xe đám cưới",
  TOUR: "Xe tham quan",
  HOSPITAL: "Xe bệnh viện",
  AIRPORT: "Xe sân bay",
};

export default function BookingPage({ type = "SHARED_RIDE", title = "Đặt xe về quê", defaultRouteId }: { type?: string; title?: string; defaultRouteId?: number }) {
  const { settings } = useSiteSettings();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesError, setRoutesError] = useState("");
  const [price, setPrice] = useState<any>(null);
  const [done, setDone] = useState<any>(null);
  const [submitError, setSubmitError] = useState("");
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [form, setForm] = useState<any>({
    type,
    routeId: defaultRouteId ? String(defaultRouteId) : "",
    customerName: "",
    customerPhone: "",
    pickupAddress: "",
    dropoffAddress: "",
    scheduledAt: defaultDepartureLocal(),
    passengerCount: 1,
    weightKg: 1,
    vehicleType: "",
    cargoDescription: "",
    marketDescription: "",
    note: "",
  });

  useEffect(() => {
    setLoadingRoutes(true);
    setRoutesError("");
    api
      .get("/routes")
      .then((res) => {
        const list = unwrapList<Route>(res.data);
        setRoutes(list);
        if (!list.length) setRoutesError("Chưa có tuyến trong database hoặc API tuyến đang trả rỗng.");
      })
      .catch((err) => {
        console.error("Không tải được tuyến:", err);
        const isNetwork = !err.response;
        setRoutesError(
          err.response?.data?.message ||
            (isNetwork
              ? `Không kết nối được API (${API_BASE}). Trên điện thoại: mở web bằng IP máy tính, cùng Wi-Fi, backend đang chạy và firewall cho phép cổng 4002.`
              : "Không tải được danh sách tuyến.")
        );
      })
      .finally(() => setLoadingRoutes(false));
  }, []);

  useEffect(() => {
    if (defaultRouteId) setForm((prev: any) => ({ ...prev, routeId: String(defaultRouteId) }));
  }, [defaultRouteId]);

  useEffect(() => {
    setForm((prev: any) => ({ ...prev, type }));
  }, [type]);

  useEffect(() => {
    if (!canEstimatePrice(form)) {
      setPrice(null);
      return;
    }
    api
      .post("/price/estimate", {
        type: form.type,
        routeId: form.routeId ? Number(form.routeId) : null,
        passengerCount: usesPassengerCount(form.type) ? Number(form.passengerCount || 1) : 0,
        weightKg: Number(form.weightKg || 0),
        vehicleType: form.vehicleType || null,
      })
      .then((res) => setPrice(res.data))
      .catch(() => setPrice({ estimatedTotal: 0, note: "Chưa có bảng giá phù hợp" }));
  }, [form.type, form.routeId, form.passengerCount, form.weightKg, form.vehicleType]);

  const selectedRoute = useMemo(() => routes.find((r) => String(r.id) === String(form.routeId)), [routes, form.routeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const customerPhone = normalizeVnPhone(form.customerPhone);
    if (!customerPhone) return setSubmitError(PHONE_INVALID_MESSAGE);
    if (!form.type) return setSubmitError("Vui lòng chọn loại dịch vụ");
    if (ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId) {
      return setSubmitError("Vui lòng chọn tuyến");
    }
    try {
      const res = await api.post("/bookings", {
        ...form,
        customerPhone,
        routeId: form.routeId ? Number(form.routeId) : null,
        direction: selectedRoute?.direction || selectedRoute?.name || null,
        passengerCount: usesPassengerCount(form.type) ? Number(form.passengerCount || 1) : 0,
        paymentReceiver: "DRIVER",
      });
      setDone(res.data);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || "Không gửi được yêu cầu. Vui lòng thử lại.");
    }
  };

  if (done) {
    const booking = done.booking;
    const total = Number(booking?.finalTotal ?? booking?.estimatedTotal ?? done.price?.estimatedTotal ?? 0);
    const routeName = booking?.route?.name || routes.find((r) => r.id === booking?.routeId)?.name;
    return (
      <div className="app-shell-bg px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="panel text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-green-50 text-green-700 ring-1 ring-green-100"><CheckCircle2 size={34} /></div>
            <h1 className="mt-5 text-2xl font-extrabold text-green-700">Đã nhận yêu cầu đặt xe</h1>
            <p className="muted mt-2">Mã đơn của bạn là <b className="text-ink-900">{booking?.code}</b>. Nhân viên sẽ gọi/Zalo xác nhận trước khi điều xe.</p>
            {routeName && <p className="mt-2 text-sm text-slate-500">Tuyến: {routeName}</p>}
            <div className="mt-6 rounded-3xl bg-gradient-to-br from-brand-50 to-orange-50 px-4 py-5">
              <p className="text-sm font-bold text-slate-600">Tổng tiền tạm tính</p>
              <p className="mt-1 text-4xl font-extrabold text-cta-500">{formatMoney(total)}</p>
              {done.price?.note && <p className="mt-2 text-sm text-slate-500">{done.price.note}</p>}
            </div>
            <p className="mt-4 text-sm text-slate-600">Thanh toán trực tiếp cho <b>tài xế</b> khi đi. Giá cuối sẽ được xác nhận lại theo điểm đón/trả thực tế.</p>
            <div className="mt-6 text-left"><ContactQuickBlock variant="compact" /></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell-bg">
      <Helmet><title>{title} | Đặt Xe Về Quê</title></Helmet>
      <div className="page grid gap-6 py-10 lg:grid-cols-[.9fr_1.1fr]">
        <section className="space-y-5">
          <div className="panel overflow-hidden bg-slate-950 p-0 text-white">
            <div className="bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,.38),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(249,115,22,.22),transparent_32%)] p-6 md:p-8">
              <InfoPill>{serviceTypeLabel[form.type] || serviceLabels[form.type] || "Dịch vụ"}</InfoPill>
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
              <p className="mt-4 text-base leading-7 text-slate-200">Chọn dịch vụ, tuyến, điểm đón/trả và thời gian. Hệ thống báo giá tạm tính để nhân viên xác nhận lại trước khi điều phối xe.</p>
              <div className="mt-6 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-3"><ShieldCheck className="mb-2 text-teal-300" /> Có người xác nhận</div>
                <div className="rounded-2xl bg-white/10 p-3"><ReceiptText className="mb-2 text-orange-300" /> Giá tạm tính minh bạch</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <b className="text-sm text-slate-500">Giá tạm tính</b>
                  {canEstimatePrice(form) && price ? (
                    <>
                      <p className="mt-2 text-3xl font-extrabold text-cta-500">{formatMoney(price.estimatedTotal)}</p>
                      <p className="mt-2 text-sm text-slate-500">{price.note}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-lg font-bold text-slate-500">{priceHint(form) || "—"}</p>
                  )}
                </div>
                <ReceiptText className="text-cta-500" />
              </div>
            </div>
            <div className="card"><ContactQuickBlock /></div>
          </div>
        </section>

        <form onSubmit={submit} className="panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-700">Thông tin yêu cầu</p>
              <h2 className="mt-1 text-2xl font-extrabold">Điền thông tin đặt xe</h2>
            </div>
            <CalendarClock className="text-brand-700" />
          </div>
          {routesError && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{routesError}</p>}
          {submitError && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold md:col-span-2">Loại dịch vụ *
              <select className="input mt-2" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="">— Chọn dịch vụ —</option>
                {allBookingServiceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            <label className="block text-sm font-bold md:col-span-2">Tuyến {ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) ? "*" : ""}
              <select className="input mt-2" required={ROUTE_REQUIRED_SERVICE_TYPES.has(form.type)} value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
                <option value="">{loadingRoutes ? "Đang tải tuyến..." : "Chọn tuyến"}</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>

            <label className="block text-sm font-bold">Họ tên *
              <input className="input mt-2" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="VD: Nguyễn Văn A" />
            </label>
            <label className="block text-sm font-bold">Số điện thoại/Zalo *
              <input className="input mt-2" required {...phoneInputProps} value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: sanitizePhoneInput(e.target.value) })} placeholder="0901234567" />
              <span className="mt-1 block text-xs font-medium text-slate-500">10 chữ số, bắt đầu bằng 0</span>
            </label>

            <label className="block text-sm font-bold">Điểm đón/gửi
              <input className="input mt-2" value={form.pickupAddress} onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} placeholder="Nhập địa chỉ đón" />
            </label>
            <label className="block text-sm font-bold">Điểm trả/nhận
              <input className="input mt-2" value={form.dropoffAddress} onChange={(e) => setForm({ ...form, dropoffAddress: e.target.value })} placeholder="Nhập địa chỉ trả" />
            </label>

            <label className="block text-sm font-bold">Ngày giờ đi *
              <GregorianDateTimeInput className="mt-2" value={form.scheduledAt} onChange={(value) => setForm({ ...form, scheduledAt: value })} />
            </label>

            {usesPassengerCount(form.type) && (
              <label className="block text-sm font-bold">Số khách
                <input className="input mt-2" type="number" min="1" value={form.passengerCount} onChange={(e) => setForm({ ...form, passengerCount: e.target.value })} />
              </label>
            )}

            {form.type === "CARGO" && (
              <>
                <label className="block text-sm font-bold">Cân nặng (kg)
                  <input className="input mt-2" type="number" min="1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
                </label>
                <label className="block text-sm font-bold md:col-span-2">Mô tả hàng
                  <textarea className="input mt-2" rows={2} value={form.cargoDescription} onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })} />
                </label>
              </>
            )}

            {form.type === "MARKET" && (
              <label className="block text-sm font-bold md:col-span-2">Danh sách đồ cần mua
                <textarea className="input mt-2" rows={3} value={form.marketDescription} onChange={(e) => setForm({ ...form, marketDescription: e.target.value })} />
              </label>
            )}

            {(form.type === "PRIVATE_RIDE" || form.type === "CONTRACT" || form.type === "WEDDING" || form.type === "TOUR" || form.type === "HOSPITAL" || form.type === "AIRPORT") && (
              <label className="block text-sm font-bold">Loại xe
                <select className="input mt-2" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                  <option value="">Chọn loại xe</option>
                  <option>Xe 4 chỗ</option>
                  <option>Xe 7 chỗ</option>
                  <option>Xe 16 chỗ</option>
                  <option>Xe 29 chỗ</option>
                </select>
              </label>
            )}

            <label className="block text-sm font-bold md:col-span-2">Ghi chú
              <textarea className="input mt-2" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ví dụ: có trẻ em, nhiều hành lý, cần tài xế gọi trước..." />
            </label>
          </div>

          <div className="mt-5 rounded-3xl border border-brand-100 bg-brand-50/70 px-4 py-4 text-sm text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-bold"><RouteIcon size={18} className="text-brand-700" /> {selectedRoute?.name || "Chưa chọn tuyến"}</span>
              <b className="text-xl text-cta-500">{canEstimatePrice(form) && price ? formatMoney(price.estimatedTotal) : "—"}</b>
            </div>
            {priceHint(form) && <span className="mt-1 block text-amber-700">{priceHint(form)}</span>}
            {canEstimatePrice(form) && price?.note && <span className="mt-1 block text-slate-500">{price.note}</span>}
            <span className="mt-1 block">Thanh toán cho tài xế khi đi sau khi nhân viên xác nhận.</span>
          </div>
          <button className="btn-primary mt-5 w-full text-base"><PhoneCall size={18} /> Gửi yêu cầu đặt xe <ArrowRight size={18} /></button>
        </form>
      </div>
    </div>
  );
}
