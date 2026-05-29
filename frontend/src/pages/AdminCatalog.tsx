import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, Lock, LockOpen, MapPin, Pencil, Plus, Route, Search } from "lucide-react";
import { api, formatMoney, unwrapList } from "../lib/api";
import { getVisiblePageNumbers } from "../lib/paginationUi";
import { PageTitle } from "../components/ui/AdminCharts";
import { SERVICE_TYPE_OPTIONS, serviceTypeLabel } from "../lib/serviceTypes";
import { commissionType, pricingType } from "../lib/vi";

type RouteRow = {
  id: number;
  name: string;
  slug: string;
  fromName: string;
  toName: string;
  direction: string;
  status: string;
  locked?: boolean;
};

const emptyRouteForm = () => ({
  name: "",
  slug: "",
  fromName: "",
  toName: "",
  direction: "",
  status: "Đang chạy",
});

function composeRouteDirection(fromName: string, toName: string) {
  const from = fromName.trim();
  const to = toName.trim();
  if (!from || !to) return "";
  return `${from} → ${to}`;
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 1 });
  const [form, setForm] = useState(emptyRouteForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [qDraft, setQDraft] = useState("");

  const q = searchParams.get("q") || "";
  const lockedFilter = searchParams.get("locked") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const load = useCallback(() => {
    setLoading(true);
    return api
      .get("/admin/routes", {
        params: {
          page,
          pageSize: 15,
          q: q || undefined,
          locked: lockedFilter || undefined,
        },
      })
      .then((r) => {
        const data = r.data;
        if (Array.isArray(data)) {
          setItems(data);
          setMeta({ page: 1, pageSize: data.length, total: data.length, totalPages: 1 });
        } else {
          setItems(data?.items || []);
          setMeta({
            page: Number(data?.page || 1),
            pageSize: Number(data?.pageSize || 15),
            total: Number(data?.total || 0),
            totalPages: Number(data?.totalPages || 1),
          });
        }
      })
      .finally(() => setLoading(false));
  }, [page, q, lockedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setQDraft(q);
  }, [q]);

  const applyFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (qDraft.trim()) next.set("q", qDraft.trim());
    else next.delete("q");
    next.set("page", "1");
    setSearchParams(next);
  };

  const setLockedFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("locked", value);
    else next.delete("locked");
    next.set("page", "1");
    setSearchParams(next);
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next);
  };

  const resetForm = () => {
    setForm(emptyRouteForm());
    setEditId(null);
    setFormOpen(false);
  };

  const startEdit = (r: RouteRow) => {
    setEditId(r.id);
    setForm({
      name: r.name ?? "",
      slug: r.slug ?? "",
      fromName: r.fromName ?? "",
      toName: r.toName ?? "",
      direction: r.direction ?? "",
      status: r.status ?? "Đang chạy",
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) return alert("Nhập tên tuyến và đường dẫn (slug)");
    if (!form.fromName.trim() || !form.toName.trim()) return alert("Nhập điểm đi và điểm đến");
    const payload = {
      ...form,
      direction: form.direction.trim() || composeRouteDirection(form.fromName, form.toName),
    };
    setBusy(true);
    setMsg("");
    try {
      if (editId) {
        await api.patch(`/admin/routes/${editId}`, payload);
        setMsg("Đã cập nhật tuyến");
      } else {
        await api.post("/admin/routes", payload);
        setMsg("Đã thêm tuyến");
      }
      resetForm();
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || "Không lưu được tuyến");
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = async (r: RouteRow) => {
    const nextLocked = !r.locked;
    const label = nextLocked ? "Khóa tuyến này? Khách sẽ không thấy trên web và không đặt mới được." : "Mở khóa tuyến để hiển thị lại trên web?";
    if (!confirm(label)) return;
    setBusy(true);
    try {
      const res = await api.patch(`/admin/routes/${r.id}/lock`, { locked: nextLocked });
      setMsg(res.data?.message || (nextLocked ? "Đã khóa tuyến" : "Đã mở khóa"));
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || "Không đổi được trạng thái khóa");
    } finally {
      setBusy(false);
    }
  };

  const lockedCount = items.filter((r) => r.locked).length;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle
          title="Quản lý tuyến"
          subtitle="Thêm/sửa tuyến đường. Khóa tuyến để ẩn khỏi trang chủ, form đặt xe và sitemap — đơn cũ vẫn giữ nguyên."
        />
        <button type="button" className="btn-primary inline-flex items-center gap-2 py-2.5" onClick={startCreate}>
          <Plus size={18} />
          Thêm tuyến
        </button>
      </div>

      {msg && (
        <p className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900">{msg}</p>
      )}

      {formOpen && (
        <div className="card border-2 border-brand-200 bg-gradient-to-br from-brand-50/50 to-white">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-ink-900">{editId ? `Sửa tuyến #${editId}` : "Thêm tuyến mới"}</h2>
            <button type="button" className="text-sm font-bold text-slate-500 hover:text-ink-900" onClick={resetForm}>
              Đóng
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tên tuyến</span>
              <input className="input" placeholder="VD: Sài Gòn → Đức Linh" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Slug URL</span>
              <input className="input" placeholder="xe-sai-gon-di-duc-linh" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Điểm đi</span>
              <input
                className="input"
                placeholder="Sài Gòn"
                value={form.fromName}
                onChange={(e) => {
                  const fromName = e.target.value;
                  setForm((f) => ({ ...f, fromName, direction: composeRouteDirection(fromName, f.toName) }));
                }}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Điểm đến</span>
              <input
                className="input"
                placeholder="Đức Linh"
                value={form.toName}
                onChange={(e) => {
                  const toName = e.target.value;
                  setForm((f) => ({ ...f, toName, direction: composeRouteDirection(f.fromName, toName) }));
                }}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Chiều đi</span>
              <input className="input" placeholder="Tự điền: Từ → Đến" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái vận hành</span>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Đang chạy">Đang chạy</option>
                <option value="Tạm dừng">Tạm dừng</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary py-2" disabled={busy} onClick={save}>
              {editId ? "Lưu thay đổi" : "Thêm tuyến"}
            </button>
            <button type="button" className="btn-secondary py-2" onClick={resetForm}>
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left md:hidden"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-900">
            <Filter size={18} className="text-brand-700" />
            Bộ lọc
          </span>
          <span className="text-xs font-semibold text-brand-700">{filtersOpen ? "Thu gọn" : "Mở"}</span>
        </button>
        <div className={`border-t border-slate-100 px-4 py-4 ${filtersOpen ? "block" : "hidden md:block"} md:border-t-0`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="input !pl-10"
                  placeholder="Tên, slug, điểm đi/đến..."
                  value={qDraft}
                  onChange={(e) => setQDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                />
              </div>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Khóa tuyến</span>
              <select className="input" value={lockedFilter} onChange={(e) => setLockedFilter(e.target.value)}>
                <option value="">Tất cả</option>
                <option value="false">Đang mở</option>
                <option value="true">Đã khóa</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary py-2" onClick={applyFilters}>
              Áp dụng lọc
            </button>
            <button
              type="button"
              className="btn-secondary py-2"
              onClick={() => {
                setQDraft("");
                setSearchParams({});
              }}
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p>
          <b className="text-ink-900">{meta.total}</b> tuyến
          {lockedCount > 0 && items.length === meta.total && (
            <span className="ml-2 text-red-600">· {lockedCount} đã khóa (trang này)</span>
          )}
          {meta.totalPages > 1 && (
            <>
              {" "}
              · Trang <b className="text-ink-900">{meta.page}</b>/{meta.totalPages}
            </>
          )}
        </p>
        {loading && <span className="text-xs font-semibold text-brand-700">Đang tải...</span>}
      </div>

      <div className="card hidden overflow-hidden !p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Tuyến</th>
                <th className="px-4 py-3">Chiều đi</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((r) => (
                <tr key={r.id} className={`transition hover:bg-brand-50/40 ${r.locked ? "bg-red-50/30" : ""} ${editId === r.id ? "bg-brand-50/60" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Route size={18} className="mt-0.5 shrink-0 text-brand-700" />
                      <div>
                        <b className="text-ink-900">{r.name}</b>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {r.fromName} → {r.toName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-ink-800">
                      <MapPin size={14} className="text-slate-400" />
                      {r.direction || `${r.fromName} → ${r.toName}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">/{r.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.locked ? (
                        <span className="badge badge-danger">Đã khóa</span>
                      ) : (
                        <span className="badge badge-success">Hiển thị web</span>
                      )}
                      <span className="badge bg-slate-100 text-slate-700">{r.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button type="button" className="btn-ghost py-1.5 px-2.5 text-xs" disabled={busy} onClick={() => startEdit(r)} title="Sửa">
                        <Pencil size={14} />
                        Sửa
                      </button>
                      <button
                        type="button"
                        className={`btn-ghost py-1.5 px-2.5 text-xs ${r.locked ? "text-green-700" : "text-red-700"}`}
                        disabled={busy}
                        onClick={() => toggleLock(r)}
                        title={r.locked ? "Mở khóa" : "Khóa tuyến"}
                      >
                        {r.locked ? <LockOpen size={14} /> : <Lock size={14} />}
                        {r.locked ? "Mở khóa" : "Khóa"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !items.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Không có tuyến phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {items.map((r) => (
          <div key={r.id} className={`card !p-4 ${r.locked ? "border-red-200 bg-red-50/30" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{r.name}</p>
                <p className="mt-1 text-sm text-ink-800">{r.fromName} → {r.toName}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">/{r.slug}</p>
              </div>
              {r.locked ? <span className="badge badge-danger">Khóa</span> : <span className="badge badge-success">Mở</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary flex-1 py-2 text-sm" onClick={() => startEdit(r)}>
                Sửa
              </button>
              <button
                type="button"
                className={`btn-secondary flex-1 py-2 text-sm ${r.locked ? "" : "text-red-700"}`}
                disabled={busy}
                onClick={() => toggleLock(r)}
              >
                {r.locked ? "Mở khóa" : "Khóa"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {meta.totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Phân trang tuyến">
          <button type="button" className="btn-secondary min-w-[2.5rem] px-3 py-2 text-sm" disabled={meta.page <= 1 || loading} onClick={() => setPage(meta.page - 1)}>
            ‹
          </button>
          {getVisiblePageNumbers(meta.page, meta.totalPages).map((p, i) =>
            p === "ellipsis" ? (
              <span key={`e-${i}`} className="px-2 text-sm text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`min-w-[2.5rem] rounded-xl px-3 py-2 text-sm font-bold transition ${p === meta.page ? "bg-brand-700 text-white shadow-sm" : "btn-secondary"}`}
                disabled={loading}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button type="button" className="btn-secondary min-w-[2.5rem] px-3 py-2 text-sm" disabled={meta.page >= meta.totalPages || loading} onClick={() => setPage(meta.page + 1)}>
            ›
          </button>
        </nav>
      )}
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
    api.get("/admin/routes").then((r) => setRoutes(unwrapList(r.data)));
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
    <div className="space-y-5 pb-8">
      <PageTitle
        title="Bảng giá"
        subtitle="Khai giá theo loại dịch vụ + tuyến (hoặc giá chung). Khách đặt web thấy giá tạm tính từ bảng này."
      />
      <div className="card grid gap-3 md:grid-cols-3">
        <p className="text-sm text-slate-600 md:col-span-3">{editId ? `Đang sửa bảng giá #${editId}` : "Thêm bảng giá mới"}</p>
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
              {r.locked ? " (đã khóa)" : ""}
            </option>
          ))}
        </select>
        <select className="input" value={form.pricingType} onChange={(e) => setForm({ ...form, pricingType: e.target.value })}>
          <option value="PER_PERSON">Theo người</option>
          <option value="PER_TRIP">Theo chuyến</option>
          <option value="PER_KG">Theo kg</option>
        </select>
        <input className="input" type="number" placeholder="Giá cơ bản" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
        <input className="input" type="number" placeholder="Giá/người" value={form.pricePerPerson} onChange={(e) => setForm({ ...form, pricePerPerson: Number(e.target.value) })} />
        <input className="input" type="number" placeholder="Giá/kg" value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: Number(e.target.value) })} />
        <select className="input" value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })}>
          <option value="FIXED">Hoa hồng cố định (VNĐ)</option>
          <option value="PERCENT">Hoa hồng theo %</option>
        </select>
        <input className="input" type="number" placeholder="Giá trị hoa hồng" value={form.commissionValue} onChange={(e) => setForm({ ...form, commissionValue: Number(e.target.value) })} />
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
      <div className="grid gap-2">
        {items.map((p) => (
          <div className={`card flex flex-wrap items-center justify-between gap-3 text-sm ${editId === p.id ? "ring-2 ring-brand-500" : ""}`} key={p.id}>
            <div>
              <b>{serviceTypeLabel[p.serviceType] || p.serviceType}</b> — {p.route?.name || "Chung (mọi tuyến)"} — {pricingType(p.pricingType)}
              <p className="text-slate-600">
                {formatMoney(p.pricePerPerson || p.basePrice)}
                {p.pricingType === "PER_KG" && ` • ${formatMoney(p.pricePerKg)}/kg`} — Hoa hồng {commissionType(p.commissionType)} {formatMoney(p.commissionValue)}
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
