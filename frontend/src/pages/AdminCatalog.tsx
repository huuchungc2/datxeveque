import { useEffect, useState } from "react";
import { api, formatMoney } from "../lib/api";

export function AdminRoutes() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", fromName: "", toName: "", direction: "", status: "Đang chạy" });
  const load = () => api.get("/admin/routes").then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    await api.post("/admin/routes", form);
    load();
    alert("Đã thêm tuyến");
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">Tuyến</h1>
      <div className="card mt-5 grid gap-3 md:grid-cols-2">
        <input className="input" placeholder="Tên tuyến" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="input" placeholder="Từ" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
        <input className="input" placeholder="Đến" value={form.toName} onChange={(e) => setForm({ ...form, toName: e.target.value })} />
        <input className="input md:col-span-2" placeholder="Chiều" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} />
        <button className="btn-primary md:col-span-2" onClick={save}>Thêm tuyến</button>
      </div>
      <div className="mt-5 grid gap-2">
        {items.map((r) => (
          <div className="card text-sm" key={r.id}><b>{r.name}</b> — {r.direction} • {r.status}</div>
        ))}
      </div>
    </div>
  );
}

export function AdminPricing() {
  const [items, setItems] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [form, setForm] = useState({
    serviceType: "SHARED_RIDE",
    routeId: "",
    pricingType: "PER_PERSON",
    basePrice: 0,
    pricePerPerson: 250000,
    pricePerKg: 0,
    commissionType: "FIXED",
    commissionValue: 30000,
    active: true,
  });
  const load = () => {
    api.get("/admin/pricing").then((r) => setItems(r.data));
    api.get("/admin/routes").then((r) => setRoutes(r.data));
  };
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    await api.post("/admin/pricing", { ...form, routeId: form.routeId ? Number(form.routeId) : null });
    load();
    alert("Đã thêm bảng giá");
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">Bảng giá</h1>
      <div className="card mt-5 grid gap-3 md:grid-cols-3">
        <select className="input" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
          <option value="SHARED_RIDE">Xe ghép</option>
          <option value="PRIVATE_RIDE">Bao xe</option>
          <option value="CARGO">Gửi hàng</option>
          <option value="MARKET">Đi chợ</option>
        </select>
        <select className="input" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
          <option value="">Giá global (không tuyến)</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select className="input" value={form.pricingType} onChange={(e) => setForm({ ...form, pricingType: e.target.value })}>
          <option value="PER_PERSON">Theo người</option>
          <option value="PER_TRIP">Theo chuyến</option>
          <option value="PER_KG">Theo kg</option>
        </select>
        <input className="input" type="number" placeholder="Giá/người" value={form.pricePerPerson} onChange={(e) => setForm({ ...form, pricePerPerson: Number(e.target.value) })} />
        <input className="input" type="number" placeholder="Hoa hồng" value={form.commissionValue} onChange={(e) => setForm({ ...form, commissionValue: Number(e.target.value) })} />
        <button className="btn-primary" onClick={save}>Thêm giá</button>
      </div>
      <div className="mt-5 grid gap-2">
        {items.map((p) => (
          <div className="card text-sm" key={p.id}>
            <b>{p.serviceType}</b> — {p.route?.name || "Global"} — {p.pricingType} — {formatMoney(p.pricePerPerson || p.basePrice)} — HH {formatMoney(p.commissionValue)}
          </div>
        ))}
      </div>
    </div>
  );
}
