import { useEffect, useState } from "react";
import { api, formatMoney } from "../lib/api";
import { fmtDepartureTime, formatDisplayDate } from "../lib/datetime";
import { SERVICE_TYPE_OPTIONS } from "../lib/serviceTypes";
import { useSiteSettings } from "../lib/useSiteSettings";
import { DriverDebtChart, OccupancyChart, PageTitle, RevenueTrendChart, RouteRevenueChart, StatCard, StatusDonutChart, dashboardIcons } from "../components/ui/AdminCharts";
import { GregorianDateInput } from "../components/ui/GregorianDateInputs";
import { bookingStatus, settingKey } from "../lib/vi";

export function AdminDashboard() {
  const [dash, setDash] = useState<any>();
  const [charts, setCharts] = useState<any>();
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    Promise.all([api.get("/admin/dashboard"), api.get("/admin/reports/overview")])
      .then(([d, r]) => {
        setDash(d.data);
        setCharts(r.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  const ops = dash?.operations || {};
  const money = dash?.money || {};
  const trips = charts?.trips || [];
  const today = formatDisplayDate(new Date());
  return (
    <div className="space-y-6">
      <PageTitle
        title="Tổng quan vận hành"
        subtitle={`Tình hình hôm nay ${today} — đơn chờ, chuyến đang gom, tài xế và tiền thu.`}
      />

      {loading && <div className="card text-sm font-semibold text-ink-500">Đang tải dữ liệu vận hành...</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Đơn mới chờ xác nhận" value={ops.newAwaitingConfirm ?? 0} tone="orange" icon={<dashboardIcons.Clock size={20} />} />
        <StatCard label="Chờ điều phối" value={ops.waitingDispatch ?? 0} tone="blue" icon={<dashboardIcons.Car size={20} />} />
        <StatCard label="Chuyến đang gom" value={ops.collectingTrips ?? 0} tone="brand" icon={<dashboardIcons.Car size={20} />} />
        <StatCard label="Chuyến đang chạy" value={ops.inProgressTrips ?? 0} tone="green" icon={<dashboardIcons.Users size={20} />} />
        <StatCard label="Hoàn thành hôm nay" value={ops.completedTodayTrips ?? 0} tone="green" icon={<dashboardIcons.CheckCircle2 size={20} />} />
        <StatCard label="Tài xế rảnh" value={ops.driversAvailable ?? 0} tone="blue" icon={<dashboardIcons.Users size={20} />} />
        <StatCard label="Cần admin xử lý" value={ops.adminReviewBookings ?? 0} tone="red" icon={<dashboardIcons.AlertTriangle size={20} />} />
        <StatCard label="Doanh thu hôm nay" value={formatMoney(money.revenueToday)} tone="brand" icon={<dashboardIcons.Banknote size={20} />} hint={`Khách ${formatMoney(money.passengerRevenue)} · Hàng ${formatMoney(money.cargoRevenue)}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <RevenueTrendChart trips={trips} />
        <StatusDonutChart trips={trips} />
        <RouteRevenueChart trips={trips} />
        <DriverDebtChart trips={trips} />
        <OccupancyChart trips={trips} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-ink-900">Việc cần xử lý</h2>
            <a href="/admin/don-hang" className="text-sm font-bold text-brand-700">
              Xem đơn →
            </a>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {(dash?.todo?.recentBookings || []).map((b: any) => (
              <a
                key={b.id}
                href={`/admin/don-hang/${b.id}`}
                className="flex items-center justify-between gap-4 py-3 transition hover:bg-brand-50/50 -mx-2 px-2 rounded-xl"
              >
                <div className="min-w-0">
                  <b className="block truncate text-sm text-ink-900">
                    {b.code} • {b.customerName}
                  </b>
                  <p className="text-xs text-ink-500">
                    {bookingStatus(b.status)} • {b.route?.name || "Chưa rõ tuyến"}
                  </p>
                </div>
                <div className="text-right text-sm font-extrabold text-brand-700">{formatMoney(b.finalTotal)}</div>
              </a>
            ))}
            {!dash?.todo?.recentBookings?.length && <p className="py-5 text-sm text-ink-500">Không có đơn chờ nổi bật.</p>}
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-extrabold text-ink-900">Hành động nhanh</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn-primary py-2" href="/admin/don-hang/moi">
              Tạo đơn mới
            </a>
            <a className="btn-secondary py-2" href="/admin/dispatch">
              Điều phối
            </a>
            <a className="btn-secondary py-2" href="/admin/dieu-phoi">
              Chuyến xe
            </a>
            <a className="btn-secondary py-2" href="/admin/tai-xe">
              Tài xế
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Đã thu hôm nay: <b>{formatMoney(money.collected)}</b> · Chưa thu: <b>{formatMoney(money.unpaid)}</b>
          </p>
        </div>
        <div className="card">
          <h2 className="text-lg font-extrabold text-ink-900">Thông báo gần đây</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {(dash?.todo?.recentNotifications || []).map((n: any) => (
              <div key={n.id} className="py-3">
                <b className="block text-sm text-ink-900">{n.title}</b>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.body}</p>
              </div>
            ))}
            {!dash?.todo?.recentNotifications?.length && (
              <p className="py-5 text-sm text-ink-500">Chưa có thông báo — xem thêm qua icon chuông trên header.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type ReportFilters = {
  from?: string;
  to?: string;
  driverId?: string;
  routeId?: string;
  serviceType?: string;
};

function reportFilterParams(f: ReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.from?.trim()) params.from = f.from.trim();
  if (f.to?.trim()) params.to = f.to.trim();
  if (f.driverId?.trim()) params.driverId = f.driverId.trim();
  if (f.routeId?.trim()) params.routeId = f.routeId.trim();
  if (f.serviceType?.trim()) params.serviceType = f.serviceType.trim();
  return params;
}

export function AdminReports() {
  const [r, setR] = useState<any>();
  const [f, setF] = useState<ReportFilters>({});
  const [routes, setRoutes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const load = async (next?: ReportFilters) => {
    const params = reportFilterParams(next ?? f);
    setLoading(true);
    setErr(null);
    try {
      const x = await api.get("/admin/reports/overview", { params });
      setR(x.data);
    } catch (e: any) {
      setErr(e?.message || "Không tải được báo cáo");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    api.get("/admin/routes").then((x) => setRoutes(Array.isArray(x.data) ? x.data : []));
    api.get("/admin/drivers").then((x) => {
      const data = x.data;
      const list = Array.isArray(data) ? data : data?.items || [];
      setDrivers(list.map((d: any) => ({ id: d.id, name: d.name || d.user?.name || `TX #${d.id}` })));
    });
  }, []);
  const trips = r?.trips || [];
  return (
    <div className="space-y-6">
      <PageTitle title="Báo cáo doanh thu & hoa hồng" subtitle="Bộ lọc báo cáo, chart doanh thu, top tuyến và công nợ tài xế theo cùng một chuẩn thiết kế." />
      <div className="card grid gap-3 md:grid-cols-6">
        <GregorianDateInput value={f.from || ""} onChange={(value) => setF({ ...f, from: value })} />
        <GregorianDateInput value={f.to || ""} onChange={(value) => setF({ ...f, to: value })} />
        <select className="input" value={f.driverId || ""} onChange={(e) => setF({ ...f, driverId: e.target.value })}>
          <option value="">Tất cả tài xế</option>
          {drivers.map((d) => (
            <option key={d.id} value={String(d.id)}>{d.name}</option>
          ))}
        </select>
        <select className="input" value={f.routeId || ""} onChange={(e) => setF({ ...f, routeId: e.target.value })}>
          <option value="">Tất cả tuyến</option>
          {routes.map((rt) => <option key={rt.id} value={String(rt.id)}>{rt.name}</option>)}
        </select>
        <select className="input" value={f.serviceType || ""} onChange={(e) => setF({ ...f, serviceType: e.target.value || undefined })}>
          <option value="">Tất cả dịch vụ</option>
          {SERVICE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button className="btn-secondary" type="button" onClick={() => load()} disabled={loading}>
          {loading ? "Đang lọc…" : "Lọc báo cáo"}
        </button>
      </div>
      {err && <div className="card text-sm font-semibold text-red-700">{err}</div>}
      {loading && !r && <div className="card text-sm font-semibold text-ink-500">Đang tải báo cáo…</div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Tổng chuyến" value={r?.totalTrips || 0} tone="blue" icon={<dashboardIcons.Car size={20} />} />
        <StatCard label="Doanh thu" value={formatMoney(r?.totalRevenue)} tone="brand" icon={<dashboardIcons.Banknote size={20} />} />
        <StatCard label="Hoa hồng" value={formatMoney(r?.totalCommission)} tone="orange" icon={<dashboardIcons.CheckCircle2 size={20} />} />
        <StatCard label="Tài xế nợ VP" value={formatMoney(r?.totalDriverDebt)} tone="red" icon={<dashboardIcons.AlertTriangle size={20} />} />
        <StatCard label="VP trả tài xế" value={formatMoney(r?.totalAdminOwesDriver)} tone="green" icon={<dashboardIcons.Users size={20} />} />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <RevenueTrendChart trips={trips} />
        <StatusDonutChart trips={trips} />
        <RouteRevenueChart trips={trips} />
        <DriverDebtChart trips={trips} />
        <OccupancyChart trips={trips} />
      </div>
    </div>
  );
}

export function AdminSettings() {
  const { reload: reloadSiteSettings } = useSiteSettings();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    api.get("/admin/settings").then((r) => setRows(r.data));
  }, []);
  const save = async () => {
    const body: Object = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    await api.put("/admin/settings", body);
    reloadSiteSettings();
    alert("Đã lưu — trang web sẽ hiển thị số/Zalo mới (footer, liên hệ, đặt xe).");
  };
  return (
    <div>
      <h1 className="section-title">Cài đặt website</h1>
      <div className="card mt-5 grid gap-4 md:grid-cols-2">
        {rows.map((r, i) => (
          <label key={r.key} className="block text-sm font-semibold">
            {settingKey(r.key)}
            <span className="ml-1 font-normal text-slate-400">({r.key})</span>
            <input className="input mt-2" value={r.value || ""} onChange={(e) => setRows(rows.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))} />
          </label>
        ))}
        <button className="btn-primary md:col-span-2" onClick={save}>Lưu cấu hình</button>
      </div>
    </div>
  );
}
