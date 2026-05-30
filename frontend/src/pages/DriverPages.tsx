import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Package,
  Phone,
  Users,
  Wallet,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, formatMoney } from "../lib/api";
import { formatDisplayDateTime } from "../lib/datetime";
import {
  bookingPaymentStatus,
  driverCargoStatus,
  driverRideStatus,
  paymentReceiver,
  settlementStatus,
  tripStatus,
} from "../lib/vi";
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
  const done = items.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED");
  const pending = items.filter((t) => t.needsDriverAck);
  /** Chuyến đã xác nhận — vẫn hiện khi admin gán thêm khách (kèm banner xác nhận) */
  const active = items.filter((t) => t.status === "READY" || t.status === "IN_PROGRESS");
  return { pending, active, done };
}

const RIDE_FLOW = [
  { status: "WAITING_PICKUP", label: "Chờ đón" },
  { status: "PICKING_UP", label: "Bắt đầu đón" },
  { status: "PICKED_UP", label: "Đã đón" },
  { status: "DROPPING_OFF", label: "Đang trả khách" },
  { status: "DROPPED_OFF", label: "Đã trả khách" },
];

const CARGO_FLOW = [
  { status: "", label: "Chờ lấy" },
  { status: "PICKING_UP", label: "Đang lấy" },
  { status: "PICKED_UP", label: "Đã lấy" },
  { status: "DELIVERING", label: "Đang giao" },
  { status: "DELIVERED", label: "Đã giao" },
];

function flowIndex(flow: { status: string; label: string }[], current?: string | null) {
  const s = current && current !== "" ? current : "WAITING_PICKUP";
  const idx = flow.findIndex((f) => f.status === s);
  return idx >= 0 ? idx : 0;
}

function RideStatusStepButtons({
  flow,
  current,
  readOnly,
  onPick,
}: {
  flow: typeof RIDE_FLOW;
  current?: string | null;
  readOnly?: boolean;
  onPick: (status: string) => void;
}) {
  const currentIdx = flowIndex(flow, current);
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {flow.map((step, i) => {
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isNext = i === currentIdx + 1;
        const canClick = !readOnly && isNext;
        return (
          <button
            key={step.status}
            type="button"
            disabled={!canClick && !isPast}
            title={isPast ? "Đã qua bước này" : isCurrent ? "Đang ở bước này" : isNext ? "Bấm để chuyển" : "Làm tuần tự từng bước"}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
              isPast
                ? "bg-green-100 text-green-800"
                : isCurrent
                  ? "bg-brand-700 text-white ring-2 ring-brand-300"
                  : canClick
                    ? "bg-cta-500 text-white hover:bg-cta-600"
                    : "bg-slate-100 text-slate-400"
            }`}
            onClick={() => canClick && onPick(step.status)}
          >
            {step.label}
          </button>
        );
      })}
    </div>
  );
}

function TripStatusControl({
  trip,
  canComplete,
  allowForceComplete,
  readOnly,
  onSetStatus,
}: {
  trip: any;
  canComplete?: boolean;
  /** Đang chạy: được chốt chuyến dù chưa bấm từng vé (backend tự «Đã trả») */
  allowForceComplete?: boolean;
  readOnly?: boolean;
  onSetStatus: (status: "READY" | "IN_PROGRESS" | "COMPLETED") => Promise<void>;
}) {
  const st = trip?.status;
  const steps: { id: "READY" | "IN_PROGRESS" | "COMPLETED"; label: string; hint: string }[] = [
    { id: "READY", label: "Đang gom", hint: "Còn nhận khách vào chuyến" },
    { id: "IN_PROGRESS", label: "Đang chạy", hint: "Đã xuất phát — không gán thêm khách" },
    { id: "COMPLETED", label: "Hoàn thành", hint: "Chốt chuyến — tiền vé vào báo cáo, không cần bấm từng vé" },
  ];

  const activeIdx =
    st === "COMPLETED" || st === "CANCELLED" ? 2 : st === "IN_PROGRESS" ? 1 : 0;

  return (
    <div className="card border-2 border-brand-200 bg-white">
      <p className="text-xs font-bold uppercase text-slate-500">Trạng thái chuyến</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {steps.map((s, i) => {
          const isActive = i === activeIdx;
          const disabled =
            readOnly ||
            st === "COMPLETED" ||
            st === "CANCELLED" ||
            (s.id === "READY" && st === "IN_PROGRESS") ||
            (s.id === "COMPLETED" && !allowForceComplete && !canComplete);
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              title={s.hint}
              className={`flex-1 rounded-xl px-4 py-3 text-left text-sm font-bold transition sm:min-w-[140px] ${
                isActive ? "bg-brand-700 text-white" : disabled ? "bg-slate-100 text-slate-400" : "bg-slate-50 text-slate-800 ring-1 ring-slate-200 hover:bg-brand-50"
              }`}
              onClick={() => !disabled && !isActive && onSetStatus(s.id)}
            >
              {s.label}
              <span className={`mt-0.5 block text-xs font-normal ${isActive ? "text-brand-100" : "text-slate-500"}`}>
                {s.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
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

function TripSummaryHeader({ t }: { t: any }) {
  return (
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
  );
}

function PendingTripPanel({
  trip,
  onAccept,
  onReject,
}: {
  trip: any;
  onAccept: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}) {
  const [detail, setDetail] = useState<any>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/driver/trips/${trip.id}`).then((r) => setDetail(r.data));
  }, [trip.id]);

  const pendingPassengers = (detail?.passengers || []).filter((p: any) => p.needsAck);
  const pendingParcels = (detail?.parcels || []).filter((p: any) => p.needsAck);
  const isNewTrip = trip.status === "COLLECTING";
  const ackLabel = isNewTrip ? "Đồng ý nhận chuyến" : `Đồng ý thêm ${trip.pendingAckCount || pendingPassengers.length + pendingParcels.length} khách/hàng`;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card border-l-4 border-l-cta-500">
      <TripSummaryHeader t={trip} />
      <p className="mt-3 text-sm text-slate-600">
        {isNewTrip
          ? "Admin gán chuyến cho bạn. Xem khách bên dưới rồi đồng ý hoặc từ chối."
          : `Admin gán thêm ${trip.pendingAckCount || ""} khách/hàng vào chuyến đang chạy.`}
      </p>
      <div className="mt-4 space-y-3">
        {pendingPassengers.map((p: any) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <b>{p.customerName}</b> · {p.code}
            {p.passengerCount > 0 && <span> · {p.passengerCount} ghế</span>}
            <p className="mt-1 text-slate-600">Đón: {p.pickupAddress || "—"}</p>
            {p.dropoffAddress && <p className="text-slate-600">Trả: {p.dropoffAddress}</p>}
          </div>
        ))}
        {pendingParcels.map((p: any) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <b>Gửi hàng · {p.code}</b>
            <p className="mt-1 text-slate-600">Lấy: {p.pickupAddress || "—"}</p>
            <p className="text-slate-600">Giao: {p.dropoffAddress || "—"}</p>
          </div>
        ))}
        {!detail && <p className="text-sm text-slate-500">Đang tải danh sách khách...</p>}
        {detail && !pendingPassengers.length && !pendingParcels.length && (
          <p className="text-sm text-slate-500">Không còn khách chờ xác nhận.</p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary py-2" disabled={busy} onClick={() => run(() => onAccept(trip.id))}>
          {ackLabel}
        </button>
        <button type="button" className="btn-ghost py-2" disabled={busy} onClick={() => run(() => onReject(trip.id))}>
          Từ chối
        </button>
      </div>
    </div>
  );
}

