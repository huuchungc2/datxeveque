import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  MapPinned,
  Package,
  Phone,
  Route,
  Users,
  Wallet,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, formatMoney } from "../lib/api";
import { formatDisplayDateTime } from "../lib/datetime";
import { bookingPaymentStatus, driverCargoStatus, driverRideStatus, settlementStatus, tripStatus } from "../lib/vi";
import { EmptyState, PageIntro } from "../components/ui/DesignKit";
import { StatCard } from "../components/ui/AdminCharts";

function maskPhone(phone?: string | null) {
  if (!phone) return "—";
  const p = String(phone).trim();
  if (p.length <= 4) return p.replace(/\d/g, "*");
  return `${p.slice(0, 2)}${"*".repeat(Math.max(0, p.length - 4))}${p.slice(-2)}`;
}

type TripBucket = "pending" | "active" | "done";

function groupTrips(items: any[]) {
  const pending = items.filter((t) => t.status === "COLLECTING");
  const active = items.filter((t) => !["COLLECTING", "COMPLETED", "CANCELLED"].includes(t.status));
  const done = items.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED");
  return { pending, active, done };
}

const RIDE_FLOW = [
  { status: "", label: "Chờ đón" },
  { status: "PICKING_UP", label: "Đang đón" },
  { status: "PICKED_UP", label: "Đã đón" },
  { status: "DROPPING_OFF", label: "Đang trả" },
  { status: "DROPPED_OFF", label: "Đã trả" },
];

const CARGO_FLOW = [
  { status: "", label: "Chờ lấy" },
  { status: "PICKING_UP", label: "Đang lấy" },
  { status: "PICKED_UP", label: "Đã lấy" },
  { status: "DELIVERING", label: "Đang giao" },
  { status: "DELIVERED", label: "Đã giao" },
];

function flowIndex(flow: { status: string; label: string }[], current?: string | null) {
  const s = current || "";
  const idx = flow.findIndex((f) => f.status === s);
  return idx >= 0 ? idx : 0;
}

