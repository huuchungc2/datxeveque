import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Filter, Plus, Search } from "lucide-react";
import { api, formatMoney } from "../lib/api";
import { ChevronRight } from "lucide-react";
import { fmtBookingScheduledAt, formatDisplayDate, todayLocalDateValue } from "../lib/datetime";
import { ensureAppTime } from "../lib/appTime";
import { getVisiblePageNumbers } from "../lib/paginationUi";
import { PageTitle } from "../components/ui/AdminCharts";
import { GregorianDateInput } from "../components/ui/GregorianDateInputs";
import { SERVICE_TYPE_OPTIONS, serviceTypeLabel } from "../lib/serviceTypes";
import { adminBookingQuantityLabel, usesPassengerCount } from "../lib/bookingSeats";
import {
  BOOKING_PAYMENT_STATUS_VI,
  BOOKING_STATUS_VI,
  bookingPaymentStatus,
  bookingStatus,
} from "../lib/vi";
import {
  canAdminCancelBooking,
  canAdminConfirmBooking,
  cancelAdminBooking,
} from "../lib/adminBookingAddresses";

type BookingRow = {
  id: number;
  code: string;
  type: string;
  customerName: string;
  customerPhone?: string;
  status: string;
  paymentStatus?: string;
  scheduledAt?: string | null;
  scheduledAtLocal?: string | null;
  finalTotal?: number | string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  direction?: string | null;
  passengerCount?: number | null;
  weightKg?: number | string | null;
  hasAccompanyingCargo?: boolean | null;
  vehicleType?: string | null;
  route?: { name?: string } | null;
  tripBookings?: { trip?: { code?: string; driver?: { name?: string } } }[];
};

function statusBadgeClass(status: string) {
  if (status === "COMPLETED") return "badge-success";
  if (status === "CANCELLED" || status === "NO_SHOW") return "badge-danger";
  if (["NEW", "CONTACTED", "QUOTED", "WAITING_DEPOSIT"].includes(status)) return "badge-warning";
  return "badge-info";
}

function tripSummary(b: BookingRow) {
  const trip = b.tripBookings?.[0]?.trip;
  if (!trip?.code) return null;
  const driver = trip.driver?.name;
  return driver ? `${trip.code} · ${driver}` : trip.code;
}

function scheduledDateRangeLabel(from: string, to: string) {
  if (from === to) return `ngày ${formatDisplayDate(from)}`;
  return `từ ${formatDisplayDate(from)} đến ${formatDisplayDate(to)}`;
}