function DoneTripCard({
  trip,
  selected,
  onView,
}: {
  trip: any;
  selected?: boolean;
  onView: () => void;
}) {
  return (
    <div
      className={`card border-l-4 opacity-95 transition ${
        selected ? "border-l-brand-600 ring-2 ring-brand-200" : "border-l-slate-300"
      }`}
    >
      <TripSummaryHeader t={trip} />
      <p className="mt-3 text-sm text-slate-600">
        Tổng vé <b>{formatMoney(trip.totalNeedCollect)}</b>
        {Number(trip.debtAmount || 0) > 0 && (
          <>
            {" "}
            · Nộp VP <b>{formatMoney(trip.debtAmount)}</b>
          </>
        )}
      </p>
      <button type="button" className="btn-secondary mt-4 w-full py-2 sm:w-auto" onClick={onView}>
        Xem chi tiết từng vé
      </button>
    </div>
  );
}

function TripPaymentSummary({
  completed,
  summary,
  passengers,
  parcels,
}: {
  completed?: boolean;
  summary?: {
    totalNeedCollect?: number;
    totalCollected?: number;
    totalUncollected?: number;
    totalCommission?: number;
    driverOwesAdmin?: number;
    adminOwesDriver?: number;
    driverKeeps?: number;
  };
  passengers: any[];
  parcels: any[];
}) {
  const lines = [
    ...passengers.map((p) => ({
      id: p.id,
      code: p.code,
      label: p.customerName,
      amount: p.amount,
      paymentStatus: p.paymentStatus,
      paymentReceiver: p.paymentReceiver,
      commissionAmount: p.commissionAmount,
      driverOwesAdmin: p.driverOwesAdmin,
      adminOwesDriver: p.adminOwesDriver,
      driverKeeps: p.driverKeeps,
    })),
    ...parcels.map((p) => ({
      id: p.id,
      code: p.code,
      label: p.description ? `Gửi hàng · ${p.description}` : "Gửi hàng",
      amount: p.amount,
      paymentStatus: p.paymentStatus,
      paymentReceiver: p.paymentReceiver,
      commissionAmount: p.commissionAmount,
      driverOwesAdmin: p.driverOwesAdmin,
      adminOwesDriver: p.adminOwesDriver,
      driverKeeps: p.driverKeeps,
    })),
  ];

  return (
    <div className="card border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
      <p className="text-xs font-bold uppercase text-green-800">
        {completed ? "Tổng kết chuyến đã chốt" : "Tổng kết tiền vé chuyến"}
      </p>
      {completed ? (
        <p className="mt-1 text-sm text-slate-600">Mặc định đã thu đủ tiền khách khi hoàn thành chuyến.</p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <p className="text-xs text-slate-500">Tổng vé</p>
          <p className="mt-1 text-lg font-extrabold text-brand-900">{formatMoney(summary?.totalNeedCollect || 0)}</p>
        </div>
        {completed ? (
          <>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Hoa hồng nộp VP</p>
              <p className="mt-1 text-lg font-extrabold text-cta-600">{formatMoney(summary?.driverOwesAdmin || 0)}</p>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Bạn giữ / VP trả bạn</p>
              <p className="mt-1 text-lg font-extrabold text-green-800">
                {formatMoney((summary?.driverKeeps || 0) + (summary?.adminOwesDriver || 0))}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Đã thu</p>
              <p className="mt-1 text-lg font-extrabold text-green-800">{formatMoney(summary?.totalCollected || 0)}</p>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <p className="text-xs text-slate-500">Chưa thu</p>
              <p className="mt-1 text-lg font-extrabold text-cta-600">{formatMoney(summary?.totalUncollected || 0)}</p>
            </div>
          </>
        )}
      </div>
      {lines.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {lines.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <b className="text-slate-900">{row.code}</b>
                <span className="text-slate-600"> · {row.label}</span>
                <p className="text-xs text-slate-500">{paymentReceiver(row.paymentReceiver)}</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-cta-600">{formatMoney(row.amount || 0)}</p>
                {completed ? (
                  <p className="text-xs text-slate-500">
                    HH VP {formatMoney(row.driverOwesAdmin || 0)}
                    {(row.adminOwesDriver || 0) > 0
                      ? ` · VP trả bạn ${formatMoney(row.adminOwesDriver)}`
                      : (row.driverKeeps || 0) > 0
                        ? ` · Bạn giữ ${formatMoney(row.driverKeeps)}`
                        : ""}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">{bookingPaymentStatus(row.paymentStatus)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TRIP_TABS: { id: TripBucket; label: string; hint: string }[] = [
  { id: "pending", label: "Chờ xác nhận", hint: "Admin gán chuyến hoặc thêm khách — đồng ý hoặc từ chối." },
  { id: "active", label: "Đang chạy chuyến", hint: "Cập nhật đón/trả, thu tiền, hoàn thành — không cần mở trang khác." },
  { id: "done", label: "Đã xong", hint: "Bấm «Xem chi tiết từng vé» để xem danh sách khách/hàng và tổng tiền." },
];

export function DriverJobs() {
  const nav = useNavigate();
  const { tripId: tripIdParam } = useParams();
  const focusTripId = tripIdParam ? Number(tripIdParam) : undefined;
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<TripBucket>("pending");

  const load = () => api.get("/driver/trips").then((r) => setItems(r.data || []));

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => groupTrips(items), [items]);

  useEffect(() => {
    const { pending, active } = grouped;
    if (focusTripId && items.length) {
      const t = items.find((x) => x.id === focusTripId);
      if (t) setTab(t.needsDriverAck ? "pending" : t.status === "COMPLETED" || t.status === "CANCELLED" ? "done" : "active");
      return;
    }
    if (tab === "pending" && !pending.length && active.length) setTab("active");
    if (tab === "active" && !active.length && pending.length) setTab("pending");
  }, [items, tab, focusTripId, grouped]);

  const accept = async (id: number) => {
    const { data } = await api.post(`/driver/trips/${id}/accept`);
    setMsg(data?.message || "Đã xác nhận.");
    await load();
    setTab("active");
  };
  const reject = async (id: number) => {
    const reason = prompt("Lý do từ chối (tuỳ chọn):") || "";
    const { data } = await api.post(`/driver/trips/${id}/reject`, { reason });
    setMsg(data?.message || "Đã từ chối.");
    await load();
  };

  const currentTab = TRIP_TABS.find((t) => t.id === tab)!;
  const activeTrip = grouped.active[0];
  const focusTrip = focusTripId ? items.find((x) => x.id === focusTripId) : undefined;
  const viewingDoneTrip =
    focusTrip && (focusTrip.status === "COMPLETED" || focusTrip.status === "CANCELLED") ? focusTrip : undefined;

  return (
    <div className="space-y-6">
      <PageIntro
        title="Chuyến của tôi"
        subtitle="Một lúc chỉ một chuyến: xác nhận khách admin gán → chạy chuyến ngay tại đây."
      />

      {msg && <div className="rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-800">{msg}</div>}

      {grouped.active.length > 1 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          Đang có nhiều chuyến chưa xong — liên hệ admin gộp hoặc hoàn thành từng chuyến. Ưu tiên chuyến đầu danh sách.
        </div>
      )}

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

      {tab === "pending" && (
        <div className="space-y-3">
          {grouped.pending.map((t) => (
            <PendingTripPanel key={t.id} trip={t} onAccept={accept} onReject={reject} />
          ))}
          {!grouped.pending.length && (
            <EmptyState
              title="Không có khách chờ xác nhận"
              subtitle="Khi admin gán chuyến hoặc thêm khách, mục này sẽ hiện."
              action={
                <Link className="btn-secondary py-2" to="/tai-xe/san-sang">
                  Báo trạng thái rảnh
                </Link>
              }
            />
          )}
        </div>
      )}

      {tab === "active" && (
        <div className="space-y-3">
          {activeTrip ? (
            <>
              {activeTrip.needsDriverAck && (
                <ActionAlert tone="cta" title={`Admin gán thêm khách vào ${activeTrip.code}`}>
                  <p className="text-sm text-slate-700">Vẫn xử lý khách cũ bên dưới. Khách mới cần xác nhận ở tab «Chờ xác nhận».</p>
                  <button type="button" className="btn-primary mt-3 py-2" onClick={() => setTab("pending")}>
                    Đi xác nhận khách mới
                  </button>
                </ActionAlert>
              )}
              <DriverTripWorkspace
                tripId={activeTrip.id}
                embedded
                onRefresh={load}
                onTripCompleted={(m) => {
                  setMsg(m);
                  load();
                  setTab("done");
                }}
              />
            </>
          ) : (
            <EmptyState
              title="Chưa có chuyến đang chạy"
              subtitle="Xác nhận khách ở tab «Chờ xác nhận» hoặc chờ admin gán chuyến."
            />
          )}
        </div>
      )}

      {tab === "done" && (
        <div className="space-y-4">
          {viewingDoneTrip && (
            <div className="space-y-3">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"
                onClick={() => nav("/tai-xe/chuyen")}
              >
                <ArrowLeft size={16} /> Danh sách chuyến đã xong
              </button>
              <DriverTripWorkspace tripId={viewingDoneTrip.id} embedded readOnly onRefresh={load} />
            </div>
          )}
          {(!viewingDoneTrip || grouped.done.length > 1) && (
            <div className="space-y-3">
              {viewingDoneTrip && grouped.done.length > 1 && (
                <p className="text-sm font-semibold text-slate-600">Chuyến khác đã xong</p>
              )}
              {grouped.done.map((t) =>
                viewingDoneTrip && t.id === viewingDoneTrip.id ? null : (
                  <DoneTripCard
                    key={t.id}
                    trip={t}
                    selected={t.id === focusTripId}
                    onView={() => nav(`/tai-xe/chuyen/${t.id}`)}
                  />
                ),
              )}
            </div>
          )}
          {!grouped.done.length && <EmptyState title="Chưa có chuyến đã xong" subtitle="Chuyến hoàn thành sẽ hiện ở đây." />}
        </div>
      )}
    </div>
  );
}

export function DriverAvailability() {
  const [ctx, setCtx] = useState<{
    locked?: boolean;
    vehicleMaxSeats?: number;
    activeTrip?: {
      code: string;
      status: string;
      routeName?: string;
      availableSeats: number;
      dispatchSeats: number;
    } | null;
    form?: {
      status: string;
      runDirection: string | null;
      direction?: string | null;
      seatsFree: number;
    };
  } | null>(null);
  const [form, setForm] = useState({
    status: "Rảnh",
    runDirection: "" as "" | "SG_TO_PROVINCE" | "PROVINCE_TO_SG",
    seatsFree: 4,
  });
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get("/driver/availability").then((availRes) => {
        const data = availRes.data;
        setCtx(data);
        const f = data?.form;
        if (f) {
          setForm({
            status: f.status || "Rảnh",
            runDirection:
              f.runDirection === "SG_TO_PROVINCE" || f.runDirection === "PROVINCE_TO_SG"
                ? f.runDirection
                : "",
            seatsFree: Number(f.seatsFree ?? 4),
          });
        }
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const locked = Boolean(ctx?.locked);
  const vehicleMax = Number(ctx?.vehicleMaxSeats ?? 0);
  const maxSeatsInput = vehicleMax > 0 ? vehicleMax : 99;

  const save = async () => {
    if (!locked && form.status === "Rảnh" && !form.runDirection) {
      return alert("Chọn chiều chạy");
    }
    try {
      const { data } = await api.patch("/driver/availability", {
        status: locked ? undefined : form.status,
        runDirection: locked ? undefined : form.runDirection || undefined,
        seatsFree: form.seatsFree,
      });
      setSaveMsg(data?.message || "Đã lưu.");
      load();
    } catch (e: any) {
      setSaveMsg(e?.response?.data?.message || "Không lưu được.");
    }
  };

  return (
    <div className="space-y-6">
      <PageIntro
        title="Báo rảnh / bận"
        subtitle="Admin chỉ dựa vào thông tin bạn khai báo ở đây để điều phối. Sau khi hoàn thành chuyến, hệ thống tự chuyển rảnh + chiều ngược — bạn vẫn có thể chỉnh lại tùy ý khi chưa có chuyến được gán."
      />

      {locked && ctx?.activeTrip && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-950">
          <b>Đang có chuyến {ctx.activeTrip.code}</b> — chiều theo chuyến admin gán, không đổi ở đây.
          <p className="mt-2">
            Chuyến còn <b>{ctx.activeTrip.availableSeats}</b> chỗ trống trên hệ thống; bạn khai báo{" "}
            <b>{form.seatsFree}</b> ghế → admin chỉ gán thêm tối đa{" "}
            <b>{ctx.activeTrip.dispatchSeats}</b> ghế (khách riêng / ghế giữ riêng trừ vào số bạn báo).
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <b>Ghế trống trên xe</b> (ở đây): số ghế bạn còn nhận khách của hệ thống. Xe {vehicleMax > 0 ? `${vehicleMax} chỗ` : "chưa khai báo"} — không nhập quá số ghế xe.
      </div>

      {loading ? (
        <div className="card text-sm text-slate-600">Đang tải...</div>
      ) : (
        <div className="panel grid gap-4 md:grid-cols-2">
          <label className="font-bold md:col-span-2">
            Bạn đang
            {locked ? (
              <p className="input mt-2 bg-slate-100 font-semibold text-slate-800">{form.status}</p>
            ) : (
              <select
                className="input mt-2"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option>Rảnh</option>
                <option>Bận</option>
                <option>Nghỉ hôm nay</option>
              </select>
            )}
          </label>
          {locked ? (
            <div className="md:col-span-2">
              <p className="text-xs font-bold uppercase text-slate-500">Chiều chạy (theo chuyến)</p>
              <p className="mt-1 font-semibold text-slate-900">{ctx?.form?.direction || "—"}</p>
            </div>
          ) : form.status === "Rảnh" ? (
            <>
              <label className="font-bold md:col-span-2">
                Chiều chạy (mọi tuyến cùng chiều) <span className="text-red-600">*</span>
                <select
                  className="input mt-2"
                  value={form.runDirection}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      runDirection: e.target.value as typeof form.runDirection,
                    })
                  }
                >
                  <option value="">— Chọn chiều —</option>
                  <option value="SG_TO_PROVINCE">Sài Gòn → Đức Linh / Tánh Linh</option>
                  <option value="PROVINCE_TO_SG">Đức Linh / Tánh Linh → Sài Gòn</option>
                </select>
              </label>
              <p className="md:col-span-2 text-sm text-slate-600">
                Admin gán bạn vào đơn/chuyến <b>đúng chiều</b> (Đức Linh, Tánh Linh, … cùng chiều).
              </p>
            </>
          ) : (
            <p className="md:col-span-2 text-sm text-slate-600">
              Khi Bận/Nghỉ vẫn có thể chỉnh ghế. Chuyển lại «Rảnh» để đổi chiều.
            </p>
          )}
          <label className="font-bold md:col-span-2">
            Ghế còn nhận khách hệ thống
            {vehicleMax > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-500">(tối đa {vehicleMax} theo xe)</span>
            )}
            <input
              className="input mt-2"
              type="number"
              min={0}
              max={maxSeatsInput}
              value={form.seatsFree}
              onChange={(e) => setForm({ ...form, seatsFree: Number(e.target.value) })}
            />
          </label>
          <button type="button" className="btn-primary md:col-span-2" onClick={save}>
            Lưu
          </button>
          {saveMsg && <p className="md:col-span-2 text-sm font-semibold text-green-700">{saveMsg}</p>}
        </div>
      )}
    </div>
  );
}

const SETTLEMENT_DIRECTION_VI: Record<string, string> = {
  DRIVER_OWES_ADMIN: "Tôi nộp VP",
  ADMIN_OWES_DRIVER: "VP trả tôi",
};

export function DriverDebts() {
  const [r, setR] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    setErr("");
    return api
      .get("/driver/reports")
      .then((x) => setR(x.data))
      .catch((e: any) => {
        setErr(e?.response?.data?.message || e?.message || "Không tải được công nợ");
        setR(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const outstandingTrips = useMemo(() => {
    const list = r?.trips || [];
    return list.filter(
      (t: any) => Number(t.driverDebtRemaining || 0) > 0 || Number(t.adminOwesRemaining || 0) > 0
    );
  }, [r?.trips]);

  const settledTrips = useMemo(() => {
    const list = r?.trips || [];
    return list.filter(
      (t: any) => Number(t.driverDebtRemaining || 0) <= 0 && Number(t.adminOwesRemaining || 0) <= 0
    );
  }, [r?.trips]);

  return (
    <div className="space-y-6">
      <PageIntro
        title="Công nợ"
        subtitle="Chỉ tính sau khi chuyến hoàn thành — tiền bạn nộp VP hoặc VP còn trả bạn."
      />
      {loading ? (
        <div className="card py-12 text-center text-sm text-slate-500">Đang tải...</div>
      ) : err ? (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {err}
          <button type="button" className="btn-secondary mt-3 py-2" onClick={load}>
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Chuyến đã hoàn thành"
              value={r?.totalTrips || 0}
              tone="brand"
              icon={<CalendarClock size={20} />}
            />
            <StatCard
              label="Còn phải nộp VP"
              value={formatMoney(r?.totalDebt)}
              tone="red"
              icon={<AlertTriangle size={20} />}
            />
            <StatCard
              label="VP còn trả tôi"
              value={formatMoney(r?.totalAdminOwes)}
              tone="green"
              icon={<CheckCircle2 size={20} />}
            />
          </div>

          {Number(r?.totalPaid) > 0 && (
            <p className="text-sm text-slate-600">
              Đã nộp VP (tổng các lần): <b>{formatMoney(r.totalPaid)}</b>
            </p>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Chuyến còn công nợ</h2>
            {outstandingTrips.map((t: any) => (
              <DriverDebtTripCard key={t.id} trip={t} />
            ))}
            {!outstandingTrips.length && (
              <EmptyState
                title="Không còn công nợ mở"
                subtitle={
                  (r?.totalTrips || 0) > 0
                    ? "Các chuyến đã hoàn thành và đối soát xong (xem bên dưới nếu có)."
                    : "Hoàn thành chuyến xong số liệu mới hiện ở đây."
                }
              />
            )}
          </section>

          {settledTrips.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Đã đối soát xong</h2>
              {settledTrips.map((t: any) => (
                <DriverDebtTripCard key={t.id} trip={t} muted />
              ))}
            </section>
          )}

          {(r?.payments?.length || 0) > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Lịch sử thanh toán</h2>
              <div className="grid gap-2">
                {r.payments.map((p: any) => (
                  <div key={p.id} className="card py-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <b>{SETTLEMENT_DIRECTION_VI[p.direction] || p.direction}</b>
                      <span className="font-extrabold text-brand-900">{formatMoney(p.amount)}</span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      {p.trip?.code ? `Chuyến ${p.trip.code}` : "Không gắn chuyến"}
                      {p.method ? ` · ${p.method}` : ""}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">{formatDisplayDateTime(p.createdAt)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function DriverDebtTripCard({ trip: t, muted }: { trip: any; muted?: boolean }) {
  const hasDriverDebt = Number(t.driverDebtRemaining || 0) > 0;
  const hasAdminOwes = Number(t.adminOwesRemaining || 0) > 0;
  return (
    <div className={`card ${muted ? "opacity-80" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/tai-xe/chuyen/${t.id}`} className="font-bold text-brand-800 hover:underline">
            {t.code}
          </Link>
          <p className="text-sm text-slate-600">{t.route?.name || "—"}</p>
          {t.departureAt && (
            <p className="text-xs text-slate-500">{formatDisplayDateTime(t.departureAt)}</p>
          )}
        </div>
        <span className={`badge ${muted ? "badge-success" : "badge-info"}`}>
          {settlementStatus(t.settlementStatus)}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {hasDriverDebt ? (
          <>
            Còn nợ VP: <b className="text-red-700">{formatMoney(t.driverDebtRemaining)}</b>
          </>
        ) : (
          <span className="text-slate-500">Không còn nợ VP</span>
        )}
        {" · "}
        {hasAdminOwes ? (
          <>
            VP trả bạn: <b className="text-green-700">{formatMoney(t.adminOwesRemaining)}</b>
          </>
        ) : (
          <span className="text-slate-500">VP không còn nợ bạn</span>
        )}
      </p>
      {(Number(t.driverPaidAdmin) > 0 || Number(t.adminPaidDriver) > 0) && (
        <p className="mt-1 text-xs text-slate-500">
          Đã nộp VP: {formatMoney(t.driverPaidAdmin)} · VP đã trả: {formatMoney(t.adminPaidDriver)}
        </p>
      )}
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
  settled,
  onPickStatus,
  onIncident,
}: {
  p: any;
  readOnly?: boolean;
  /** Chuyến đã chốt — hiện HH / ai thu tiền thay vì «Chưa thu» */
  settled?: boolean;
  onPickStatus: (status: string) => void;
  onIncident: (status: string) => void;
}) {
  const done = isRideDone(p.status);
  const needsAdmin = ["WAITING_ADMIN_REVIEW", "UNREACHABLE", "NO_SHOW"].includes(p.status || "");

  const bookingSeats = Number(p.bookingTotalSeats ?? p.passengerCount ?? 0);
  const seatsOnTrip = Number(p.seatCountOnTrip ?? p.passengerCount ?? 0);
  const fullAmount = Number(p.bookingFullAmount ?? p.amount ?? 0);
  const tripAmount = Number(p.amount ?? 0);
  const splitSeats = bookingSeats > 0 && seatsOnTrip > 0 && seatsOnTrip < bookingSeats;

  return (
    <div className={`rounded-2xl border bg-white p-4 ${needsAdmin ? "border-amber-300 bg-amber-50/50" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <b className="text-base">{p.customerName}</b>
          <p className="text-xs text-slate-500">{p.code}</p>
          {bookingSeats > 0 && (
            <p className="mt-1 text-sm text-slate-600">
              {bookingSeats} ghế
              {seatsOnTrip > 0 && seatsOnTrip !== bookingSeats ? (
                <span className="ml-1 text-xs text-slate-500">(chuyến này: {seatsOnTrip})</span>
              ) : null}
            </p>
          )}
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
          <p className="mt-2 text-lg font-extrabold text-cta-600">{formatMoney(tripAmount)}</p>
          {splitSeats && fullAmount > tripAmount ? (
            <p className="text-xs text-amber-800">
              Đơn {formatMoney(fullAmount)} · chuyến này {seatsOnTrip}/{bookingSeats} ghế
            </p>
          ) : null}
          <p className="text-xs text-slate-500">
            {settled
              ? `HH VP ${formatMoney(p.driverOwesAdmin || 0)} · ${paymentReceiver(p.paymentReceiver)}`
              : readOnly
                ? paymentReceiver(p.paymentReceiver)
                : "Giá vé"}
          </p>
        </div>
      </div>

      {!done && !readOnly && (
        <RideStatusStepButtons flow={RIDE_FLOW} current={p.status} readOnly={readOnly} onPick={onPickStatus} />
      )}
      {done && <p className="mt-2 text-sm font-semibold text-green-800">Đã trả khách xong</p>}

      {needsAdmin && (
        <p className="mt-2 text-xs font-semibold text-amber-800">Đang chờ admin xử lý — không cần bấm thêm bước đón/trả.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <a className="btn-secondary py-2" href={`tel:${p.customerPhone}`}>
          <Phone size={16} className="mr-1 inline" />
          Gọi {maskPhone(p.customerPhone)}
        </a>
      </div>

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
  settled,
  onPickStatus,
  onIncident,
}: {
  p: any;
  readOnly?: boolean;
  settled?: boolean;
  onPickStatus: (status: string) => void;
  onIncident: (status: string) => void;
}) {
  const done = isCargoDone(p.status);
  const fullAmount = Number(p.bookingFullAmount ?? p.amount ?? 0);
  const tripAmount = Number(p.amount ?? 0);
  const bookingSeats = Number(p.bookingTotalSeats ?? 1);
  const seatsOnTrip = Number(p.seatCountOnTrip ?? 1);
  const splitSeats = bookingSeats > 0 && seatsOnTrip > 0 && seatsOnTrip < bookingSeats;

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
          <p className="mt-2 text-lg font-extrabold text-cta-600">{formatMoney(tripAmount)}</p>
          {splitSeats && fullAmount > tripAmount ? (
            <p className="text-xs text-amber-800">
              Đơn {formatMoney(fullAmount)} · chuyến này {seatsOnTrip}/{bookingSeats} ghế
            </p>
          ) : null}
          <p className="text-xs text-slate-500">
            {settled
              ? `HH VP ${formatMoney(p.driverOwesAdmin || 0)} · ${paymentReceiver(p.paymentReceiver)}`
              : readOnly
                ? paymentReceiver(p.paymentReceiver)
                : "Giá vé"}
          </p>
        </div>
      </div>

      {!done && !readOnly && (
        <RideStatusStepButtons flow={CARGO_FLOW} current={p.status} readOnly={readOnly} onPick={onPickStatus} />
      )}
      {done && <p className="mt-2 text-sm font-semibold text-green-800">Đã giao xong</p>}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <a className="btn-secondary py-2" href={`tel:${p.senderPhone}`}>
          <Phone size={16} className="mr-1 inline" />
          Gửi {maskPhone(p.senderPhone)}
        </a>
        <a className="btn-secondary py-2" href={`tel:${p.receiverPhone}`}>
          Nhận {maskPhone(p.receiverPhone)}
        </a>
      </div>

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

type DetailTab = "passengers" | "parcels";

export function DriverTripWorkspace({
  tripId,
  embedded = false,
  readOnly = false,
  onRefresh,
  onTripCompleted,
}: {
  tripId: number;
  embedded?: boolean;
  readOnly?: boolean;
  onRefresh?: () => void;
  onTripCompleted?: (message: string) => void;
}) {
  const [d, setD] = useState<any>();
  const [seatInput, setSeatInput] = useState<number | "">("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<DetailTab>("passengers");
  const id = tripId;

  const load = () =>
    api.get(`/driver/trips/${id}`).then((r) => {
      setD(r.data);
      if (r.data?.trip) setSeatInput(Number(r.data.trip.availableSeats ?? 0));
      onRefresh?.();
    });

  useEffect(() => {
    if (Number.isFinite(id)) load();
  }, [id]);

  const setRideStatus = async (bookingId: number, status: string) => {
    try {
      const { data } = await api.post(`/driver/trips/${id}/bookings/${bookingId}/status`, { status });
      if (data?.autoCompleted) {
        setMsg(data.message || "Chuyến đã tự hoàn thành.");
        onTripCompleted?.(data.message || "Chuyến đã tự hoàn thành.");
        onRefresh?.();
        return;
      }
      setMsg("Đã cập nhật trạng thái khách.");
      load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Không cập nhật được trạng thái.");
    }
  };
  const setCargoStatus = async (bookingId: number, status: string) => {
    try {
      const { data } = await api.post(`/driver/trips/${id}/parcels/${bookingId}/status`, { status });
      if (data?.autoCompleted) {
        setMsg(data.message || "Chuyến đã tự hoàn thành.");
        onTripCompleted?.(data.message || "Chuyến đã tự hoàn thành.");
        onRefresh?.();
        return;
      }
      setMsg("Đã cập nhật trạng thái hàng.");
      load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Không cập nhật được trạng thái.");
    }
  };

  const saveSeats = async () => {
    if (seatInput === "") return;
    await api.post(`/driver/trips/${id}/available-seats`, { availableSeats: seatInput });
    setMsg("Đã cập nhật ghế trống trong chuyến.");
    load();
  };

  if (!d?.trip) {
    return (
      <div className={embedded ? "card text-sm text-slate-600" : "space-y-6"}>
        {!embedded && (
          <Link to="/tai-xe/chuyen" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
            <ArrowLeft size={16} /> Chuyến của tôi
          </Link>
        )}
        <p className="py-6 text-center">Đang tải chuyến...</p>
      </div>
    );
  }

  const needsAccept = !embedded && Boolean(d.needsDriverAck);
  const tripDone = readOnly || d.trip.status === "COMPLETED" || d.trip.status === "CANCELLED";
  const passengerCount = d.passengers?.length || 0;
  const parcelCount = d.parcels?.length || 0;

  const setTripStatus = async (status: "READY" | "IN_PROGRESS" | "COMPLETED") => {
    try {
      const { data } = await api.post(`/driver/trips/${id}/trip-status`, { status });
      setMsg(data?.message || "Đã cập nhật trạng thái chuyến.");
      if (status === "COMPLETED") {
        onTripCompleted?.(data?.message || "Chuyến đã hoàn thành.");
        onRefresh?.();
        return;
      }
      load();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "Không đổi được trạng thái chuyến.");
    }
  };

  const detailTabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: "passengers", label: "Khách xe", count: passengerCount },
    { id: "parcels", label: "Gửi hàng", count: parcelCount },
  ];

  let phaseLabel = "Đang chạy";
  let phaseHint =
    "Có thể bấm từng bước đón/trả từng vé (tùy chọn). Khi «Đang chạy», bấm Hoàn thành để chốt chuyến — tiền vé vào báo cáo, không cần thu tiền từng vé.";
  if (needsAccept) {
    phaseLabel = "Chờ bạn nhận";
    phaseHint = "Nhận hoặc từ chối trước khi gom khách.";
  } else if (tripDone) {
    phaseLabel = "Đã kết thúc";
    phaseHint = "Xem lại từng vé, trạng thái thu tiền và tổng cộng bên dưới.";
  }

  return (
    <div className={`space-y-6 ${embedded ? "" : "pb-24"}`}>
      {!embedded && (
        <Link to="/tai-xe/chuyen" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
          <ArrowLeft size={16} /> Chuyến của tôi
        </Link>
      )}

      <div className={`rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 ${embedded ? "card !border-brand-200 !bg-gradient-to-br" : ""}`}>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{phaseLabel}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-brand-900">{d.trip.code}</h1>
        <p className="mt-1 font-semibold text-slate-800">{d.trip.route?.name || "—"}</p>
        <p className="mt-2 text-sm text-slate-600">
          {formatDisplayDateTime(d.trip.departureAt)} · {tripStatus(d.trip.status)}
        </p>
        <p className="mt-2 text-sm text-slate-600">{phaseHint}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-white px-3 py-1 font-semibold ring-1 ring-slate-200">
            Tổng vé chuyến: {formatMoney(d.paymentSummary?.totalNeedCollect || 0)}
          </span>
          <span className="rounded-lg bg-white px-3 py-1 font-semibold ring-1 ring-slate-200">
            Còn {d.trip.availableSeats} ghế trong chuyến
          </span>
        </div>
      </div>

      {msg && <div className="rounded-2xl bg-brand-50 p-3 text-sm font-semibold text-brand-900">{msg}</div>}

      {tripDone && (
        <TripPaymentSummary
          completed={tripDone}
          summary={d.paymentSummary}
          passengers={d.passengers || []}
          parcels={d.parcels || []}
        />
      )}

      {!needsAccept && !tripDone && (
        <TripStatusControl
          trip={d.trip}
          canComplete={d.completion?.canComplete}
          allowForceComplete={d.trip.status === "IN_PROGRESS"}
          readOnly={readOnly}
          onSetStatus={setTripStatus}
        />
      )}

      <div className={`${embedded ? "" : "sticky top-0 z-10 -mx-1"} flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur`}>
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
            {tripDone
              ? "Danh sách khách và giá từng vé trong chuyến."
              : needsAccept
                ? "Xem trước danh sách khách. Nhận chuyến để bắt đầu cập nhật."
                : "Bấm từng nút trạng thái theo thứ tự (xanh = bước tiếp theo)."}
          </p>
          <div className="grid gap-3">
            {(d.passengers || []).map((p: any) => (
              <PassengerCard
                key={p.id}
                p={p}
                readOnly={needsAccept || tripDone}
                settled={tripDone}
                onPickStatus={(st) => setRideStatus(p.id, st)}
                onIncident={(st) => setRideStatus(p.id, st)}
              />
            ))}
            {!passengerCount && <p className="text-sm text-slate-500">Chưa có khách trong chuyến.</p>}
          </div>
        </section>
      )}

      {tab === "parcels" && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600">
            {tripDone
              ? "Danh sách đơn gửi hàng và giá từng vé."
              : needsAccept
                ? "Xem trước đơn hàng trong chuyến."
                : "Lấy hàng → giao hàng. Không tính ghế."}
          </p>
          <div className="grid gap-3">
            {(d.parcels || []).map((p: any) => (
              <ParcelCard
                key={p.id}
                p={p}
                readOnly={needsAccept || tripDone}
                settled={tripDone}
                onPickStatus={(st) => setCargoStatus(p.id, st)}
                onIncident={(st) => setCargoStatus(p.id, st)}
              />
            ))}
            {!parcelCount && <p className="text-sm text-slate-500">Chưa có đơn gửi hàng.</p>}
          </div>
        </section>
      )}

      {!needsAccept && !tripDone && d.trip.status === "READY" && (
        <div className="card">
          <b className="block">Ghế còn trống (khi đang gom)</b>
          <p className="mt-1 text-sm text-slate-600">Chỉ khi «Đang gom». Sau «Đang chạy» admin không gán thêm khách.</p>
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

      {!needsAccept && !tripDone && d.trip.status === "READY" && !d.completion?.canComplete && (
        <p className="text-sm text-slate-600">
          Chuyển sang «Đang chạy» khi xuất phát, rồi «Hoàn thành» để chốt chuyến (không bắt buộc bấm từng vé).
        </p>
      )}
    </div>
  );
}

/** Deep link /tai-xe/chuyen/:id → cùng trang Chuyến của tôi */
export function DriverTripDetail() {
  return <DriverJobs />;
}
