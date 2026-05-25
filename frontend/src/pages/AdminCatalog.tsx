import { useEffect, useState } from "react";
import { api, formatMoney } from "../lib/api";
import { SERVICE_TYPE_OPTIONS, serviceTypeLabel } from "../lib/serviceTypes";
import { commissionType, pricingType } from "../lib/vi";

const emptyRouteForm = () => ({
  name: "",
  slug: "",
  fromName: "",
  toName: "",
  direction: "",
  status: "Đang chạy",
});

const emptyPricingForm = () => ({
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

const num = (v: unknown) => Number(v ?? 0);

export function AdminRoutes() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(emptyRouteForm);
  const [editId, setEditId] = useState<number | null>(null);
  const load = () => api.get("/admin/routes").then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyRouteForm());
    setEditId(null);
  };

  const startEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      name: r.name ?? "",
      slug: r.slug ?? "",
      fromName: r.fromName ?? "",
      toName: r.toName ?? "",
      direction: r.direction ?? "",
      status: r.status ?? "Đang chạy",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) return alert("Nhập tên tuyến và đường dẫn (slug)");
    if (editId) {
      await api.patch(`/admin/routes/${editId}`, form);
      alert("Đã cập nhật tuyến");
    } else {
      await api.post("/admin/routes", form);
      alert("Đã thêm tuyến");
    }
    resetForm();
    load();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Tuyến</h1>
      <div className="card mt-5 grid gap-3 md:grid-cols-2">
        <p className="text-sm text-slate-600 md:col-span-2">
          {editId ? `Đang sửa tuyến #${editId}` : "Thêm tuyến mới"}
        </p>
        <input className="input" placeholder="Tên tuyến" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="Đường dẫn (vd. xe-sai-gon-di-duc-linh)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="input" placeholder="Từ" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
        <input className="input" placeholder="Đến" value={form.toName} onChange={(e) => setForm({ ...form, toName: e.target.value })} />
        <input className="input" placeholder="Chiều" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} />
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="Đang chạy">Đang chạy</option>
          <option value="Tạm dừng">Tạm dừng</option>
        </select>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button className="btn-primary" onClick={save}>{editId ? "Lưu thay đổi" : "Thêm tuyến"}</button>
          {editId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Hủy sửa
            </button>
          )}
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        {items.map((r) => (
          <div className={`card flex flex-wrap items-center justify-between gap-3 text-sm ${editId === r.id ? "ring-2 ring-brand-500" : ""}`} key={r.id}>
            <div>
              <b>{r.name}</b> — {r.fromName} → {r.toName}
              <p className="text-slate-600">
                /{r.slug} • {r.direction} • {r.status}
              </p>
            </div>
            <button type="button" className="btn-secondary py-2" onClick={() => startEdit(r)}>
              Sửa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPricing() {
  const [items, setItems] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [form, setForm] = useState(emptyPricingForm);
  const [editId, setEditId] = useState<number | null>(null);
  const load = () => {
    api.get("/admin/pricing").then((r) => setItems(r.data));
    api.get("/admin/routes").then((r) => setRoutes(r.data));
  };
  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyPricingForm());
    setEditId(null);
  };

  const startEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      serviceType: p.serviceType ?? "SHARED_RIDE",
      routeId: p.routeId != null ? String(p.routeId) : "",
      pricingType: p.pricingType ?? "PER_PERSON",
      basePrice: num(p.basePrice),
      pricePerPerson: num(p.pricePerPerson),
      pricePerKg: num(p.pricePerKg),
      commissionType: p.commissionType ?? "FIXED",
      commissionValue: num(p.commissionValue),
      active: p.active !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const payload = () => ({
    ...form,
    routeId: form.routeId ? Number(form.routeId) : null,
    basePrice: Number(form.basePrice),
    pricePerPerson: Number(form.pricePerPerson),
    pricePerKg: Number(form.pricePerKg),
    commissionValue: Number(form.commissionValue),
  });

  const save = async () => {
    if (editId) {
      await api.patch(`/admin/pricing/${editId}`, payload());
      alert("Đã cập nhật bảng giá");
    } else {
      await api.post("/admin/pricing", payload());
      alert("Đã thêm bảng giá");
    }
    resetForm();
    load();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Bảng giá</h1>
      <p className="mt-2 text-sm text-slate-600">
        Khai giá theo <b>loại dịch vụ</b> + <b>tuyến</b> (hoặc giá chung toàn hệ thống). Khách đặt web sẽ thấy giá tạm tính từ bảng này.
      </p>
      <div className="card mt-5 grid gap-3 md:grid-cols-3">
        <p className="text-sm text-slate-600 md:col-span-3">
          {editId ? `Đang sửa bảng giá #${editId}` : "Thêm bảng giá mới"}
        </p>
        <select className="input" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
          {SERVICE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select className="input" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
          <option value="">Giá chung (mọi tuyến)</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select className="input" value={form.pricingType} onChange={(e) => setForm({ ...form, pricingType: e.target.value })}>
          <option value="PER_PERSON">Theo người</option>
          <option value="PER_TRIP">Theo chuyến</option>
          <option value="PER_KG">Theo kg</option>
        </select>
        <input
          className="input"
          type="number"
          placeholder="Giá cơ bản"
          value={form.basePrice}
          onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
        />
        <input
          className="input"
          type="number"
          placeholder="Giá/người"
          value={form.pricePerPerson}
          onChange={(e) => setForm({ ...form, pricePerPerson: Number(e.target.value) })}
        />
        <input
          className="input"
          type="number"
          placeholder="Giá/kg"
          value={form.pricePerKg}
          onChange={(e) => setForm({ ...form, pricePerKg: Number(e.target.value) })}
        />
        <select className="input" value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })}>
          <option value="FIXED">Hoa hồng cố định (VNĐ)</option>
          <option value="PERCENT">Hoa hồng theo %</option>
        </select>
        <input
          className="input"
          type="number"
          placeholder="Giá trị hoa hồng"
          value={form.commissionValue}
          onChange={(e) => setForm({ ...form, commissionValue: Number(e.target.value) })}
        />
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Đang áp dụng
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <button className="btn-primary" onClick={save}>
            {editId ? "Lưu thay đổi" : "Thêm giá"}
          </button>
          {editId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Hủy sửa
            </button>
          )}
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        {items.map((p) => (
          <div
            className={`card flex flex-wrap items-center justify-between gap-3 text-sm ${editId === p.id ? "ring-2 ring-brand-500" : ""}`}
            key={p.id}
          >
            <div>
              <b>{serviceTypeLabel[p.serviceType] || p.serviceType}</b> — {p.route?.name || "Chung (mọi tuyến)"} —{" "}
              {pricingType(p.pricingType)}
              <p className="text-slate-600">
                {formatMoney(p.pricePerPerson || p.basePrice)}
                {p.pricingType === "PER_KG" && ` • ${formatMoney(p.pricePerKg)}/kg`}
                {" "}
                — Hoa hồng {commissionType(p.commissionType)} {formatMoney(p.commissionValue)}
                {!p.active && " • Tắt"}
              </p>
            </div>
            <button type="button" className="btn-secondary py-2" onClick={() => startEdit(p)}>
              Sửa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
