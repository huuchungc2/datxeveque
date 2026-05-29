import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  ChevronDown,
  Filter,
  HandCoins,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import { api, formatMoney } from "../lib/api";
import { fmtDepartureTime, formatDisplayDateTime } from "../lib/datetime";
import { getVisiblePageNumbers } from "../lib/paginationUi";
import { PageTitle, StatCard, dashboardIcons } from "../components/ui/AdminCharts";
import { EmptyState } from "../components/ui/DesignKit";
import { SETTLEMENT_STATUS_VI, settlementStatus } from "../lib/vi";

type DebtTrip = {
  id: number;
  code: string;
  driverId?: number | null;
  settlementStatus?: string;
  departureAt?: string | null;
  driverDebtRemaining?: number;
  adminOwesRemaining?: number;
  driverPaidAdmin?: number;
  adminPaidDriver?: number;
  route?: { name?: string } | null;
  driver?: { name?: string; phone?: string } | null;
};

type PaymentRow = {
  id: number;
  amount: number | string;
  direction: string;
  method?: string | null;
  note?: string | null;
  createdAt?: string;
  driver?: { name?: string } | null;
  trip?: { code?: string } | null;
};

type Filters = {
  driverId: string;
  settlementStatus: string;
  page: number;
  pageSize: number;
};

const defaultFilters = (): Filters => ({
  driverId: "",
  settlementStatus: "",
  page: 1,
  pageSize: 20,
});

function settlementBadgeClass(status?: string | null) {
  if (status === "PAID" || status === "RECONCILED") return "badge-success";
  if (status === "PARTIAL") return "badge-warning";
  if (status === "DISPUTED") return "badge-danger";
  if (status === "WAIVED") return "badge-info";
  return "badge-info";
}

function directionLabel(direction: string) {
  return direction === "DRIVER_OWES_ADMIN" ? "Tài xế nộp VP" : "VP trả tài xế";
}

