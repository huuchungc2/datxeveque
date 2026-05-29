import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Car, Filter, MapPin, Search, Truck, Users, X } from "lucide-react";
import { api, formatMoney } from "../lib/api";
import { fmtDepartureTime } from "../lib/datetime";
import { PageTitle, StatCard, dashboardIcons } from "../components/ui/AdminCharts";
import { GregorianDateInput } from "../components/ui/GregorianDateInputs";
import { getVisiblePageNumbers } from "../lib/paginationUi";
import { SETTLEMENT_STATUS_VI, TRIP_STATUS_VI, settlementStatus, tripStatus } from "../lib/vi";

type TripRow = {
  id: number;
  code: string;
  status: string;
  departureAt?: string | null;
  bookedSeats?: number;
  totalSeats?: number;
  availableSeats?: number;
  totalCustomerAmount?: number | string;
  adminCommission?: number | string;
  driverDebtAmount?: number | string;
  settlementStatus?: string;
  route?: { name?: string; fromName?: string; toName?: string } | null;
  driver?: { name?: string; phone?: string } | null;
  vehicle?: { licensePlate?: string; vehicleType?: string } | null;
  _count?: { tripBookings?: number };
};

type Filters = {
  keyword: string;
  status: string;
  settlementStatus: string;
  routeId: string;
  driverId: string;
  from: string;
  to: string;
  minAvailableSeats: string;
  debtMin: string;
  sortBy: string;
  sortDir: string;
  page: number;
  pageSize: number;
};

const defaultFilters = (): Filters => ({
  keyword: "",
  status: "",
  settlementStatus: "",
  routeId: "",
  driverId: "",
  from: "",
  to: "",
  minAvailableSeats: "",
  debtMin: "",
  sortBy: "departureAt",
  sortDir: "desc",
  page: 1,
  pageSize: 20,
});

function tripStatusBadgeClass(status: string) {
  if (status === "COMPLETED") return "badge-success";
  if (status === "CANCELLED") return "badge-danger";
  if (status === "IN_PROGRESS") return "badge-info";
  if (status === "READY") return "badge-warning";
  return "badge-info";
}