function StepFlowBar({ flow, current }: { flow: typeof RIDE_FLOW; current?: string | null }) {
  const idx = flowIndex(flow, current);
  return (
    <div className="mt-3 flex flex-wrap gap-1">
      {flow.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <span
            key={step.status + step.label}
            className={`rounded-lg px-2 py-1 text-xs font-semibold ${
              done ? "bg-green-100 text-green-800" : active ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {step.label}
          </span>
        );
      })}
    </div>
  );
}

function nextRideStep(status?: string | null): { label: string; status: string } | null {
  const s = status || "";
  if (!s) return { label: "Bắt đầu đón", status: "PICKING_UP" };
  if (s === "PICKING_UP") return { label: "Xác nhận đã đón", status: "PICKED_UP" };
  if (s === "PICKED_UP") return { label: "Bắt đầu trả khách", status: "DROPPING_OFF" };
  if (s === "DROPPING_OFF") return { label: "Xác nhận đã trả", status: "DROPPED_OFF" };
  return null;
}

function nextCargoStep(status?: string | null): { label: string; status: string } | null {
  const s = status || "";
  if (!s) return { label: "Đi lấy hàng", status: "PICKING_UP" };
  if (s === "PICKING_UP") return { label: "Đã lấy hàng", status: "PICKED_UP" };
  if (s === "PICKED_UP") return { label: "Đang giao", status: "DELIVERING" };
  if (s === "DELIVERING") return { label: "Đã giao xong", status: "DELIVERED" };
  return null;
}

function isRideDone(status?: string | null) {
  return ["DROPPED_OFF", "CUSTOMER_CANCELLED", "CANCELLED_BY_ADMIN", "WAITING_REDISPATCH", "WAITING_ADMIN_REVIEW"].includes(
    status || "",
  );
}

function isCargoDone(status?: string | null) {
  return ["DELIVERED", "PARCEL_CANCELLED", "FAILED_PICKUP", "FAILED_DELIVERY", "WAITING_ADMIN_REVIEW"].includes(
    status || "",
  );
}

function DriverMeStrip({ linkToSettings = true }: { linkToSettings?: boolean }) {
  const [me, setMe] = useState<any>();

  useEffect(() => {
    api.get("/driver/me").then((r) => setMe(r.data));
  }, []);

  if (!me) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trạng thái của bạn (cho điều phối)</p>
          <p className="mt-1 text-lg font-extrabold text-brand-900">{me.status || "—"}</p>
          <p className="mt-1 text-sm text-slate-600">
            <MapPinned size={14} className="mr-1 inline" />
            {me.location || "Chưa báo vị trí"}
            {me.direction ? ` • ${me.direction}` : ""}
          </p>
          <p className="mt-1 text-sm text-slate-600">Xe còn <b>{me.seatsFree ?? "—"}</b> ghế trống (báo chung, không phải ghế trong từng chuyến)</p>
        </div>
        {linkToSettings && (
          <Link className="btn-secondary py-2 text-sm" to="/tai-xe/san-sang">
            Cập nhật
          </Link>
        )}
      </div>
    </div>
  );
}

function ActionAlert({
  tone,
  title,
  children,
}: {
  tone: "cta" | "brand" | "green";
  title: string;
  children: ReactNode;
}) {
  const bg =
    tone === "cta" ? "border-cta-200 bg-cta-50" : tone === "green" ? "border-green-200 bg-green-50" : "border-brand-200 bg-brand-50";
  const titleColor = tone === "cta" ? "text-cta-900" : tone === "green" ? "text-green-900" : "text-brand-900";
  return (
    <div className={`rounded-2xl border p-4 ${bg}`}>
      <p className={`font-bold ${titleColor}`}>{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function TripListCard({
  trip: t,
  bucket,
  onAccept,
  onReject,
}: {
  trip: any;
  bucket: TripBucket;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const border =
    bucket === "pending" ? "border-l-4 border-l-cta-500" : bucket === "active" ? "border-l-4 border-l-brand-600" : "border-l-4 border-l-slate-300";

  return (
    <div className={`card card-hover ${border}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-extrabold text-brand-900">{t.code}</h3>
            <span className="badge badge-info">{tripStatus(t.status)}</span>
          </div>
          <p className="mt-1 font-semibold text-slate-800">{t.route?.name || "Chưa rõ tuyến"}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <CalendarClock size={16} />
            {formatDisplayDateTime(t.departureAt)}
          </p>
        </div>
        <div className="text-right text-sm">
          <p>
            <Users size={14} className="mr-1 inline" />
            {t.passengersCount ?? 0} khách
          </p>
          <p>
            <Package size={14} className="mr-1 inline" />
            {t.parcelsCount ?? 0} hàng
          </p>
          <p className="mt-1 font-semibold">Còn {t.availableSeats} ghế</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Cần thu: <b className="text-green-800">{formatMoney(t.totalNeedCollect)}</b>
        {Number(t.debtAmount) > 0 && (
          <>
            {" "}
            · Nộp VP: <b className="text-cta-700">{formatMoney(t.debtAmount)}</b>
          </>
        )}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {bucket === "pending" && (
          <>
            <button type="button" className="btn-primary py-2" onClick={() => onAccept(t.id)}>
              Nhận chuyến
            </button>
            <button type="button" className="btn-ghost py-2" onClick={() => onReject(t.id)}>
              Từ chối
            </button>
          </>
        )}
        <Link className="btn-secondary py-2" to={`/tai-xe/chuyen/${t.id}`}>
          {bucket === "pending" ? "Xem chi tiết" : "Mở chuyến"}
          <ChevronRight size={16} className="ml-1 inline" />
        </Link>
      </div>
    </div>
  );
}

export function DriverDashboard() {
  const [d, setD] = useState<any>();
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    api.get("/driver/dashboard").then((r) => setD(r.data));
    api.get("/driver/trips").then((r) => setTrips(r.data || []));
  }, []);

  const { pending, active } = useMemo(() => groupTrips(trips), [trips]);
  const focusTrip = pending[0] || active[0];

  return (
    <div className="space-y-6">
      <PageIntro title="Việc cần làm" subtitle="Ưu tiên: nhận chuyến mới → mở chuyến đang chạy → gom khách, thu tiền, hoàn thành." />

      <DriverMeStrip />

      {pending.length > 0 && (
        <ActionAlert tone="cta" title={`${pending.length} chuyến chờ bạn nhận`}>
          <p className="text-sm text-slate-700">Admin đã gán. Bấm «Nhận chuyến» hoặc «Từ chối» (có lý do).</p>
          <Link className="btn-primary mt-3 inline-flex py-2" to="/tai-xe/chuyen">
            Xem danh sách chờ nhận
          </Link>
        </ActionAlert>
      )}

      {active.length > 0 && !pending.length && (
        <ActionAlert tone="brand" title={`${active.length} chuyến đang chạy`}>
          <p className="text-sm text-slate-700">Vào từng chuyến: cập nhật đón/trả từng khách, thu tiền, rồi hoàn thành chuyến.</p>
          {focusTrip && (
            <Link className="btn-primary mt-3 inline-flex py-2" to={`/tai-xe/chuyen/${focusTrip.id}`}>
              Tiếp tục {focusTrip.code}
            </Link>
          )}
        </ActionAlert>
      )}

      {focusTrip && (pending.length > 0 || active.length > 0) && (
        <Link
          to={`/tai-xe/chuyen/${focusTrip.id}`}
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-brand-200 bg-white p-4 shadow-sm transition hover:border-brand-400"
        >
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Chuyến ưu tiên</p>
            <p className="text-xl font-extrabold text-brand-900">{focusTrip.code}</p>
            <p className="text-sm text-slate-600">{focusTrip.route?.name}</p>
          </div>
          <ChevronRight className="shrink-0 text-brand-700" size={28} />
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/tai-xe/chuyen" className="card card-hover flex items-center gap-3 p-4">
          <Route className="text-brand-700" size={24} />
          <span className="font-bold">Tất cả chuyến</span>
        </Link>
        <Link to="/tai-xe/thong-bao" className="card card-hover flex items-center gap-3 p-4">
          <Bell className="text-cta-600" size={24} />
          <span className="font-bold">
            Thông báo
            {(d?.pendingNotificationsCount || 0) > 0 && (
              <span className="ml-2 badge badge-warning">{d.pendingNotificationsCount}</span>
            )}
          </span>
        </Link>
        <Link to="/tai-xe/cong-no" className="card card-hover flex items-center gap-3 p-4">
          <Wallet className="text-green-700" size={24} />
          <span className="font-bold">Công nợ</span>
        </Link>
        <Link to="/tai-xe/san-sang" className="card card-hover flex items-center gap-3 p-4">
          <CircleDot className="text-slate-600" size={24} />
          <span className="font-bold">Báo rảnh / bận</span>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Chuyến hôm nay" value={d?.todayTripsCount || 0} tone="brand" icon={<CalendarClock size={20} />} />
        <StatCard label="Đang chạy" value={d?.activeTripsCount || 0} tone="blue" icon={<Users size={20} />} />
        <StatCard label="Cần thu hôm nay" value={formatMoney(d?.totalNeedCollect || 0)} tone="green" icon={<Wallet size={20} />} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Đã thu" value={formatMoney(d?.totalCollected || 0)} tone="brand" icon={<CheckCircle2 size={20} />} />
        <StatCard label="Công nợ dự kiến" value={formatMoney(d?.debtAmount || 0)} tone="red" icon={<AlertTriangle size={20} />} />
      </div>
    </div>
  );
}

const TRIP_TABS: { id: TripBucket; label: string; hint: string }[] = [
  { id: "pending", label: "Chờ nhận", hint: "Admin gán — bạn cần nhận hoặc từ chối." },
  { id: "active", label: "Đang làm", hint: "Gom khách, thu tiền, hoàn thành chuyến." },
  { id: "done", label: "Đã xong", hint: "Chỉ xem lại." },
];

export function DriverJobs() {
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<TripBucket>("pending");

  const load = () => api.get("/driver/trips").then((r) => setItems(r.data || []));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const { pending, active } = groupTrips(items);
    if (tab === "pending" && !pending.length && active.length) setTab("active");
    if (tab === "active" && !active.length && pending.length) setTab("pending");
  }, [items, tab]);

  const accept = async (id: number) => {
    await api.post(`/driver/trips/${id}/accept`);
    setMsg("Đã nhận chuyến. Mở «Đang làm» để gom khách.");
    load();
    setTab("active");
  };
  const reject = async (id: number) => {
    const reason = prompt("Lý do từ chối (tuỳ chọn):") || "";
    await api.post(`/driver/trips/${id}/reject`, { reason });
    setMsg("Đã từ chối. Admin sẽ gán lại.");
    load();
  };

  const grouped = useMemo(() => groupTrips(items), [items]);
  const currentTab = TRIP_TABS.find((t) => t.id === tab)!;
  const list = grouped[tab];

  return (
    <div className="space-y-6">
      <PageIntro title="Chuyến của tôi" subtitle="Mỗi chuyến: nhận → mở chi tiết → xử lý từng khách/hàng → hoàn thành." />

      {msg && <div className="rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-800">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        {TRIP_TABS.map((t) => {
          const count = grouped[t.id].length;
          return (
            <button
              key={t.id}
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === t.id ? "bg-brand-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {count > 0 && <span className="ml-2 opacity-90">({count})</span>}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-slate-600">{currentTab.hint}</p>

      <div className="space-y-3">
        {list.map((t) => (
          <TripListCard key={t.id} trip={t} bucket={tab} onAccept={accept} onReject={reject} />
        ))}
        {!list.length && (
          <EmptyState
            title={`Không có chuyến — ${currentTab.label.toLowerCase()}`}
            subtitle={
              tab === "pending"
                ? "Khi admin gán chuyến, mục «Chờ nhận» sẽ có đơn. Nhớ báo rảnh tại «Báo rảnh / bận»."
                : "Danh sách trống ở tab này."
            }
            action={
              tab === "pending" ? (
                <Link className="btn-secondary py-2" to="/tai-xe/san-sang">
                  Báo trạng thái rảnh
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

export function DriverAvailability() {
  const [form, setForm] = useState({ status: "Rảnh", location: "", direction: "", seatsFree: 4 });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/driver/me")
      .then((r) => {
        const d = r.data;
        if (d) {
          setForm({
            status: d.status || "Rảnh",
            location: d.location || "",
            direction: d.direction || "",
            seatsFree: Number(d.seatsFree ?? 4),
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    await api.patch("/driver/availability", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageIntro
        title="Báo rảnh / bận"
        subtitle="Thông tin này giúp admin gán chuyến mới. Khác hoàn toàn với «ghế trống» trong từng chuyến đang chạy."
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <b>Hai loại «ghế» — đừng nhầm:</b>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <b>Ở đây:</b> bạn đang ở đâu, rảnh hay bận, xe còn bao nhiêu ghế — cho điều phối gán chuyến mới.
          </li>
          <li>
            <b>Trong chuyến:</b> số ghế còn nhận thêm khách vào chuyến đang gom — sửa trong chi tiết chuyến.
          </li>
        </ul>
      </div>

      {loading ? (
        <div className="card text-sm text-slate-600">Đang tải...</div>
      ) : (
        <div className="panel grid gap-4 md:grid-cols-2">
          <label className="font-bold md:col-span-2">
            Bạn đang
            <select
              className="input mt-2"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Rảnh</option>
              <option>Bận</option>
              <option>Đang chạy chuyến</option>
              <option>Nghỉ hôm nay</option>
            </select>
          </label>
          <label className="font-bold">
            Đang ở đâu
            <input
              className="input mt-2"
              placeholder="VD: Sài Gòn, Đức Linh..."
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label className="font-bold">
            Muốn nhận chiều
            <input
              className="input mt-2"
              placeholder="VD: Sài Gòn → Đức Linh"
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
            />
          </label>
          <label className="font-bold md:col-span-2">
            Ghế trống trên xe (báo cho điều phối)
            <input
              className="input mt-2"
              type="number"
              min={0}
              value={form.seatsFree}
              onChange={(e) => setForm({ ...form, seatsFree: Number(e.target.value) })}
            />
          </label>
          <button type="button" className="btn-primary md:col-span-2" onClick={save}>
            Lưu
          </button>
          {saved && <p className="md:col-span-2 text-sm font-semibold text-green-700">Đã lưu — admin thấy trên màn điều phối.</p>}
        </div>
      )}
    </div>
  );
}

export function DriverDebts() {
  const [r, setR] = useState<any>();
  useEffect(() => {
    api.get("/driver/reports").then((x) => setR(x.data));
  }, []);
  return (
    <div className="space-y-6">
      <PageIntro title="Công nợ" subtitle="Tiền cần nộp văn phòng và tiền văn phòng còn trả bạn — sau khi hoàn thành chuyến." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tổng chuyến" value={r?.totalTrips || 0} tone="brand" icon={<CalendarClock size={20} />} />
        <StatCard label="Còn phải nộp VP" value={formatMoney(r?.totalDebt)} tone="red" icon={<AlertTriangle size={20} />} />
        <StatCard label="VP còn trả tôi" value={formatMoney(r?.totalAdminOwes)} tone="green" icon={<CheckCircle2 size={20} />} />
      </div>
      <div className="grid gap-3">
        {r?.trips?.map((t: any) => (
          <div className="card" key={t.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <b>
                {t.code} — {t.route?.name}
              </b>
              <span className="badge badge-info">{settlementStatus(t.settlementStatus)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Còn nợ VP: <b>{formatMoney(t.driverDebtRemaining)}</b> • VP trả bạn:{" "}
              <b>{formatMoney(t.adminOwesRemaining)}</b>
            </p>
          </div>
        ))}
        {!r?.trips?.length && (
          <EmptyState title="Chưa có công nợ" subtitle="Hoàn thành chuyến xong số liệu mới hiện ở đây." />
        )}
      </div>
    </div>
  );
}

export function DriverNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const nav = useNavigate();

  const load = () => api.get("/driver/notifications", { params: { limit: 50 } }).then((r) => setItems(r.data || []));
  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: number) => {
    await api.post(`/driver/notifications/${id}/read`);
    load();
  };

  const go = async (n: any) => {
    if (!n?.id) return;
    if (!n.readAt) await markRead(n.id);
    if (n.link) return nav(String(n.link));
    if (n.entityType === "TRIP" && n.entityId) return nav(`/tai-xe/chuyen/${n.entityId}`);
  };

  return (
    <div className="space-y-6">
      <PageIntro title="Thông báo" subtitle="Admin gán chuyến hoặc thêm khách — bấm để mở chuyến xử lý." />
      <div className="grid gap-3">
        {items.map((n) => (
          <div key={n.id} className={`card card-hover ${n.readAt ? "opacity-90" : "ring-2 ring-cta-300"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <b className="block truncate">{n.title || "Thông báo"}</b>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{n.body || ""}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDisplayDateTime(n.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(n.link || (n.entityType === "TRIP" && n.entityId)) && (
                  <button type="button" className="btn-primary py-2" onClick={() => go(n)}>
                    Mở chuyến
                  </button>
                )}
                {!n.readAt && (
                  <button type="button" className="btn-ghost py-2" onClick={() => markRead(n.id)}>
                    Đã đọc
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!items.length && (
          <EmptyState title="Chưa có thông báo" subtitle="Thông báo gán chuyến sẽ hiện khi admin điều phối." />
        )}
      </div>
    </div>
  );
}

function PassengerCard({
  p,
  readOnly,
  onNext,
  onIncident,
  onCollect,
}: {
  p: any;
  readOnly?: boolean;
  onNext: (status: string) => void;
  onIncident: (status: string) => void;
  onCollect: (method: "CASH_COLLECTED" | "TRANSFERRED") => void;
}) {
  const next = nextRideStep(p.status);
  const done = isRideDone(p.status);
  const unpaid = p.paymentStatus === "UNPAID";
  const needsAdmin = ["WAITING_ADMIN_REVIEW", "UNREACHABLE", "NO_SHOW"].includes(p.status || "");

  return (
    <div className={`rounded-2xl border bg-white p-4 ${needsAdmin ? "border-amber-300 bg-amber-50/50" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <b className="text-base">{p.customerName}</b>
          <p className="text-xs text-slate-500">{p.code}</p>
          {p.passengerCount > 0 && <p className="mt-1 text-sm text-slate-600">{p.passengerCount} ghế</p>}
          <p className="mt-2 text-sm">
            <span className="font-semibold text-slate-700">Đón:</span> {p.pickupAddress || "—"}
          </p>
          {p.dropoffAddress && (
            <p className="text-sm">
              <span className="font-semibold text-slate-700">Trả:</span> {p.dropoffAddress}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="badge badge-info">{driverRideStatus(p.status)}</span>
          <p className="mt-2 text-lg font-extrabold text-cta-600">{formatMoney(p.amount || 0)}</p>
          <p className="text-xs text-slate-500">{bookingPaymentStatus(p.paymentStatus)}</p>
        </div>
      </div>

      {!done && <StepFlowBar flow={RIDE_FLOW} current={p.status} />}

      {needsAdmin && (
        <p className="mt-2 text-xs font-semibold text-amber-800">Đang chờ admin xử lý — không cần bấm thêm bước đón/trả.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <a className="btn-secondary py-2" href={`tel:${p.customerPhone}`}>
          <Phone size={16} className="mr-1 inline" />
          Gọi {maskPhone(p.customerPhone)}
        </a>
        {!readOnly && !done && next && (
          <button type="button" className="btn-primary py-2" onClick={() => onNext(next.status)}>
            {next.label}
          </button>
        )}
        {done && <span className="badge badge-success self-center py-2">Xong</span>}
      </div>

      {unpaid && !done && !readOnly && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-bold text-green-900">Thu {formatMoney(p.amount)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-primary py-2 text-sm" onClick={() => onCollect("CASH_COLLECTED")}>
              Tiền mặt
            </button>
            <button type="button" className="btn-secondary py-2 text-sm" onClick={() => onCollect("TRANSFERRED")}>
              Chuyển khoản
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Sai số tiền → liên hệ admin, không sửa ở đây.</p>
        </div>
      )}

      {!done && !readOnly && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Báo admin (không tự hủy đơn)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => onIncident("UNREACHABLE")}>
              Không nghe máy
            </button>
            <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => onIncident("NO_SHOW")}>
              Khách không đến
            </button>
            <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => onIncident("CUSTOMER_CANCELLED")}>
              Khách hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ParcelCard({
  p,
  readOnly,
  onNext,
  onIncident,
  onCollect,
}: {
  p: any;
  readOnly?: boolean;
  onNext: (status: string) => void;
  onIncident: (status: string) => void;
  onCollect: (method: "CASH_COLLECTED" | "TRANSFERRED") => void;
}) {
  const next = nextCargoStep(p.status);
  const done = isCargoDone(p.status);
  const unpaid = p.paymentStatus === "UNPAID";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <b className="text-base">Gửi hàng — {p.code}</b>
          {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
          <p className="mt-2 text-sm">
            <span className="font-semibold">Lấy:</span> {p.pickupAddress || "—"}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Giao:</span> {p.dropoffAddress || "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Hàng không trừ ghế chuyến</p>
        </div>
        <div className="text-right">
          <span className="badge badge-info">{driverCargoStatus(p.status)}</span>
          <p className="mt-2 text-lg font-extrabold text-cta-600">{formatMoney(p.amount || 0)}</p>
          <p className="text-xs text-slate-500">{bookingPaymentStatus(p.paymentStatus)}</p>
        </div>
      </div>

      {!done && <StepFlowBar flow={CARGO_FLOW} current={p.status} />}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <a className="btn-secondary py-2" href={`tel:${p.senderPhone}`}>
          <Phone size={16} className="mr-1 inline" />
          Gửi {maskPhone(p.senderPhone)}
        </a>
        <a className="btn-secondary py-2" href={`tel:${p.receiverPhone}`}>
          Nhận {maskPhone(p.receiverPhone)}
        </a>
        {!readOnly && !done && next && (
          <button type="button" className="btn-primary py-2" onClick={() => onNext(next.status)}>
            {next.label}
          </button>
        )}
        {done && <span className="badge badge-success self-center py-2">Xong</span>}
      </div>

      {unpaid && !done && !readOnly && (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-bold text-green-900">Thu tiền hàng</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-primary py-2 text-sm" onClick={() => onCollect("CASH_COLLECTED")}>
              Tiền mặt
            </button>
            <button type="button" className="btn-secondary py-2 text-sm" onClick={() => onCollect("TRANSFERRED")}>
              Chuyển khoản
            </button>
          </div>
        </div>
      )}

      {!done && !readOnly && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Báo admin</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => onIncident("FAILED_PICKUP")}>
              Không lấy được
            </button>
            <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => onIncident("FAILED_DELIVERY")}>
              Không giao được
            </button>
            <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => onIncident("PARCEL_CANCELLED")}>
              Hủy hàng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type DetailTab = "passengers" | "parcels" | "finish";

export function DriverTripDetail() {
  const { tripId } = useParams();
  const [d, setD] = useState<any>();
  const [seatInput, setSeatInput] = useState<number | "">("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<DetailTab>("passengers");
  const id = Number(tripId);

  const load = () =>
    api.get(`/driver/trips/${id}`).then((r) => {
      setD(r.data);
      if (r.data?.trip) setSeatInput(Number(r.data.trip.availableSeats ?? 0));
    });

  useEffect(() => {
    if (Number.isFinite(id)) load();
  }, [id]);

  const collect = async (bookingId: number, method: "CASH_COLLECTED" | "TRANSFERRED") => {
    await api.post(`/driver/bookings/${bookingId}/collect-payment`, { method });
    setMsg("Đã ghi nhận thu tiền.");
    load();
  };
  const setRideStatus = async (bookingId: number, status: string) => {
    await api.post(`/driver/trips/${id}/bookings/${bookingId}/status`, { status });
    load();
  };
  const setCargoStatus = async (bookingId: number, status: string) => {
    await api.post(`/driver/trips/${id}/parcels/${bookingId}/status`, { status });
    load();
  };

  const acceptTrip = async () => {
    await api.post(`/driver/trips/${id}/accept`);
    setMsg("Đã nhận chuyến. Chuyển sang tab Khách để gom.");
    load();
  };
  const rejectTrip = async () => {
    const reason = prompt("Lý do từ chối (tuỳ chọn):") || "";
    await api.post(`/driver/trips/${id}/reject`, { reason });
    setMsg("Đã từ chối chuyến.");
    load();
  };

  const saveSeats = async () => {
    if (seatInput === "") return;
    await api.post(`/driver/trips/${id}/available-seats`, { availableSeats: seatInput });
    setMsg("Đã cập nhật ghế trống trong chuyến.");
    load();
  };

  const completeTrip = async () => {
    try {
      await api.post(`/driver/trips/${id}/complete`);
      setMsg("Đã hoàn thành chuyến. Cập nhật «Báo rảnh / bận» nếu sẵn sàng nhận chiều mới.");
      load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Chưa hoàn thành được — xem danh sách bên dưới.");
      load();
    }
  };

  if (!d?.trip) {
    return (
      <div className="space-y-6">
        <Link to="/tai-xe/chuyen" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
          <ArrowLeft size={16} /> Chuyến của tôi
        </Link>
        <PageIntro title="Chi tiết chuyến" subtitle="Đang tải..." />
      </div>
    );
  }

  const needsAccept = d.trip.status === "COLLECTING";
  const tripDone = d.trip.status === "COMPLETED" || d.trip.status === "CANCELLED";
  const passengerCount = d.passengers?.length || 0;
  const parcelCount = d.parcels?.length || 0;

  const detailTabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: "passengers", label: "Khách xe", count: passengerCount },
    { id: "parcels", label: "Gửi hàng", count: parcelCount },
    { id: "finish", label: "Ghế & hoàn thành" },
  ];

  let phaseLabel = "Đang chạy";
  let phaseHint = "Cập nhật từng khách/hàng, thu tiền, rồi hoàn thành.";
  if (needsAccept) {
    phaseLabel = "Chờ bạn nhận";
    phaseHint = "Nhận hoặc từ chối trước khi gom khách.";
  } else if (tripDone) {
    phaseLabel = "Đã kết thúc";
    phaseHint = "Chỉ xem lại.";
  }

  return (
    <div className="space-y-6 pb-24">
      <Link to="/tai-xe/chuyen" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
        <ArrowLeft size={16} /> Chuyến của tôi
      </Link>

      <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{phaseLabel}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-brand-900">{d.trip.code}</h1>
        <p className="mt-1 font-semibold text-slate-800">{d.trip.route?.name || "—"}</p>
        <p className="mt-2 text-sm text-slate-600">
          {formatDisplayDateTime(d.trip.departureAt)} · {tripStatus(d.trip.status)}
        </p>
        <p className="mt-2 text-sm text-slate-600">{phaseHint}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-white px-3 py-1 font-semibold ring-1 ring-slate-200">
            Cần thu: {formatMoney(d.paymentSummary?.totalNeedCollect || 0)}
          </span>
          <span className="rounded-lg bg-white px-3 py-1 font-semibold ring-1 ring-slate-200">
            Đã thu: {formatMoney(d.paymentSummary?.totalCollected || 0)}
          </span>
          <span className="rounded-lg bg-white px-3 py-1 font-semibold ring-1 ring-slate-200">
            Còn {d.trip.availableSeats} ghế trong chuyến
          </span>
        </div>
      </div>

      {msg && <div className="rounded-2xl bg-brand-50 p-3 text-sm font-semibold text-brand-900">{msg}</div>}

      {needsAccept && (
        <ActionAlert tone="cta" title="Bước 1: Nhận chuyến này?">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary py-2" onClick={acceptTrip}>
              Nhận chuyến
            </button>
            <button type="button" className="btn-ghost py-2" onClick={rejectTrip}>
              Từ chối
            </button>
          </div>
        </ActionAlert>
      )}

      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        {detailTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold sm:flex-none ${
              tab === t.id ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && ` (${t.count})`}
          </button>
        ))}
      </div>

      {tab === "passengers" && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">
            {needsAccept ? "Xem trước danh sách khách. Nhận chuyến để bắt đầu cập nhật." : "Mỗi khách: bấm nút xanh theo thứ tự đón → trả. Thu tiền khi khách trả."}
          </p>
          <div className="grid gap-3">
            {(d.passengers || []).map((p: any) => (
              <PassengerCard
                key={p.id}
                p={p}
                readOnly={needsAccept || tripDone}
                onNext={(st) => setRideStatus(p.id, st)}
                onIncident={(st) => setRideStatus(p.id, st)}
                onCollect={(m) => collect(p.id, m)}
              />
            ))}
            {!passengerCount && <p className="text-sm text-slate-500">Chưa có khách trong chuyến.</p>}
          </div>
        </section>
      )}

      {tab === "parcels" && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">
            {needsAccept ? "Xem trước đơn hàng trong chuyến." : "Lấy hàng → giao hàng. Không tính ghế."}
          </p>
          <div className="grid gap-3">
            {(d.parcels || []).map((p: any) => (
              <ParcelCard
                key={p.id}
                p={p}
                readOnly={needsAccept || tripDone}
                onNext={(st) => setCargoStatus(p.id, st)}
                onIncident={(st) => setCargoStatus(p.id, st)}
                onCollect={(m) => collect(p.id, m)}
              />
            ))}
            {!parcelCount && <p className="text-sm text-slate-500">Chưa có đơn gửi hàng.</p>}
          </div>
        </section>
      )}

      {(tab === "finish" && !needsAccept) && (
        <section className="space-y-4">
          {!tripDone && (
            <div className="card">
              <b className="block">Ghế trống trong chuyến này</b>
              <p className="mt-1 text-sm text-slate-600">Admin gán thêm khách theo số ghế còn. Khác với «Báo rảnh / bận».</p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="font-bold text-sm">
                  Còn
                  <input
                    className="input mt-1 w-24"
                    type="number"
                    min={0}
                    value={seatInput}
                    onChange={(e) => setSeatInput(e.target.value === "" ? "" : Number(e.target.value))}
                  />{" "}
                  ghế
                </label>
                <button type="button" className="btn-secondary py-2" onClick={saveSeats}>
                  Lưu ghế
                </button>
              </div>
            </div>
          )}

          <div className="card border-2 border-brand-200">
            <h2 className="text-lg font-extrabold text-brand-900">Hoàn thành chuyến</h2>
            <p className="mt-2 text-sm text-slate-600">
              {d.completion?.canComplete
                ? "Mọi khách/hàng đã xong. Bấm hoàn thành để chốt chuyến."
                : d.completion?.message || "Còn khách hoặc hàng chưa xử lý xong."}
            </p>
            {!d.completion?.canComplete && d.completion?.passengerBlockers?.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                {d.completion.passengerBlockers.slice(0, 8).map((b: any) => (
                  <li key={b.bookingId}>
                    {b.code}: {driverRideStatus(b.status)}
                  </li>
                ))}
              </ul>
            )}
            {!d.completion?.canComplete && d.completion?.cargoBlockers?.length > 0 && (
              <ul className="mt-2 space-y-1 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                {d.completion.cargoBlockers.slice(0, 8).map((b: any) => (
                  <li key={b.bookingId}>
                    {b.code}: {driverCargoStatus(b.status)}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary py-2 disabled:opacity-50"
                onClick={completeTrip}
                disabled={!d.completion?.canComplete || tripDone}
              >
                Hoàn thành chuyến
              </button>
              <button type="button" className="btn-ghost py-2" onClick={load}>
                Tải lại
              </button>
            </div>
          </div>
        </section>
      )}

      {!needsAccept && !tripDone && d.completion?.canComplete && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-brand-200 bg-white/95 p-4 shadow-lg backdrop-blur md:left-60">
          <button type="button" className="btn-primary w-full py-3" onClick={completeTrip}>
            Hoàn thành chuyến
          </button>
        </div>
      )}
    </div>
  );
}