export function AdminDebts() {
  const [trips, setTrips] = useState<DebtTrip[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [drivers, setDrivers] = useState<{ id: number; name: string }[]>([]);
  const [summary, setSummary] = useState({ totalDriverDebt: 0, totalAdminOwesDriver: 0 });
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [draft, setDraft] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(true);
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    tripId: "",
    driverId: "",
    amount: "",
    direction: "DRIVER_OWES_ADMIN",
    method: "Tiền mặt",
    note: "",
  });

  const load = async (next?: Partial<Filters>) => {
    const params: Record<string, unknown> = { ...filters, ...(next || {}) };
    for (const k of Object.keys(params)) {
      if (params[k] === "" || params[k] == null) params[k] = undefined;
    }
    setLoading(true);
    try {
      const r = await api.get("/admin/reports/debts", { params });
      const d = r.data;
      setTrips(d?.trips || []);
      setPayments(d?.payments || []);
      setSummary({
        totalDriverDebt: Number(d?.totalDriverDebt || 0),
        totalAdminOwesDriver: Number(d?.totalAdminOwesDriver || 0),
      });
      setMeta({
        page: Number(d?.page || 1),
        pageSize: Number(d?.pageSize || 20),
        total: Number(d?.total || 0),
        totalPages: Number(d?.totalPages || 1),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get("/admin/drivers").then((r) => setDrivers(r.data || []));
  }, []);

  const pageStats = useMemo(() => {
    const driverDebt = trips.reduce((s, t) => s + Number(t.driverDebtRemaining || 0), 0);
    const adminOwes = trips.reduce((s, t) => s + Number(t.adminOwesRemaining || 0), 0);
    const outstanding = trips.filter(
      (t) => Number(t.driverDebtRemaining || 0) > 0 || Number(t.adminOwesRemaining || 0) > 0
    ).length;
    return { driverDebt, adminOwes, outstanding };
  }, [trips]);

  const applyFilters = () => {
    const next = { ...draft, page: 1 };
    setFilters(next);
    setDraft(next);
    load(next);
  };

  const resetFilters = () => {
    const next = defaultFilters();
    setFilters(next);
    setDraft(next);
    load(next);
  };

  const setPage = (page: number) => {
    const next = { ...filters, page };
    setFilters(next);
    setDraft((d) => ({ ...d, page }));
    load(next);
  };

  const setPageSize = (pageSize: number) => {
    const next = { ...filters, pageSize, page: 1 };
    setFilters(next);
    setDraft(next);
    load(next);
  };

  const selectTripForPay = (t: DebtTrip) => {
    setForm((f) => ({
      ...f,
      tripId: String(t.id),
      driverId: String(t.driverId || ""),
      amount: String(Math.max(0, Number(t.driverDebtRemaining || t.adminOwesRemaining || 0)) || ""),
      direction:
        Number(t.driverDebtRemaining || 0) >= Number(t.adminOwesRemaining || 0)
          ? "DRIVER_OWES_ADMIN"
          : "ADMIN_OWES_DRIVER",
    }));
    setPayOpen(true);
    setPayMsg(null);
  };

  const pay = async () => {
    if (!form.driverId || !form.amount) {
      setPayMsg("Chọn tài xế và nhập số tiền.");
      return;
    }
    setPayBusy(true);
    setPayMsg(null);
    try {
      await api.post("/admin/settlements", {
        ...form,
        tripId: form.tripId || null,
        amount: Number(form.amount),
      });
      setForm({
        tripId: "",
        driverId: "",
        amount: "",
        direction: "DRIVER_OWES_ADMIN",
        method: "Tiền mặt",
        note: "",
      });
      setPayMsg("Đã ghi nhận thanh toán.");
      load();
    } catch (e: any) {
      setPayMsg(e.response?.data?.message || "Không ghi nhận được thanh toán.");
    } finally {
      setPayBusy(false);
    }
  };

  const rangeLabel =
    meta.total > 0
      ? `${(meta.page - 1) * meta.pageSize + 1}–${Math.min(meta.page * meta.pageSize, meta.total)} / ${meta.total}`
      : "0 chuyến";

  return (
    <div className="space-y-5 pb-8">
      <PageTitle
        title="Công nợ & đối soát"
        subtitle="Theo dõi tiền tài xế nộp văn phòng và tiền văn phòng trả tài xế. Ghi nhận thanh toán theo từng chuyến."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tài xế còn nợ VP"
          value={formatMoney(summary.totalDriverDebt)}
          tone="red"
          icon={<AlertTriangle size={20} />}
          hint="Tổng còn lại (theo bộ lọc)"
        />
        <StatCard
          label="VP còn trả tài xế"
          value={formatMoney(summary.totalAdminOwesDriver)}
          tone="green"
          icon={<Wallet size={20} />}
          hint="Tổng còn lại (theo bộ lọc)"
        />
        <StatCard
          label="Chuyến (lọc)"
          value={meta.total}
          tone="brand"
          icon={<dashboardIcons.Car size={20} />}
          hint={`${pageStats.outstanding} chuyến còn dư trên trang`}
        />
        <StatCard
          label="Dư nợ (trang này)"
          value={formatMoney(pageStats.driverDebt + pageStats.adminOwes)}
          tone="orange"
          icon={<Banknote size={20} />}
          hint={`TX nợ ${formatMoney(pageStats.driverDebt)} · VP trả ${formatMoney(pageStats.adminOwes)}`}
        />
      </div>

      <div className="card !p-0 overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left md:hidden"
          onClick={() => setPayOpen((o) => !o)}
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-900">
            <HandCoins size={18} className="text-brand-700" />
            Ghi nhận thanh toán
          </span>
          <ChevronDown size={18} className={`text-slate-500 transition ${payOpen ? "rotate-180" : ""}`} />
        </button>
        <div className={`border-t border-slate-100 px-4 py-4 md:border-t-0 ${payOpen ? "block" : "hidden md:block"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="hidden text-base font-extrabold text-ink-900 md:block">Ghi nhận thanh toán</h2>
              <p className="mt-1 text-sm text-slate-500">Chọn chuyến bên dưới hoặc nhập tay — hệ thống cập nhật trạng thái đối soát.</p>
            </div>
            {form.tripId && (
              <span className="badge badge-info">Chuyến #{form.tripId}</span>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tài xế</span>
              <select
                className="input"
                value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              >
                <option value="">Chọn tài xế</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Mã chuyến (ID)</span>
              <input
                className="input"
                placeholder="VD: 12"
                value={form.tripId}
                onChange={(e) => setForm({ ...form, tripId: e.target.value })}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Số tiền (đ)</span>
              <input
                className="input"
                type="number"
                min={0}
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Chiều thanh toán</span>
              <select
                className="input"
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value })}
              >
                <option value="DRIVER_OWES_ADMIN">Tài xế nộp văn phòng</option>
                <option value="ADMIN_OWES_DRIVER">Văn phòng trả tài xế</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Hình thức</span>
              <input
                className="input"
                placeholder="Tiền mặt, chuyển khoản..."
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Ghi chú</span>
              <input
                className="input"
                placeholder="Tuỳ chọn"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary inline-flex items-center gap-2" disabled={payBusy} onClick={pay}>
              <Receipt size={18} />
              {payBusy ? "Đang lưu..." : "Xác nhận thanh toán"}
            </button>
            {payMsg && (
              <p className={`text-sm font-semibold ${payMsg.includes("Đã ghi") ? "text-green-700" : "text-red-600"}`}>
                {payMsg}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left md:hidden"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-900">
            <Filter size={18} className="text-brand-700" />
            Bộ lọc công nợ
          </span>
          <span className="text-xs font-semibold text-brand-700">{filtersOpen ? "Thu gọn" : "Mở"}</span>
        </button>
        <div className={`border-t border-slate-100 px-4 py-4 ${filtersOpen ? "block" : "hidden md:block"} md:border-t-0`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tài xế</span>
              <select
                className="input"
                value={draft.driverId}
                onChange={(e) => setDraft({ ...draft, driverId: e.target.value })}
              >
                <option value="">Tất cả tài xế</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái đối soát</span>
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
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Số dòng / trang</span>
              <select
                className="input"
                value={draft.pageSize}
                onChange={(e) => setDraft({ ...draft, pageSize: Number(e.target.value) })}
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} dòng
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-1">
              <button type="button" className="btn-primary flex-1 py-2.5" onClick={applyFilters} disabled={loading}>
                <span className="inline-flex items-center justify-center gap-2">
                  <Search size={16} />
                  Áp dụng
                </span>
              </button>
              <button type="button" className="btn-secondary py-2.5" onClick={resetFilters} disabled={loading}>
                Xóa lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>
          {loading ? "Đang tải..." : `Hiển thị ${rangeLabel} chuyến`}
        </span>
        {meta.totalPages > 1 && (
          <span>
            Trang <b className="text-ink-800">{meta.page}</b> / {meta.totalPages}
          </span>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Chuyến</th>
              <th className="px-4 py-3">Tuyến / ngày</th>
              <th className="px-4 py-3">Tài xế</th>
              <th className="px-4 py-3">Đối soát</th>
              <th className="px-4 py-3 text-right">TX nợ VP</th>
              <th className="px-4 py-3 text-right">VP trả TX</th>
              <th className="px-4 py-3 text-right">Đã thu / trả</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.map((t) => {
              const hasDebt = Number(t.driverDebtRemaining || 0) > 0 || Number(t.adminOwesRemaining || 0) > 0;
              return (
                <tr key={t.id} className={`transition hover:bg-brand-50/40 ${hasDebt ? "" : "opacity-75"}`}>
                  <td className="px-4 py-3">
                    <p className="font-extrabold text-brand-800">{t.code}</p>
                    <p className="text-xs text-slate-400">#{t.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{t.route?.name || "—"}</p>
                    <p className="text-xs text-slate-500">{fmtDepartureTime(t.departureAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{t.driver?.name || "Chưa gán"}</p>
                    {t.driver?.phone && <p className="text-xs text-slate-500">{t.driver.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${settlementBadgeClass(t.settlementStatus)}`}>
                      {settlementStatus(t.settlementStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${Number(t.driverDebtRemaining) > 0 ? "text-red-600" : "text-slate-400"}`}>
                      {formatMoney(t.driverDebtRemaining)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${Number(t.adminOwesRemaining) > 0 ? "text-cta" : "text-slate-400"}`}>
                      {formatMoney(t.adminOwesRemaining)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">
                    <p>
                      <ArrowUpRight size={12} className="mr-1 inline text-red-500" />
                      {formatMoney(t.driverPaidAdmin)}
                    </p>
                    <p className="mt-0.5">
                      <ArrowDownLeft size={12} className="mr-1 inline text-green-600" />
                      {formatMoney(t.adminPaidDriver)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => selectTripForPay(t)}>
                      Thanh toán
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && !trips.length && (
          <div className="px-4 py-12 text-center text-sm text-slate-500">Không có chuyến phù hợp bộ lọc.</div>
        )}
      </div>

      <div className="grid gap-3 md:hidden">
        {trips.map((t) => {
          const hasDebt = Number(t.driverDebtRemaining || 0) > 0 || Number(t.adminOwesRemaining || 0) > 0;
          return (
            <div key={t.id} className={`card ${hasDebt ? "ring-1 ring-brand-100" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{t.code}</p>
                  <p className="mt-1 font-extrabold text-ink-900">{t.route?.name || "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">{fmtDepartureTime(t.departureAt)}</p>
                </div>
                <span className={`badge ${settlementBadgeClass(t.settlementStatus)}`}>
                  {settlementStatus(t.settlementStatus)}
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-800">{t.driver?.name || "Chưa gán tài xế"}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">TX nợ VP</p>
                  <p className="font-extrabold text-red-600">{formatMoney(t.driverDebtRemaining)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">VP trả TX</p>
                  <p className="font-extrabold text-cta">{formatMoney(t.adminOwesRemaining)}</p>
                </div>
              </div>
              <button type="button" className="btn-primary mt-3 w-full py-2 text-sm" onClick={() => selectTripForPay(t)}>
                Ghi nhận thanh toán
              </button>
            </div>
          );
        })}
        {!loading && !trips.length && (
          <EmptyState title="Không có công nợ" subtitle="Thử đổi bộ lọc hoặc chờ chuyến hoàn thành." />
        )}
      </div>

      {meta.totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Phân trang công nợ">
          <button
            type="button"
            className="btn-secondary min-w-[2.5rem] px-3 py-2 text-sm"
            disabled={meta.page <= 1 || loading}
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
          <select
            className="input ml-2 !w-auto py-2 text-sm"
            value={meta.pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            aria-label="Số dòng mỗi trang"
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n}/trang
              </option>
            ))}
          </select>
        </nav>
      )}

      {payments.length > 0 && (
        <div className="card">
          <h2 className="text-base font-extrabold text-ink-900">Thanh toán gần đây</h2>
          <p className="mt-1 text-sm text-slate-500">10 giao dịch mới nhất theo bộ lọc hiện tại.</p>
          <div className="mt-4 divide-y divide-slate-100">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-semibold text-ink-900">
                    {formatMoney(p.amount)}{" "}
                    <span className="text-sm font-normal text-slate-500">· {directionLabel(p.direction)}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.driver?.name || "—"}
                    {p.trip?.code ? ` · ${p.trip.code}` : ""}
                    {p.method ? ` · ${p.method}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-400">{formatDisplayDateTime(p.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