function SeatMeter({ booked = 0, total = 0, available = 0 }: { booked?: number; total?: number; available?: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((booked / total) * 100)) : 0;
  const tone = pct >= 90 ? "bg-cta-500" : pct >= 60 ? "bg-brand-600" : "bg-brand-500";
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span>
          <b className="text-brand-800">{available}</b> trống
        </span>
        <span className="text-slate-500">
          {booked}/{total}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TripQuickActions({
  trip,
  busy,
  onAction,
}: {
  trip: TripRow;
  busy: boolean;
  onAction: (status: string) => void;
}) {
  const actions: { id: string; label: string; to: string; tone: "primary" | "secondary" }[] = [];
  if (trip.status === "COLLECTING" || trip.status === "READY")
    actions.push({ id: "start", label: "Bắt đầu", to: "IN_PROGRESS", tone: "primary" });
  if (trip.status === "IN_PROGRESS") actions.push({ id: "complete", label: "Hoàn thành", to: "COMPLETED", tone: "primary" });
  if (trip.status !== "CANCELLED" && trip.status !== "COMPLETED")
    actions.push({ id: "cancel", label: "Hủy", to: "CANCELLED", tone: "secondary" });

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          className={a.tone === "primary" ? "btn-primary px-2.5 py-1.5 text-xs" : "btn-secondary border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50"}
          disabled={busy}
          onClick={() => onAction(a.to)}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function AdminTrips() {
  const [items, setItems] = useState<TripRow[]>([]);
  const [routes, setRoutes] = useState<{ id: number; name: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: number; name: string; phone?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [draft, setDraft] = useState<Filters>(defaultFilters);

  const load = async (next?: Partial<Filters>) => {
    const params: Record<string, unknown> = { ...filters, ...(next || {}) };
    for (const k of Object.keys(params)) {
      if (params[k] === "" || params[k] == null) params[k] = undefined;
    }
    setLoading(true);
    try {
      const r = await api.get("/admin/trips", { params });
      setItems(r.data?.items || []);
      setMeta({
        page: Number(r.data?.page || 1),
        pageSize: Number(r.data?.pageSize || 20),
        total: Number(r.data?.total || 0),
        totalPages: Number(r.data?.totalPages || 1),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get("/admin/routes").then((r) => setRoutes(r.data));
    api.get("/admin/drivers").then((r) => setDrivers(r.data));
  }, []);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const applyFilters = () => {
    const next = { ...draft, page: 1 };
    setFilters(next);
    load(next);
  };

  const clearFilters = () => {
    const next = defaultFilters();
    setDraft(next);
    setFilters(next);
    load(next);
  };

  const setPage = (page: number) => {
    const next = { ...filters, page };
    setFilters(next);
    load(next);
  };

  const pageStats = useMemo(() => {
    const collecting = items.filter((t) => t.status === "COLLECTING").length;
    const running = items.filter((t) => t.status === "IN_PROGRESS").length;
    const seatsFree = items.reduce((s, t) => s + Number(t.availableSeats || 0), 0);
    const debt = items.reduce((s, t) => s + Number(t.driverDebtAmount || 0), 0);
    return { collecting, running, seatsFree, debt };
  }, [items]);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [moveTargetTripId, setMoveTargetTripId] = useState("");
  const [movingBookingId, setMovingBookingId] = useState<number | null>(null);

  const openDetail = async (id: number) => {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await api.get(`/admin/trips/${id}`);
      setDetail(r.data);
    } catch (e: any) {
      alert(e.response?.data?.message || "Không tải được chi tiết chuyến");
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const setStatus = async (id: number, status: string) => {
    if (status === "COMPLETED" && !confirm("Hoàn thành chuyến? Hệ thống chốt hoa hồng và đặt tài xế Rảnh tại điểm đến.")) return;
    if (status === "CANCELLED" && !confirm("Hủy chuyến?")) return;
    setActionBusyId(id);
    try {
      const r = await api.patch(`/admin/trips/${id}`, { status });
      if (status === "COMPLETED" && r.data?.message) alert(r.data.message);
      await load();
      if (detailId === id) await openDetail(id);
    } finally {
      setActionBusyId(null);
    }
  };

  const moveBooking = async (bookingId: number) => {
    if (!detailId || !moveTargetTripId.trim()) return alert("Nhập ID chuyến đích");
    if (!confirm("Khách đã đồng ý chuyển sang chuyến khác?")) return;
    setMovingBookingId(bookingId);
    try {
      const r = await api.post(`/admin/bookings/${bookingId}/move-trip`, {
        fromTripId: detailId,
        toTripId: Number(moveTargetTripId),
        customerAgreed: true,
      });
      alert(r.data?.message || "Đã chuyển chuyến");
      await openDetail(detailId);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || "Không chuyển được");
    } finally {
      setMovingBookingId(null);
    }
  };

  const renderRowActions = (t: TripRow, compact?: boolean) => (
    <div className={`flex flex-col items-end gap-2 ${compact ? "mt-3 w-full" : ""}`}>
      <button
        type="button"
        className={`inline-flex items-center justify-center gap-1 font-bold text-brand-700 hover:underline ${compact ? "btn-secondary w-full py-2 text-sm" : "text-sm"}`}
        onClick={() => openDetail(t.id)}
      >
        Chi tiết
      </button>
      <TripQuickActions trip={t} busy={actionBusyId === t.id} onAction={(s) => setStatus(t.id, s)} />
    </div>
  );

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle
          title="Chuyến xe"
          subtitle="Theo dõi chuyến đang gom, đang chạy và công nợ tài xế. Gom khách mới tại menu Điều phối (3 cột)."
        />
        <Link to="/admin/dispatch" className="btn-primary inline-flex items-center gap-2 py-2.5">
          <Car size={18} />
          Điều phối
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tổng chuyến (lọc)" value={meta.total} tone="brand" icon={<dashboardIcons.Car size={20} />} />
        <StatCard
          label="Đang gom (trang này)"
          value={pageStats.collecting}
          tone="blue"
          icon={<Users size={20} />}
          hint={`${pageStats.seatsFree} ghế trống trên trang`}
        />
        <StatCard label="Đang chạy (trang này)" value={pageStats.running} tone="green" icon={<Truck size={20} />} />
        <StatCard
          label="Công nợ (trang này)"
          value={formatMoney(pageStats.debt)}
          tone="orange"
          icon={<dashboardIcons.Banknote size={20} />}
        />
      </div>

      <div className="card !p-0 overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left md:hidden"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-900">
            <Filter size={18} className="text-brand-700" />
            Bộ lọc chuyến
          </span>
          <span className="text-xs font-semibold text-brand-700">{filtersOpen ? "Thu gọn" : "Mở"}</span>
        </button>

        <div className={`border-t border-slate-100 px-4 py-4 ${filtersOpen ? "block" : "hidden md:block"} md:border-t-0`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="input !pl-10"
                  placeholder="Mã chuyến, tài xế, SĐT, biển số, tuyến..."
                  value={draft.keyword}
                  onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                />
              </div>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái</span>
              <select className="input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="">Tất cả</option>
                {Object.entries(TRIP_STATUS_VI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tuyến</span>
              <select className="input" value={draft.routeId} onChange={(e) => setDraft({ ...draft, routeId: e.target.value })}>
                <option value="">Tất cả</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tài xế</span>
              <select className="input" value={draft.driverId} onChange={(e) => setDraft({ ...draft, driverId: e.target.value })}>
                <option value="">Tất cả</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} • {d.phone}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Đối soát</span>
              <select
                className="input"
                value={draft.settlementStatus}
                onChange={(e) => setDraft({ ...draft, settlementStatus: e.target.value })}
              >
                <option value="">Tất cả</option>
                {Object.entries(SETTLEMENT_STATUS_VI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Từ ngày</span>
              <GregorianDateInput value={draft.from || ""} onChange={(value) => setDraft({ ...draft, from: value })} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Đến ngày</span>
              <GregorianDateInput value={draft.to || ""} onChange={(value) => setDraft({ ...draft, to: value })} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Ghế trống ≥</span>
              <input
                className="input"
                type="number"
                min={0}
                placeholder="VD: 3"
                value={draft.minAvailableSeats}
                onChange={(e) => setDraft({ ...draft, minAvailableSeats: e.target.value })}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Công nợ ≥</span>
              <input
                className="input"
                type="number"
                min={0}
                placeholder="VD: 500000"
                value={draft.debtMin}
                onChange={(e) => setDraft({ ...draft, debtMin: e.target.value })}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Sắp xếp</span>
              <select className="input" value={draft.sortBy} onChange={(e) => setDraft({ ...draft, sortBy: e.target.value })}>
                <option value="departureAt">Ngày chạy</option>
                <option value="routeName">Tuyến</option>
                <option value="driverName">Tài xế</option>
                <option value="availableSeats">Ghế trống</option>
                <option value="driverDebtAmount">Công nợ</option>
                <option value="status">Trạng thái</option>
                <option value="settlementStatus">Đối soát</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Thứ tự</span>
              <select className="input" value={draft.sortDir} onChange={(e) => setDraft({ ...draft, sortDir: e.target.value })}>
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Mỗi trang</span>
              <select
                className="input"
                value={draft.pageSize}
                onChange={(e) => setDraft({ ...draft, pageSize: Number(e.target.value) })}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary py-2" onClick={applyFilters}>
              Áp dụng lọc
            </button>
            <button type="button" className="btn-secondary py-2" onClick={clearFilters}>
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p>
          <b className="text-ink-900">{meta.total}</b> chuyến
          {meta.totalPages > 1 && (
            <>
              {" "}
              · Trang <b className="text-ink-900">{meta.page}</b>/{meta.totalPages}
            </>
          )}
        </p>
        {loading && <span className="text-xs font-semibold text-brand-700">Đang tải...</span>}
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-hidden !p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Chuyến</th>
                <th className="px-4 py-3">Ngày chạy</th>
                <th className="px-4 py-3">Tuyến</th>
                <th className="px-4 py-3">Tài xế / xe</th>
                <th className="px-4 py-3">Ghế</th>
                <th className="px-4 py-3">Doanh thu</th>
                <th className="px-4 py-3">Công nợ</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((t) => (
                <tr key={t.id} className="transition hover:bg-brand-50/40">
                  <td className="px-4 py-3">
                    <button type="button" className="group text-left" onClick={() => openDetail(t.id)}>
                      <b className="text-brand-800 group-hover:underline">{t.code}</b>
                    </button>
                    <p className="mt-0.5 text-xs text-slate-500">{t._count?.tripBookings ?? 0} đơn</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink-800">{fmtDepartureTime(t.departureAt)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{t.route?.name || "—"}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={12} className="shrink-0" />
                      {t.route?.fromName || "—"} → {t.route?.toName || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{t.driver?.name || "Chưa gán"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.driver?.phone ? `${t.driver.phone} · ` : ""}
                      {t.vehicle?.licensePlate || "Chưa có biển số"}
                      {t.vehicle?.vehicleType ? ` · ${t.vehicle.vehicleType}` : ""}
                    </p>
                  </td>
                  <td className="min-w-[120px] px-4 py-3">
                    <SeatMeter booked={Number(t.bookedSeats || 0)} total={Number(t.totalSeats || 0)} available={Number(t.availableSeats || 0)} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-extrabold text-cta">{formatMoney(t.totalCustomerAmount)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">HH {formatMoney(t.adminCommission)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{formatMoney(t.driverDebtAmount)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{settlementStatus(t.settlementStatus)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${tripStatusBadgeClass(t.status)}`}>{tripStatus(t.status)}</span>
                    <select
                      className="input mt-2 w-full max-w-[160px] py-1 text-xs"
                      value={t.status}
                      disabled={actionBusyId === t.id}
                      onChange={(e) => setStatus(t.id, e.target.value)}
                    >
                      {Object.entries(TRIP_STATUS_VI).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">{renderRowActions(t)}</td>
                </tr>
              ))}
              {!loading && !items.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    Không có chuyến phù hợp bộ lọc.{" "}
                    <Link to="/admin/dispatch" className="font-bold text-brand-700">
                      Sang điều phối
                    </Link>{" "}
                    để tạo chuyến mới.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {items.map((t) => (
          <div key={t.id} className="card !p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{t.code}</p>
                <p className="mt-1 text-sm font-semibold text-ink-900">{t.route?.name || "—"}</p>
                <p className="mt-0.5 text-xs text-slate-500">{fmtDepartureTime(t.departureAt)}</p>
              </div>
              <span className={`badge shrink-0 ${tripStatusBadgeClass(t.status)}`}>{tripStatus(t.status)}</span>
            </div>
            <div className="mt-3">
              <SeatMeter booked={Number(t.bookedSeats || 0)} total={Number(t.totalSeats || 0)} available={Number(t.availableSeats || 0)} />
            </div>
            <p className="mt-3 text-sm text-ink-800">
              {t.driver?.name || "Chưa gán tài xế"}
              {t.vehicle?.licensePlate ? ` · ${t.vehicle.licensePlate}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-extrabold text-cta">{formatMoney(t.totalCustomerAmount)}</p>
              <p className="text-xs text-slate-500">Nợ {formatMoney(t.driverDebtAmount)}</p>
            </div>
            {renderRowActions(t, true)}
          </div>
        ))}
        {!loading && !items.length && (
          <div className="card py-10 text-center text-sm text-slate-500">
            Không có chuyến phù hợp bộ lọc.
            <br />
            <Link to="/admin/dispatch" className="font-bold text-brand-700">
              Điều phối chuyến mới
            </Link>
          </div>
        )}
      </div>

      {meta.totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Phân trang">
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
                aria-current={p === meta.page ? "page" : undefined}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className="btn-secondary min-w-[2.5rem] px-3 py-2 text-sm"
            disabled={meta.page >= meta.totalPages || loading}
            onClick={() => setPage(meta.page + 1)}
          >
            ›
          </button>
        </nav>
      )}

      {detailId !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={() => setDetailId(null)}>
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Chi tiết chuyến</p>
                <h2 className="mt-1 text-xl font-extrabold text-ink-900">{detail?.code || `#${detailId}`}</h2>
                {detail && (
                  <span className={`badge mt-2 ${tripStatusBadgeClass(detail.status)}`}>{tripStatus(detail.status)}</span>
                )}
              </div>
              <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100" onClick={() => setDetailId(null)} aria-label="Đóng">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {detailLoading && <p className="text-sm font-semibold text-ink-500">Đang tải chi tiết...</p>}
              {detail && (
                <div className="grid gap-5">
                  <div className="grid gap-3 rounded-2xl bg-gradient-to-br from-brand-50/80 to-slate-50 p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">Ngày chạy</p>
                      <p className="mt-1 font-semibold text-ink-900">{fmtDepartureTime(detail.departureAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">Tuyến</p>
                      <p className="mt-1 font-semibold text-ink-900">{detail.route?.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">Tài xế</p>
                      <p className="mt-1 font-semibold text-ink-900">{detail.driver?.name || "Chưa gán"}</p>
                      {detail.driver?.phone && <p className="text-xs text-slate-500">{detail.driver.phone}</p>}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">Xe</p>
                      <p className="mt-1 font-semibold text-ink-900">{detail.vehicle?.licensePlate || "—"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <SeatMeter
                        booked={Number(detail.bookedSeats || 0)}
                        total={Number(detail.totalSeats || 0)}
                        available={Number(detail.availableSeats || 0)}
                      />
                    </div>
                    {detail.driverRejectReason && (
                      <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Tài xế từ chối: <b>{detail.driverRejectReason}</b>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-extrabold text-ink-900">Đơn trong chuyến</h3>
                      <span className="badge badge-info">{detail.tripBookings?.length || 0} đơn</span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {(detail.tripBookings || []).map((tb: any) => (
                        <div key={tb.id} className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-brand-200 hover:bg-brand-50/30">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link to={`/admin/don-hang/${tb.booking?.id}`} className="font-bold text-brand-800 hover:underline">
                                {tb.booking?.code}
                              </Link>
                              <p className="mt-0.5 font-medium text-ink-900">{tb.booking?.customerName}</p>
                              <p className="text-xs text-slate-500">
                                {tb.booking?.customerPhone} · {tb.booking?.route?.name || "—"}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {tb.booking?.pickupAddress || "—"} → {tb.booking?.dropoffAddress || "—"}
                              </p>
                            </div>
                            <div className="text-right text-sm">
                              <div className="font-extrabold text-cta">{formatMoney(tb.booking?.finalTotal)}</div>
                              <div className="text-xs text-slate-500">HH {formatMoney(tb.booking?.commissionAmount)}</div>
                              <button
                                type="button"
                                className="btn-secondary mt-2 py-1 text-xs"
                                disabled={movingBookingId === tb.booking?.id}
                                onClick={() => moveBooking(tb.booking.id)}
                              >
                                Chuyển chuyến
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="mt-1 flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
                        <label className="text-sm font-semibold">
                          ID chuyến đích
                          <input
                            className="input mt-1 w-32"
                            placeholder="VD: 12"
                            value={moveTargetTripId}
                            onChange={(e) => setMoveTargetTripId(e.target.value)}
                          />
                        </label>
                        <p className="text-xs text-slate-500">Bấm «Chuyển chuyến» trên từng đơn sau khi nhập ID.</p>
                      </div>
                      {!detail.tripBookings?.length && <p className="text-sm text-slate-500">Chuyến chưa có đơn.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {detail && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
                <TripQuickActions trip={detail} busy={actionBusyId === detail.id} onAction={(s) => setStatus(detail.id, s)} />
                <button type="button" className="btn-secondary ml-auto py-2" onClick={() => setDetailId(null)}>
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
