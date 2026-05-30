import type React from "react";
import { Activity, AlertTriangle, Banknote, Car, CheckCircle2, Clock, Route, Users } from "lucide-react";
import { formatMoney } from "../../lib/api";
import { formatShortDate, parseLocalDateTimeParts } from "../../lib/datetime";

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PLANNED: "Đã lên chuyến",
    READY: "Sẵn sàng",
    RUNNING: "Đang chạy",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã huỷ",
    WAITING_DISPATCH: "Chờ điều phối",
    CONFIRMED: "Đã xác nhận",
    ASSIGNED: "Đã gán chuyến",
  };
  return map[status] || status || "Không rõ";
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-700">Đặt Xe Về Quê</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">{subtitle}</p>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "brand",
  icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "brand" | "orange" | "green" | "red" | "blue" | "slate";
  icon?: React.ReactNode;
  hint?: string;
}) {
  const toneClass: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700 ring-brand-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    green: "bg-green-50 text-green-700 ring-green-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-50/70" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-500">{label}</p>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">{value}</div>
          {hint && <p className="mt-2 text-xs font-medium text-ink-500">{hint}</p>}
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-2xl ring-1 ${toneClass[tone]}`}>{icon || <Activity size={20} />}</div>
      </div>
    </div>
  );
}

export function RevenueTrendChart({ trips }: { trips: any[] }) {
  const buckets = (trips || []).reduce((acc: Record<string, { sortKey: string; label: string; revenue: number; commission: number }>, t: any) => {
    const at = t.departureAt || t.createdAt;
    const p = parseLocalDateTimeParts(at) || parseLocalDateTimeParts(new Date());
    const sortKey = p
      ? `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
      : "0000-00-00";
    const label = formatShortDate(at || new Date());
    acc[sortKey] ||= { sortKey, label, revenue: 0, commission: 0 };
    acc[sortKey].revenue += toNumber(t.totalCustomerAmount);
    acc[sortKey].commission += toNumber(t.adminCommission);
    return acc;
  }, {});
  const rows = Object.values(buckets)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(-8)
    .map(({ label, revenue, commission }) => ({ label, revenue, commission }));
  const data = rows.length ? rows : [{ label: "--/--", revenue: 0, commission: 0 }];
  const max = Math.max(1, ...data.map((x) => x.revenue));
  const points = data.map((x, i) => `${(i / Math.max(1, data.length - 1)) * 100},${92 - (x.revenue / max) * 72}`).join(" ");
  const commissionPoints = data.map((x, i) => `${(i / Math.max(1, data.length - 1)) * 100},${92 - (x.commission / max) * 72}`).join(" ");

  return (
    <div className="chart-card lg:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-ink-900">Doanh thu theo ngày</h2>
          <p className="text-sm text-ink-500">So sánh doanh thu khách trả và hoa hồng văn phòng.</p>
        </div>
        <Banknote className="text-brand-700" size={22} />
      </div>
      <div className="mt-5 h-64 rounded-3xl bg-gradient-to-b from-brand-50 to-white p-4">
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none">
          {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(100,116,139,.18)" strokeWidth="0.5" />)}
          <polyline points={`0,96 ${points} 100,96`} fill="rgba(15,118,110,.12)" stroke="none" />
          <polyline points={points} fill="none" stroke="currentColor" className="text-brand-700" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={commissionPoints} fill="none" stroke="currentColor" className="text-orange-500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-semibold text-slate-500 md:grid-cols-8">
        {data.map((x) => <span key={x.label}>{x.label}</span>)}
      </div>
    </div>
  );
}

