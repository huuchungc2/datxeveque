import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { api, formatMoney, unwrapList } from "../lib/api";

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
    scheduledAt: "",
    passengerCount: 1,
    vehicleType: "",
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
        setRoutesError(err.response?.data?.message || "Không tải được danh sách tuyến. Kiểm tra backend hoặc VITE_API_URL.");
      })
      .finally(() => setLoadingRoutes(false));
  }, []);


  useEffect(() => {
    if (defaultRouteId) setForm((prev: any) => ({ ...prev, routeId: String(defaultRouteId) }));
  }, [defaultRouteId]);

  useEffect(() => {
    if (form.type) {
      api
        .post("/price/estimate", {
          type: form.type,
          routeId: form.routeId ? Number(form.routeId) : null,
          passengerCount: Number(form.passengerCount || 1),
          vehicleType: form.vehicleType || null,
        })
        .then((res) => setPrice(res.data))
        .catch(() => setPrice({ estimatedTotal: 0, note: "Chưa có bảng giá phù hợp" }));
    }
  }, [form.type, form.routeId, form.passengerCount, form.vehicleType]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    try {
      const selectedRoute = routes.find((r) => String(r.id) === String(form.routeId));
      const res = await api.post("/bookings", {
        ...form,
        routeId: form.routeId ? Number(form.routeId) : null,
        direction: selectedRoute?.direction || selectedRoute?.name || null,
        passengerCount: Number(form.passengerCount || 1),
      });
      setDone(res.data);
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || "Không gửi được yêu cầu. Vui lòng thử lại.");
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="card text-center">
          <h1 className="text-2xl font-bold text-green-700">Đã nhận yêu cầu</h1>
          <p className="mt-3">
            Mã đơn: <b>{done.booking.code}</b>
          </p>
          <p className="mt-2 text-slate-600">Nhân viên sẽ gọi/Zalo xác nhận lại trước khi điều xe.</p>
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
        <span className="badge">{serviceLabels[type] || "Dịch vụ"}</span>
        <h1 className="mt-4 text-4xl font-extrabold">{title}</h1>
        <p className="mt-3 text-slate-600">
          Khách không cần đăng nhập vẫn đặt được. Nhập thông tin, hệ thống hiển thị giá tạm tính nếu tuyến có bảng giá. Admin sẽ xác nhận lại trước khi chốt chuyến.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="card">
            <b>Giá tạm tính</b>
            <p className="mt-2 text-3xl font-extrabold text-cta">{formatMoney(price?.estimatedTotal)}</p>
            <p className="mt-2 text-sm text-slate-500">{price?.note || "Chọn tuyến để xem giá tạm tính"}</p>
          </div>
          <div className="card">
            <b>Hỗ trợ nhanh</b>
            <p className="mt-2 text-slate-600">Hotline/Zalo: 0900000000</p>
            <p className="mt-1 text-sm text-slate-500">Gửi form xong admin sẽ gọi lại xác nhận.</p>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="card">
        <h2 className="text-xl font-bold">Thông tin yêu cầu</h2>
        {routesError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{routesError}</p>}
        {submitError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{submitError}</p>}

        <label className="mt-4 block text-sm font-semibold">Tuyến</label>
        <select className="input mt-2" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
          <option value="">{loadingRoutes ? "Đang tải tuyến..." : "Chọn tuyến"}</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-sm font-semibold">Họ tên</label>
        <input className="input mt-2" required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />

        <label className="mt-4 block text-sm font-semibold">Số điện thoại/Zalo</label>
        <input className="input mt-2" required value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />

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

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold">Thời gian</label>
            <input className="input mt-2" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold">Số khách</label>
            <input className="input mt-2" type="number" min="1" value={form.passengerCount} onChange={(e) => setForm({ ...form, passengerCount: e.target.value })} />
          </div>
        </div>

        {(form.type === "PRIVATE_RIDE" || form.type === "CONTRACT" || form.type === "WEDDING" || form.type === "TOUR") && (
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

        <button className="btn-primary mt-6 w-full">Gửi yêu cầu</button>
      </form>
    </div>
  );
}
