import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { api, API_BASE, formatMoney, unwrapList } from "../lib/api";
import { defaultDepartureLocal } from "../lib/datetime";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { allBookingServiceOptions, ROUTE_REQUIRED_SERVICE_TYPES } from "../routes/bookableServices";
import { usesPassengerCount } from "../lib/bookingSeats";
import { serviceTypeLabel } from "../lib/serviceTypes";
import { getContactInfo, useSiteSettings } from "../lib/useSiteSettings";

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
  const contact = getContactInfo(settings);
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
              ? `Không kết nối được API (${API_BASE}). Trên điện thoại: mở web bằng IP máy tính (vd. http://192.168.1.x:5173), cùng Wi-Fi, backend đang chạy và Windows Firewall cho phép cổng 4002.`
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
      const selectedRoute = routes.find((r) => String(r.id) === String(form.routeId));
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
    const total = Number(
      booking?.finalTotal ?? booking?.estimatedTotal ?? done.price?.estimatedTotal ?? 0
    );
    const routeName = booking?.route?.name || routes.find((r) => r.id === booking?.routeId)?.name;
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-green-700">Đã nhận yêu cầu</h1>
          <p className="mt-3">
            Mã đơn: <b>{booking?.code}</b>
          </p>
          {routeName && <p className="mt-2 text-slate-600">Tuyến: {routeName}</p>}
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-5">
            <p className="text-sm font-semibold text-slate-600">Tổng tiền tạm tính</p>
            <p className="mt-1 text-4xl font-extrabold text-cta">{formatMoney(total)}</p>
            {done.price?.note && <p className="mt-2 text-sm text-slate-500">{done.price.note}</p>}
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Thanh toán trực tiếp cho <b>tài xế</b> khi đi. Nhân viên sẽ gọi/Zalo xác nhận giá và lịch trước khi điều xe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-[1fr_.8fr]">
      <Helmet>
        <title>{title} | Đặt Xe Về Quê</title>
      </Helmet>
      <section>
        <span className="badge">{serviceTypeLabel[form.type] || serviceLabels[form.type] || "Dịch vụ"}</span>
        <h1 className="mt-4 text-4xl font-extrabold">{title}</h1>
        <p className="mt-3 text-slate-600">
          Chọn <b>dịch vụ</b> và <b>tuyến</b> (nếu có) để xem giá tạm tính. Nhân viên xác nhận lại trước khi chốt chuyến.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="card">
            <b>Giá tạm tính</b>
            {canEstimatePrice(form) && price ? (
              <>
                <p className="mt-2 text-3xl font-extrabold text-cta">{formatMoney(price.estimatedTotal)}</p>
                <p className="mt-2 text-sm text-slate-500">{price.note}</p>
              </>
            ) : (
              <p className="mt-2 text-lg font-semibold text-slate-500">{priceHint(form) || "—"}</p>
            )}
          </div>
          <div className="card">
            <b>Hỗ trợ nhanh</b>
            <p className="mt-2 text-slate-600">{contact.footerLine}</p>
            <p className="mt-1 text-sm text-slate-500">Gửi form xong nhân viên sẽ gọi lại xác nhận.</p>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="card">
        <h2 className="text-xl font-bold">Thông tin yêu cầu</h2>
        {routesError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{routesError}</p>}
        {submitError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{submitError}</p>}

        <label className="mt-4 block text-sm font-semibold">Loại dịch vụ *</label>
        <select
          className="input mt-2"
          required
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="">— Chọn dịch vụ —</option>
          {allBookingServiceOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-semibold">
          Tuyến {ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) ? "*" : ""}
        </label>
        <select
          className="input mt-2"
          required={ROUTE_REQUIRED_SERVICE_TYPES.has(form.type)}
          value={form.routeId}
          onChange={(e) => setForm({ ...form, routeId: e.target.value })}
        >
          <option value="">{loadingRoutes ? "Đang tải tuyến..." : "Chọn tuyến"}</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-semibold">Họ tên</label>
        <input className="input mt-2" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />

        <label className="mt-4 block text-sm font-semibold">Số điện thoại/Zalo *</label>
        <input
          className="input mt-2"
          required
          {...phoneInputProps}
          value={form.customerPhone}
          onChange={(e) => setForm({ ...form, customerPhone: sanitizePhoneInput(e.target.value) })}
        />
        <p className="mt-1 text-xs text-slate-500">10 chữ số, bắt đầu bằng 0 (ví dụ 0901234567)</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold">Điểm đón/gửi</label>
            <input className="input mt-2" value={form.pickupAddress} onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold">Điểm trả/nhận</label>
            <input className="input mt-2" value={form.dropoffAddress} onChange={(e) => setForm({ ...form, dropoffAddress: e.target.value })} />
          </div>
        </div>

        <label className="mt-4 block text-sm font-semibold">Ngày giờ đi *</label>
        <input
          className="input mt-2"
          type="datetime-local"
          required
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
        />

        {usesPassengerCount(form.type) && (
          <>
            <label className="mt-4 block text-sm font-semibold">Số khách</label>
            <input
              className="input mt-2"
              type="number"
              min="1"
              value={form.passengerCount}
              onChange={(e) => setForm({ ...form, passengerCount: e.target.value })}
            />
          </>
        )}

        {form.type === "CARGO" && (
          <>
            <label className="mt-4 block text-sm font-semibold">Cân nặng (kg)</label>
            <input className="input mt-2" type="number" min="1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            <label className="mt-4 block text-sm font-semibold">Mô tả hàng</label>
            <textarea className="input mt-2" rows={2} value={form.cargoDescription} onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })} />
          </>
        )}

        {form.type === "MARKET" && (
          <>
            <label className="mt-4 block text-sm font-semibold">Danh sách đồ cần mua</label>
            <textarea className="input mt-2" rows={3} value={form.marketDescription} onChange={(e) => setForm({ ...form, marketDescription: e.target.value })} />
          </>
        )}

        {(form.type === "PRIVATE_RIDE" || form.type === "CONTRACT" || form.type === "WEDDING" || form.type === "TOUR" || form.type === "HOSPITAL" || form.type === "AIRPORT") && (
          <>
            <label className="mt-4 block text-sm font-semibold">Loại xe</label>
            <select className="input mt-2" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
              <option value="">Chọn loại xe</option>
              <option>Xe 4 chỗ</option>
              <option>Xe 7 chỗ</option>
              <option>Xe 16 chỗ</option>
              <option>Xe 29 chỗ</option>
            </select>
          </>
        )}

        <label className="mt-4 block text-sm font-semibold">Ghi chú</label>
        <textarea className="input mt-2" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />

        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Tổng tạm tính:{" "}
          <b className="text-lg text-cta">
            {canEstimatePrice(form) && price ? formatMoney(price.estimatedTotal) : "—"}
          </b>
          {priceHint(form) && <span className="mt-1 block text-amber-700">{priceHint(form)}</span>}
          {canEstimatePrice(form) && price?.note && <span className="mt-1 block text-slate-500">{price.note}</span>}
          <span className="mt-1 block">Thanh toán cho tài xế khi đi (sau khi nhân viên xác nhận).</span>
        </div>
        <button className="btn-primary mt-4 w-full">Gửi yêu cầu</button>
      </form>
    </div>
  );
}