export function StatusDonutChart({ trips }: { trips: any[] }) {
  const counts = (trips || []).reduce((acc: Record<string, number>, t: any) => {
    acc[t.status || "UNKNOWN"] = (acc[t.status || "UNKNOWN"] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts);
  const total = Math.max(1, entries.reduce((s, [, v]) => s + v, 0));
  let start = 0;
  const colors = ["#0F766E", "#F97316", "#2563EB", "#16A34A", "#DC2626", "#64748B"];
  const gradient = entries.length
    ? entries.map(([, v], i) => {
        const deg = (v / total) * 360;
        const seg = `${colors[i % colors.length]} ${start}deg ${start + deg}deg`;
        start += deg;
        return seg;
      }).join(",")
    : "#E2E8F0 0deg 360deg";

  return (
    <div className="chart-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-ink-900">Chuyến theo trạng thái</h2>
          <p className="text-sm text-ink-500">Nhìn nhanh luồng vận hành.</p>
        </div>
        <Clock className="text-orange-500" size={22} />
      </div>
      <div className="mt-6 flex items-center gap-6">
        <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-card">
            <div><b className="block text-2xl text-ink-900">{total}</b><span className="text-xs text-ink-500">chuyến</span></div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {(entries.length ? entries : [["EMPTY", 0]]).map(([k, v], i) => (
            <div key={k} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 font-semibold text-ink-700"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />{statusLabel(String(k))}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RouteRevenueChart({ trips }: { trips: any[] }) {
  const rows = Object.values((trips || []).reduce((acc: Record<string, any>, t: any) => {
    const key = t.route?.name || "Tuyến khác";
    acc[key] ||= { label: key, value: 0 };
    acc[key].value += toNumber(t.totalCustomerAmount);
    return acc;
  }, {})).sort((a: any, b: any) => b.value - a.value).slice(0, 6) as { label: string; value: number }[];
  const max = Math.max(1, ...rows.map((x) => x.value));
  return (
    <div className="chart-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-ink-900">Doanh thu theo tuyến</h2>
          <p className="text-sm text-ink-500">Tuyến nào đang tạo tiền tốt nhất.</p>
        </div>
        <Route className="text-brand-700" size={22} />
      </div>
      <div className="mt-5 space-y-4">
        {(rows.length ? rows : [{ label: "Chưa có dữ liệu", value: 0 }]).map((x) => (
          <div key={x.label}>
            <div className="mb-1 flex justify-between gap-3 text-xs font-bold text-ink-700"><span className="truncate">{x.label}</span><span>{formatMoney(x.value)}</span></div>
            <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-brand-600" style={{ width: `${Math.max(4, (x.value / max) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DriverDebtChart({ trips }: { trips: any[] }) {
  const rows = Object.values((trips || []).reduce((acc: Record<string, any>, t: any) => {
    const key = t.driver?.name || "Chưa gán tài xế";
    acc[key] ||= { label: key, value: 0 };
    acc[key].value += toNumber(t.driverDebtAmount);
    return acc;
  }, {})).sort((a: any, b: any) => b.value - a.value).slice(0, 6) as { label: string; value: number }[];
  const max = Math.max(1, ...rows.map((x) => x.value));
  return (
    <div className="chart-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-ink-900">Công nợ tài xế</h2>
          <p className="text-sm text-ink-500">Ưu tiên đối soát các khoản lớn.</p>
        </div>
        <AlertTriangle className="text-red-600" size={22} />
      </div>
      <div className="mt-5 space-y-4">
        {(rows.length ? rows : [{ label: "Chưa có công nợ", value: 0 }]).map((x) => (
          <div key={x.label}>
            <div className="mb-1 flex justify-between gap-3 text-xs font-bold text-ink-700"><span className="truncate">{x.label}</span><span>{formatMoney(x.value)}</span></div>
            <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-orange-500" style={{ width: `${Math.max(4, (x.value / max) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OccupancyChart({ trips }: { trips: any[] }) {
  const rows = (trips || []).slice(0, 6).map((t: any) => ({
    label: `${t.code || "CX"} • ${t.route?.name || "Chưa rõ tuyến"}`,
    booked: toNumber(t.bookedSeats),
    total: Math.max(1, toNumber(t.totalSeats)),
  }));
  return (
    <div className="chart-card lg:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-ink-900">Tỷ lệ lấp ghế chuyến gần nhất</h2>
          <p className="text-sm text-ink-500">Hỗ trợ quyết định ghép thêm khách hay khóa chuyến.</p>
        </div>
        <Users className="text-blue-600" size={22} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {(rows.length ? rows : [{ label: "Chưa có chuyến", booked: 0, total: 1 }]).map((x) => {
          const pct = Math.min(100, Math.round((x.booked / x.total) * 100));
          return (
            <div key={x.label} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex justify-between gap-3 text-sm"><b className="truncate text-ink-800">{x.label}</b><span className="font-bold text-brand-700">{x.booked}/{x.total}</span></div>
              <div className="mt-3 h-3 rounded-full bg-white"><div className="h-3 rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
              <p className="mt-2 text-xs font-semibold text-ink-500">{pct}% đã lấp ghế</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const dashboardIcons = { Banknote, Car, CheckCircle2, AlertTriangle, Users, Clock };