export function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<BookingRow[]>([]);
  const [routes, setRoutes] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [meta, setMeta] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });

  /** Mặc định: đơn trong ngày hôm nay (theo giờ server VN) */
  useEffect(() => {
    if (searchParams.get("from")) return;
    void ensureAppTime().then(() => {
      const today = todayLocalDateValue();
      const next = new URLSearchParams(searchParams);
      next.set("from", today);
      next.set("to", today);
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    });
  }, [searchParams, setSearchParams]);

  const filters = useMemo(() => {
    const today = todayLocalDateValue();
    const from = searchParams.get("from") || today;
    const to = searchParams.get("to") || from;
    return {
      q: searchParams.get("q") || "",
      type: searchParams.get("type") || "",
      routeId: searchParams.get("routeId") || "",
      status: searchParams.get("status") || "",
      paymentStatus: searchParams.get("paymentStatus") || "",
      from,
      to,
      page: Number(searchParams.get("page") || 1),
      limit: 30,
    };
  }, [searchParams]);

  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters.q, filters.type, filters.routeId, filters.status, filters.paymentStatus, filters.from, filters.to, filters.page]);

  const load = async () => {
    if (!searchParams.get("from")) return;
    setLoading(true);
    const params: Record<string, string | number> = {
      page: filters.page,
      limit: filters.limit,
      from: filters.from,
      to: filters.to,
    };
    if (filters.q) params.q = filters.q;
    if (filters.type) params.type = filters.type;
    if (filters.routeId) params.routeId = filters.routeId;
    if (filters.status) params.status = filters.status;
    if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
    try {
      const r = await api.get("/admin/bookings", { params });
      setItems(r.data?.items || []);
      setMeta({
        page: Number(r.data?.page || 1),
        limit: Number(r.data?.limit || 30),
        total: Number(r.data?.total || 0),
        totalPages: Number(r.data?.totalPages || 1),
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || "Không tải được danh sách đơn");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [searchParams]);

  useEffect(() => {
    api.get("/admin/routes").then((r) => setRoutes(r.data));
  }, []);

  const applyFilters = () => {
    const today = todayLocalDateValue();
    let from = draft.from?.trim() || today;
    let to = draft.to?.trim() || today;
    if (from > to) [from, to] = [to, from];
    const next = new URLSearchParams();
    if (draft.q.trim()) next.set("q", draft.q.trim());
    if (draft.type) next.set("type", draft.type);
    if (draft.routeId) next.set("routeId", draft.routeId);
    if (draft.status) next.set("status", draft.status);
    if (draft.paymentStatus) next.set("paymentStatus", draft.paymentStatus);
    next.set("from", from);
    next.set("to", to);
    next.set("page", "1");
    setSearchParams(next);
  };

  const clearFilters = () => {
    const today = todayLocalDateValue();
    setDraft({ q: "", type: "", routeId: "", status: "", paymentStatus: "", from: today, to: today, page: 1, limit: 30 });
    setSearchParams({ from: today, to: today, page: "1" });
  };

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
  };

  const listHref = (id: number) => {
    const qs = searchParams.toString();
    return qs ? `/admin/don-hang/${id}?${qs}` : `/admin/don-hang/${id}`;
  };

  const quickConfirm = async (id: number) => {
    if (!confirm("Xác nhận đơn này? Đơn chuyển sang chờ điều phối.")) return;
    setActionBusyId(id);
    try {
      await api.post(`/admin/bookings/${id}/confirm`, { outcome: "CONFIRMED" });
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || "Không xác nhận được");
    } finally {
      setActionBusyId(null);
    }
  };

  const quickCancel = async (id: number) => {
    setActionBusyId(id);
    try {
      const ok = await cancelAdminBooking(id, (url, body) => api.post(url, body));
      if (ok) await load();
    } finally {
      setActionBusyId(null);
    }
  };

  const renderRowActions = (b: BookingRow, compact?: boolean) => {
    const busy = actionBusyId === b.id;
    const canConfirm = canAdminConfirmBooking(b.status);
    const canCancel = canAdminCancelBooking(b.status);
    return (
      <div className={`flex flex-wrap justify-end gap-1.5 ${compact ? "mt-3 w-full" : ""}`}>
        {canConfirm && (
          <button
            type="button"
            className={`btn-primary py-1.5 text-xs ${compact ? "min-h-[2.5rem] flex-1" : "px-2.5"}`}
            disabled={busy}
            onClick={() => quickConfirm(b.id)}
          >
            {busy ? "..." : "Xác nhận"}
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            className={`btn-secondary border-red-200 py-1.5 text-xs text-red-700 hover:bg-red-50 ${compact ? "min-h-[2.5rem] flex-1" : "px-2.5"}`}
            disabled={busy}
            onClick={() => quickCancel(b.id)}
          >
            Hủy
          </button>
        )}
        <Link
          to={listHref(b.id)}
          className={`inline-flex items-center justify-center gap-0.5 font-bold text-brand-700 hover:underline ${
            compact ? "btn-secondary w-full py-2 text-sm" : "text-sm"
          }`}
        >
          Chi tiết {!compact && <ChevronRight size={16} />}
        </Link>
      </div>
    );
  };

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <PageTitle
            title="Đơn đặt xe"
            subtitle={`Đơn có giờ đi ${scheduledDateRangeLabel(filters.from, filters.to)} — xác nhận / hủy nhanh ngay trên bảng hoặc bấm «Chi tiết» để sửa đơn.`}
          />
        </div>
        <Link to="/admin/don-hang/moi" className="btn-primary inline-flex w-full min-h-[44px] shrink-0 items-center justify-center gap-2 py-2.5 sm:w-auto">
          <Plus size={18} />
          Thêm đơn
        </Link>
      </div>

      <div className="card !p-0 overflow-hidden">
        <button
          type="button"
          className="flex w-full min-h-[44px] items-center justify-between gap-3 px-4 py-3 text-left md:hidden"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-900">
            <Filter size={18} className="text-brand-700" />
            Bộ lọc
          </span>
          <span className="text-xs font-semibold text-brand-700">{filtersOpen ? "Thu gọn" : "Mở"}</span>
        </button>

        <div className={`border-t border-slate-100 px-4 py-4 ${filtersOpen ? "block" : "hidden md:block"} md:border-t-0`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="sm:col-span-2 lg:col-span-3">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="input w-full !pl-10"
                  placeholder="Mã đơn, tên, SĐT..."
                  value={draft.q}
                  onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                />
              </div>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Loại đơn</span>
              <select className="input w-full" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="">Tất cả</option>
                {SERVICE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tuyến</span>
              <select className="input w-full" value={draft.routeId} onChange={(e) => setDraft({ ...draft, routeId: e.target.value })}>
                <option value="">Tất cả</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái</span>
              <select className="input w-full" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="">Tất cả</option>
                {Object.entries(BOOKING_STATUS_VI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Thanh toán</span>
              <select
                className="input w-full"
                value={draft.paymentStatus}
                onChange={(e) => setDraft({ ...draft, paymentStatus: e.target.value })}
              >
                <option value="">Tất cả</option>
                {Object.entries(BOOKING_PAYMENT_STATUS_VI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-3">
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Từ ngày (giờ đi)</span>
                <GregorianDateInput
                  clearable={false}
                  value={draft.from || todayLocalDateValue()}
                  onChange={(value) => setDraft({ ...draft, from: value || todayLocalDateValue() })}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Đến ngày (giờ đi)</span>
                <GregorianDateInput
                  clearable={false}
                  value={draft.to || todayLocalDateValue()}
                  onChange={(value) => setDraft({ ...draft, to: value || todayLocalDateValue() })}
                />
              </label>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" className="btn-primary min-h-[44px] w-full py-2.5 sm:w-auto sm:min-w-[10rem]" onClick={applyFilters}>
              Áp dụng lọc
            </button>
            <button type="button" className="btn-secondary min-h-[44px] w-full py-2.5 sm:w-auto" onClick={clearFilters}>
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p>
          <b className="text-ink-900">{meta.total}</b> đơn
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
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Mã / khách</th>
                <th className="px-4 py-3">Loại · tuyến</th>
                <th className="px-4 py-3">Ghế / SL</th>
                <th className="px-4 py-3">Giờ đi</th>
                <th className="px-4 py-3">Đón → trả</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Tiền</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((b) => (
                <tr key={b.id} className="transition hover:bg-brand-50/40">
                  <td className="px-4 py-3">
                    <Link to={listHref(b.id)} className="group block">
                      <b className="text-brand-800 group-hover:underline">{b.code}</b>
                      <p className="mt-0.5 font-medium text-ink-900">{b.customerName}</p>
                      <p className="text-xs text-slate-500">{b.customerPhone}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{serviceTypeLabel[b.type] || b.type}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{b.route?.name || "—"}</p>
                    {b.direction && <p className="mt-0.5 text-xs text-slate-500">{b.direction}</p>}
                    {tripSummary(b) && <p className="mt-1 text-xs font-semibold text-brand-700">{tripSummary(b)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <b className="text-brand-800">{adminBookingQuantityLabel(b)}</b>
                    {b.vehicleType && !usesPassengerCount(b.type) && b.type !== "CARGO" && (
                      <p className="mt-0.5 text-xs text-slate-600">{b.vehicleType}</p>
                    )}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap ${b.scheduledAt ? "text-ink-800" : "font-semibold text-amber-700"}`}>
                    {fmtBookingScheduledAt(b)}
                  </td>
                  <td className="max-w-[200px] px-4 py-3">
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {b.pickupAddress || "—"} → {b.dropoffAddress || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusBadgeClass(b.status)}`}>{bookingStatus(b.status)}</span>
                    {b.paymentStatus && (
                      <p className="mt-1 text-xs text-slate-500">{bookingPaymentStatus(b.paymentStatus)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-cta">{formatMoney(b.finalTotal)}</td>
                  <td className="px-4 py-3 text-right">{renderRowActions(b)}</td>
                </tr>
              ))}
              {!loading && !items.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Không có đơn {scheduledDateRangeLabel(filters.from, filters.to)}. Đổi khoảng ngày lọc hoặc{" "}
                    <Link to="/admin/don-hang/moi" className="font-bold text-brand-700">
                      tạo đơn mới
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {items.map((b) => (
          <div key={b.id} className="card !p-4">
            <Link to={listHref(b.id)} className="block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{b.code}</p>
                  <p className="mt-1 truncate text-base font-extrabold text-ink-900">{b.customerName}</p>
                  <p className="text-sm text-slate-600">{b.customerPhone}</p>
                </div>
                <p className="shrink-0 text-lg font-extrabold text-cta">{formatMoney(b.finalTotal)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`badge ${statusBadgeClass(b.status)}`}>{bookingStatus(b.status)}</span>
                <span className="badge bg-slate-100 text-slate-700">{serviceTypeLabel[b.type] || b.type}</span>
                <span className="badge bg-brand-50 text-brand-800">{adminBookingQuantityLabel(b)}</span>
              </div>
              <p className={`mt-3 text-sm ${b.scheduledAt ? "text-ink-800" : "font-semibold text-amber-700"}`}>
                {fmtBookingScheduledAt(b)}
                {b.route?.name ? ` · ${b.route.name}` : ""}
              </p>
              {(b.pickupAddress || b.dropoffAddress) && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                  {b.pickupAddress || "—"} → {b.dropoffAddress || "—"}
                </p>
              )}
              {tripSummary(b) && <p className="mt-2 text-xs font-bold text-brand-700">Chuyến: {tripSummary(b)}</p>}
            </Link>
            {renderRowActions(b, true)}
          </div>
        ))}
        {!loading && !items.length && (
          <div className="card py-10 text-center text-sm text-slate-500">
            Không có đơn có giờ đi {scheduledDateRangeLabel(filters.from, filters.to)}.
            <br />
            Thử đổi <b>Từ ngày</b> / <b>Đến ngày</b> hoặc bấm <b>Xóa lọc</b> (mặc định hôm nay).{" "}
            <Link to="/admin/don-hang/moi" className="font-bold text-brand-700">
              Thêm đơn mới
            </Link>
          </div>
        )}
      </div>

      {meta.totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Phân trang">
          <button
            type="button"
            className="btn-secondary min-w-[2.5rem] px-3 py-2 text-sm"
            disabled={meta.page <= 1}
            onClick={() => setPage(meta.page - 1)}
          >
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
                className={`min-w-[2.5rem] rounded-xl px-3 py-2 text-sm font-bold transition ${
                  p === meta.page ? "bg-brand-700 text-white shadow-sm" : "btn-secondary"
                }`}
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
            disabled={meta.page >= meta.totalPages}
            onClick={() => setPage(meta.page + 1)}
          >
            ›
          </button>
        </nav>
      )}
    </div>
  );
}
