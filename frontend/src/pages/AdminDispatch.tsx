import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Filter } from "lucide-react";
import { api, formatMoney } from "../lib/api";
import { ColumnPager } from "../components/dispatch/ColumnPager";
import { fmtDepartureTime, formatDisplayDate, todayLocalDateValue } from "../lib/datetime";
import { ensureAppTime } from "../lib/appTime";
import { SERVICE_TYPE_OPTIONS, serviceTypeLabel } from "../lib/serviceTypes";
import {
  bookingRemainingSeatUnits,
  bookingSeatUnits,
  bookingCapacityLabel,
  computeAssignSeatCounts,
} from "../lib/bookingSeats";
import {
  bookingRunDirection,
  driverMatchesBooking,
  runDirectionLabel,
  driverMismatchReason,
  tripMatchesRun,
  tripMismatchReason,
} from "../lib/runDirection";
import { bookingStatus, tripStatus } from "../lib/vi";
import { RouteCell } from "../components/ui/RouteCell";
import { routePrimaryLabel } from "../lib/routeDisplay";
import { GregorianDateInput, GregorianDateTimeInput } from "../components/ui/GregorianDateInputs";

const fmtTime = fmtDepartureTime;

function scheduledDateRangeLabel(from: string, to: string) {
  if (from === to) return `ngày ${formatDisplayDate(from)}`;
  return `từ ${formatDisplayDate(from)} đến ${formatDisplayDate(to)}`;
}

type DispatchOption = {
  key: string;
  kind: "existing_trip" | "available_driver";
  eligible: boolean;
  disabledReason?: string;
  tripId?: number;
  driverId?: number;
  vehicleId?: number | null;
  vehicleSeats?: number;
  seatsNeeded: number;
  seatsAssignable?: number;
  label: string;
};

type SuggestionOverrides = Record<string, { optionKey?: string }>;

type ListMeta = { page: number; pageSize: number; total: number; totalPages: number };

const defaultPages = () => ({
  bookingsPage: 1,
  tripsPage: 1,
  driversPage: 1,
  suggestionsPage: 1,
  dispatchedPage: 1,
});

function driversEligibleForTrip(trip: any, drivers: any[], contextBooking?: any) {
  const booked = Number(trip.bookedSeats || 0);
  const refBooking = contextBooking || trip.tripBookings?.[0]?.booking;
  const run = refBooking ? bookingRunDirection(refBooking) : null;
  return drivers.filter((d) => {
    const v = d.vehicles?.[0];
    if (!v || Number(v.seats) < booked) return false;
    const routeId = refBooking?.routeId ?? trip.routeId;
    if (run && routeId && !driverMatchesBooking(d, routeId, run)) return false;
    return true;
  });
}

function driverFitsSeats(d: any, seatsNeeded: number) {
  const v = d.vehicles?.[0];
  if (!v) return { ok: false, reason: "Chưa khai báo xe" };
  const cap = Number(v.seats);
  if (cap <= 0) return { ok: false, reason: "Xe chưa có số chỗ" };
  if (cap < 1 || seatsNeeded < 1) return { ok: false, reason: "Không còn ghế cần gán" };
  const assign = Math.min(seatsNeeded, cap);
  return { ok: true as const, assign };
}

function canConfirmSuggestion(s: any, data: any, ov: SuggestionOverrides[string]) {
  const opts: DispatchOption[] = s.dispatchOptions || [];
  const chosenKey = ov?.optionKey;
  const chosen = chosenKey ? opts.find((o) => o.key === chosenKey) : opts.find((o) => o.eligible);
  if (chosen) return !!chosen.eligible && (chosen.seatsAssignable ?? 0) > 0;

  // Fallback (older API)
  if (s.seatsRemainingAfter != null && s.seatsRemainingAfter < 0) return false;
  if (s.kind === "new_trip") {
    const driverId = s.driverId;
    if (!driverId && s.seatsNeeded > s.vehicleSeats) return false;
    if (driverId) {
      const d = (data?.availableDrivers || []).find((x: any) => x.id === driverId);
      if (!d || !driverFitsSeats(d, s.seatsNeeded).ok) return false;
    }
  }
  if (s.kind === "assign_trip") {
    const tripId = s.tripId;
    const t = (data?.collectingTrips || []).find((x: any) => x.id === tripId);
    if (t && Number(t.availableSeats) < s.seatsNeeded) return false;
  }
  return true;
}

export function AdminDispatch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [filterDraft, setFilterDraft] = useState<Record<string, string | undefined>>({});
  const [pages, setPages] = useState(defaultPages);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overrides, setOverrides] = useState<SuggestionOverrides>({});
  const [showManual, setShowManual] = useState(true);
  const [timeEdits, setTimeEdits] = useState<Record<number, string>>({});
  const [assignDriverPick, setAssignDriverPick] = useState<Record<number, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  /** Mặc định: đơn/chuyến trong ngày hôm nay (theo giờ server VN) */
  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) return;
    void ensureAppTime().then(() => {
      const today = todayLocalDateValue();
      const next = new URLSearchParams(searchParams);
      if (!from) next.set("from", today);
      if (!to) next.set("to", from || today);
      setSearchParams(next, { replace: true });
    });
  }, [searchParams, setSearchParams]);

  const dateFilters = useMemo(() => {
    const today = todayLocalDateValue();
    const from = searchParams.get("from") || today;
    const to = searchParams.get("to") || from;
    return { from, to };
  }, [searchParams]);

  const dateRangeLabel = useMemo(
    () => scheduledDateRangeLabel(dateFilters.from, dateFilters.to),
    [dateFilters.from, dateFilters.to]
  );

  useEffect(() => {
    setFilterDraft((prev) => ({ ...prev, from: dateFilters.from, to: dateFilters.to }));
  }, [dateFilters.from, dateFilters.to]);

  const load = useCallback(() => {
    if (!searchParams.get("from")) return Promise.resolve();
    setLoading(true);
    const params: Record<string, unknown> = { ...filters, ...dateFilters, ...pages };
    if (selectedBooking?.routeId) {
      params.matchRouteId = selectedBooking.routeId;
      const run = bookingRunDirection(selectedBooking);
      if (run) params.matchRunDirection = run;
    }
    return api
      .get("/admin/dispatch", { params })
      .then((r) => {
        setData(r.data);
        setOverrides({});
      })
      .finally(() => setLoading(false));
  }, [filters, dateFilters, pages, selectedBooking, searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilters = () => {
    const today = todayLocalDateValue();
    let from = filterDraft.from?.trim() || today;
    let to = filterDraft.to?.trim() || today;
    if (from > to) [from, to] = [to, from];
    const next = new URLSearchParams(searchParams);
    next.set("from", from);
    next.set("to", to);
    setSearchParams(next);
    const { from: _f, to: _t, ...rest } = filterDraft;
    setFilters(rest);
    setPages(defaultPages());
  };

  const clearFilters = () => {
    const today = todayLocalDateValue();
    setFilterDraft({ from: today, to: today });
    setFilters({});
    setSearchParams({ from: today, to: today });
    setPages(defaultPages());
  };

  const setColumnPage = (key: keyof ReturnType<typeof defaultPages>, page: number) => {
    setPages((prev) => ({ ...prev, [key]: page }));
  };

  const suggestions = useMemo(() => data?.suggestions || [], [data]);

  const selectedBookings = useMemo(() => (selectedBooking ? [selectedBooking] : []), [selectedBooking]);

  const selectBooking = (b: any) => {
    if (selectedId === b.id) {
      setSelectedId(null);
      setSelectedBooking(null);
      setPages((prev) => ({ ...prev, tripsPage: 1, driversPage: 1 }));
      return;
    }
    setSelectedId(b.id);
    setSelectedBooking(b);
    setPages((prev) => ({ ...prev, tripsPage: 1, driversPage: 1 }));
  };

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedBooking(null);
  };

  const saveBookingTime = async (bookingId: number) => {
    const local = timeEdits[bookingId];
    if (!local) return alert("Chọn ngày giờ đi");
    setBusy(true);
    try {
      await api.patch(`/admin/bookings/${bookingId}`, { scheduledAt: local });
      setTimeEdits((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      await load();
      setMsg("Đã lưu giờ đi");
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Không lưu được giờ đi");
    } finally {
      setBusy(false);
    }
  };

  const buildSeatCountsForSuggestion = (s: any, chosen: DispatchOption) => {
    const seatCounts: Record<number, number> = {};
    let left = Number(chosen.seatsAssignable ?? s.seatsNeeded ?? 0);
    for (const id of s.bookingIds as number[]) {
      const b = (data?.unassignedBookings || []).find((x: any) => x.id === id);
      const remaining = b ? bookingRemainingSeatUnits(b) : left;
      const assign = Math.min(remaining, left);
      if (assign > 0) {
        seatCounts[id] = assign;
        left -= assign;
      }
    }
    return seatCounts;
  };

  const buildApplyBody = (s: any) => {
    const ov = overrides[s.id] || {};
    const opts: DispatchOption[] = s.dispatchOptions || [];
    const chosenKey = ov.optionKey;
    const chosen = chosenKey ? opts.find((o) => o.key === chosenKey) : opts.find((o) => o.eligible);
    const seatCounts = chosen ? buildSeatCountsForSuggestion(s, chosen) : undefined;

    if (chosen?.kind === "existing_trip" && chosen.tripId) {
      return { kind: "assign_trip", bookingIds: s.bookingIds, tripId: chosen.tripId, seatCounts };
    }

    if (chosen?.kind === "available_driver") {
      const driverId = chosen.driverId;
      const driver = (data?.availableDrivers || []).find((d: any) => d.id === driverId);
      const vehicle = driver?.vehicles?.[0];
      const totalSeats = Number(vehicle?.seats || chosen.vehicleSeats || s.vehicleSeats || s.totalSeats);
      return {
        kind: "new_trip",
        bookingIds: s.bookingIds,
        routeId: s.routeId,
        departureAt: s.departureAt,
        totalSeats,
        driverId: driverId || null,
        vehicleId: vehicle?.id ?? chosen.vehicleId ?? s.vehicleId ?? null,
        seatCounts,
      };
    }

    // Fallback (older API)
    if (s.kind === "assign_trip") return { kind: "assign_trip", bookingIds: s.bookingIds, tripId: s.tripId };
    const driver = (data?.availableDrivers || []).find((d: any) => d.id === s.driverId);
    const vehicle = driver?.vehicles?.[0];
    const totalSeats = Number(vehicle?.seats || s.vehicleSeats || s.totalSeats);
    return {
      kind: "new_trip",
      bookingIds: s.bookingIds,
      routeId: s.routeId,
      departureAt: s.departureAt,
      totalSeats,
      driverId: s.driverId || null,
      vehicleId: vehicle?.id ?? s.vehicleId ?? null,
    };
  };

  const applySuggestion = async (s: any) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await api.post("/admin/dispatch/apply", buildApplyBody(s));
      setMsg(r.data.message || "Đã xác nhận gợi ý.");
      clearSelection();
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Không áp dụng được gợi ý.");
    } finally {
      setBusy(false);
    }
  };

  const applyAllSuggestions = async () => {
    if (!suggestions.length) return;
    if (!confirm(`Xác nhận ${suggestions.length} gợi ý điều phối?`)) return;
    setBusy(true);
    setMsg("");
    let ok = 0;
    const errors: string[] = [];
    for (const s of suggestions) {
      const ov = overrides[s.id] || {};
      if (!canConfirmSuggestion(s, data, ov)) {
        errors.push(`${s.title}: không đủ ghế`);
        continue;
      }
      try {
        await api.post("/admin/dispatch/apply", buildApplyBody(s));
        ok++;
      } catch (e: any) {
        errors.push(e.response?.data?.message || s.title);
      }
    }
    setMsg(errors.length ? `Xong ${ok}/${suggestions.length}. Lỗi: ${errors.join("; ")}` : `Đã xác nhận ${ok} gợi ý.`);
    await load();
    setBusy(false);
  };

  const missingTimeSelected = useMemo(
    () => selectedBookings.filter((b: any) => !b.scheduledAt),
    [selectedBookings]
  );

  const assignToTrip = async (tripId: number) => {
    if (!selectedId) return setMsg("Chọn một đơn ở cột ① trước khi gán.");
    if (missingTimeSelected.length) {
      return setMsg(`${missingTimeSelected.length} đơn chưa có giờ đi — lưu giờ trước khi gán chuyến.`);
    }
    const trip = (data?.collectingTrips || []).find((t: any) => t.id === tripId);
    const avail = Number(trip?.availableSeats || 0);
    const { seatCounts, total } = computeAssignSeatCounts(selectedBookings, avail);
    if (!total) {
      return setMsg(trip ? `Chuyến ${trip.code} hết ghế hoặc đơn đã gán đủ.` : "Không gán được.");
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await api.post(`/admin/trips/${tripId}/add-bookings`, {
        bookingIds: Object.keys(seatCounts).map(Number),
        seatCounts,
      });
      setMsg(r.data.message || `Đã gán ${r.data.seatsAssigned ?? total} ghế, bỏ qua ${r.data.skipped || 0} đơn trùng.`);
      clearSelection();
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Không gán được đơn vào chuyến.");
    } finally {
      setBusy(false);
    }
  };

  const createTrip = async (driver?: any) => {
    if (!selectedId) return setMsg("Chọn một đơn ở cột ① trước khi tạo chuyến.");
    if (missingTimeSelected.length) {
      return setMsg(`${missingTimeSelected.length} đơn chưa có giờ đi — lưu giờ trước khi tạo chuyến.`);
    }
    const first = selectedBookings[0];
    if (!first?.routeId) return setMsg("Đơn đầu tiên chưa có tuyến, không tạo được chuyến.");

    const seatsNeeded = selectedBookings.reduce((s: number, b: any) => s + bookingRemainingSeatUnits(b), 0);
    const vehicle = driver?.vehicles?.[0];
    let totalSeats: number;
    let seatCounts: Record<number, number> | undefined;

    if (driver) {
      const fit = driverCreateCheck(driver);
      if (!vehicle) return setMsg("Tài xế chưa khai báo xe — không xác định được số chỗ.");
      if (!fit.ok) return setMsg(`Không gán được: ${fit.reason}`);
      totalSeats = Number(vehicle.seats);
      ({ seatCounts } = computeAssignSeatCounts(selectedBookings, totalSeats));
    } else {
      const fleetCaps = (data?.assignDriverCandidates || data?.availableDrivers || [])
        .map((d: any) => Number(d.vehicles?.[0]?.seats || 0))
        .filter((n: number) => n > 0);
      const maxCap = fleetCaps.length ? Math.max(...fleetCaps) : 7;
      totalSeats = maxCap;
      ({ seatCounts } = computeAssignSeatCounts(selectedBookings, maxCap));
    }
    if (!seatCounts || !Object.keys(seatCounts).length) {
      return setMsg("Không còn ghế cần gán trên đơn đã chọn.");
    }

    const departureAt = first.scheduledAt || new Date().toISOString();

    setBusy(true);
    setMsg("");
    try {
      const r = await api.post("/admin/dispatch/apply", {
        kind: "new_trip",
        bookingIds: Object.keys(seatCounts).map(Number),
        routeId: first.routeId,
        departureAt,
        totalSeats,
        driverId: driver?.id || null,
        vehicleId: vehicle?.id || null,
        seatCounts,
      });
      setMsg(r.data.message || "Đã tạo chuyến.");
      clearSelection();
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Không tạo được chuyến.");
    } finally {
      setBusy(false);
    }
  };

  const assignDriverToTrip = async (tripId: number) => {
    const driverId = Number(assignDriverPick[tripId]);
    if (!driverId) return setMsg("Chọn tài xế trước khi gán.");
    const driver = (data?.assignDriverCandidates || []).find((d: any) => d.id === driverId);
    const vehicleId = driver?.vehicles?.[0]?.id;
    setBusy(true);
    setMsg("");
    try {
      const r = await api.post("/admin/dispatch/apply", {
        kind: "assign_driver",
        tripId,
        driverId,
        vehicleId,
      });
      setMsg(r.data?.message || "Đã gán tài xế.");
      setAssignDriverPick((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Không gán được tài xế.");
    } finally {
      setBusy(false);
    }
  };

  const selectedSeatsNeeded = useMemo(
    () => selectedBookings.reduce((s: number, b: any) => s + bookingRemainingSeatUnits(b), 0),
    [selectedBookings]
  );

  const selectedRun = useMemo(
    () => (selectedBookings[0] ? bookingRunDirection(selectedBookings[0]) : null),
    [selectedBookings]
  );

  const tripAssignCheck = (t: any) => {
    if (!selectedId || !selectedBooking) return { ok: false, reason: "Chọn đơn trước" };
    if (!selectedBooking.routeId) return { ok: false, reason: "Đơn chưa có tuyến" };
    if (Number(t.routeId) !== Number(selectedBooking.routeId)) {
      return { ok: false, reason: "Khác tuyến với đơn đã chọn" };
    }
    if (selectedRun && !tripMatchesRun(t, selectedRun)) {
      return { ok: false, reason: tripMismatchReason(selectedRun) };
    }
    const st = String(t.status || "");
    if (st !== "COLLECTING" && st !== "READY") {
      return { ok: false, reason: "Chuyến không còn gom khách" };
    }
    const avail = Number(t.availableSeats || 0);
    if (avail <= 0) {
      return {
        ok: false,
        reason: Number(t.bookedSeats || 0) > 0 ? "Chuyến đã đủ khách" : "Hết ghế trống",
      };
    }
    const assign = Math.min(selectedSeatsNeeded, avail);
    if (assign <= 0) return { ok: false, reason: "Đơn đã gán đủ ghế" };
    return { ok: true as const, assign };
  };

  const driverCreateCheck = (d: any) => {
    const seatCheck = driverFitsSeats(d, selectedSeatsNeeded);
    if (!seatCheck.ok) return seatCheck;
    if (
      selectedRun &&
      selectedBooking?.routeId &&
      !driverMatchesBooking(d, selectedBooking.routeId, selectedRun)
    ) {
      return { ok: false, reason: driverMismatchReason(d, selectedRun, selectedBooking.routeId) };
    }
    return { ok: true as const };
  };

  /** Chỉ hiện chuyến cùng tuyến + chiều + còn ghế khi đã chọn đúng một đơn. */
  const tripsForManual = useMemo(() => {
    if (!selectedId || !selectedBooking?.routeId) return [];
    return (data?.collectingTrips || [])
      .map((t: any) => ({ t, check: tripAssignCheck(t) }))
      .filter((x: { check: { ok: boolean } }) => x.check.ok)
      .map((x: { t: any }) => x.t);
  }, [data?.collectingTrips, selectedId, selectedBooking, selectedSeatsNeeded, selectedRun]);

  const driversForManual = useMemo(() => {
    if (!selectedId || !selectedBooking?.routeId) return [];
    const pool = data?.assignDriverCandidates || data?.availableDrivers || [];
    return pool.filter((d: any) => driverCreateCheck(d).ok);
  }, [data?.assignDriverCandidates, data?.availableDrivers, selectedId, selectedBooking, selectedSeatsNeeded, selectedRun]);

  const manualTripHidden =
    selectedId && selectedBooking?.routeId
      ? (data?.collectingTrips?.length || 0) - tripsForManual.length
      : 0;
  const manualDriverHidden =
    selectedId && selectedBooking?.routeId
      ? (data?.assignDriverCandidates?.length || data?.availableDrivers?.length || 0) - driversForManual.length
      : 0;

  const assignCandidates = data?.assignDriverCandidates || data?.availableDrivers || [];

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="section-title">Điều phối chuyến</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
            Đơn và chuyến có giờ đi {dateRangeLabel}. Chọn <b>một đơn</b> cột ① → cột ② theo <b>tuyến đơn</b>, cột ③
            tài xế theo <b>chiều chạy</b> (mọi tuyến cùng chiều). Gán ghế từng phần nếu đơn nhiều chỗ.
          </p>
        </div>
        <Link to="/admin/dieu-phoi" className="btn-secondary w-full shrink-0 py-2.5 text-center text-sm sm:w-auto">
          Danh sách chuyến xe
        </Link>
      </div>

      {data?.seatSummary && (
        <div className="card mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Đơn chờ</p>
            <b className="text-xl">{data.seatSummary.orderCount}</b>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tổng khách chờ</p>
            <b className="text-xl text-cta">{data.seatSummary.passengerCount}</b>
          </div>
          <div>
            <p className="text-xs text-slate-500">Khách có tuyến (gom được)</p>
            <b className="text-xl">{data.seatSummary.routedPassengerCount}</b>
          </div>
          <div>
            <p className="text-xs text-slate-500">Đơn thiếu tuyến</p>
            <b className="text-xl text-red-600">{data.seatSummary.missingRouteCount}</b>
          </div>
        </div>
      )}

      <div className="card mt-5 !p-0 overflow-hidden">
        <button
          type="button"
          className="flex w-full min-h-[44px] items-center justify-between gap-3 px-4 py-3 text-left md:hidden"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink-900">
            <Filter size={18} className="shrink-0 text-brand-700" />
            Bộ lọc
          </span>
          <span className="text-xs font-semibold text-brand-700">{filtersOpen ? "Thu gọn" : "Mở"}</span>
        </button>

        <div className={`border-t border-slate-100 px-4 py-4 ${filtersOpen ? "block" : "hidden md:block"} md:border-t-0`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tuyến</span>
              <select
                className="input w-full"
                value={filterDraft.routeId || ""}
                onChange={(e) => setFilterDraft({ ...filterDraft, routeId: e.target.value || undefined })}
              >
                <option value="">Tất cả tuyến</option>
                {(data?.routes || []).map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Loại đơn</span>
              <select
                className="input w-full"
                value={filterDraft.type || ""}
                onChange={(e) => setFilterDraft({ ...filterDraft, type: e.target.value || undefined })}
              >
                <option value="">Tất cả loại</option>
                {SERVICE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 lg:col-span-3">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tìm kiếm</span>
              <input
                className="input w-full"
                placeholder="Mã đơn, SĐT, tên..."
                value={filterDraft.q || ""}
                onChange={(e) => setFilterDraft({ ...filterDraft, q: e.target.value || undefined })}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Chiều đi</span>
              <input
                className="input w-full"
                placeholder="Chiều đi"
                value={filterDraft.direction || ""}
                onChange={(e) => setFilterDraft({ ...filterDraft, direction: e.target.value || undefined })}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-3">
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Từ ngày (giờ đi)</span>
                <GregorianDateInput
                  clearable={false}
                  value={filterDraft.from || todayLocalDateValue()}
                  onChange={(value) => setFilterDraft({ ...filterDraft, from: value || todayLocalDateValue() })}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Đến ngày (giờ đi)</span>
                <GregorianDateInput
                  clearable={false}
                  value={filterDraft.to || todayLocalDateValue()}
                  onChange={(value) => setFilterDraft({ ...filterDraft, to: value || todayLocalDateValue() })}
                />
              </label>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="btn-primary min-h-[44px] w-full py-2.5 sm:w-auto sm:min-w-[10rem]"
              disabled={loading}
              onClick={applyFilters}
            >
              {loading ? "Đang tải…" : "Áp dụng lọc"}
            </button>
            <button
              type="button"
              className="btn-secondary min-h-[44px] w-full py-2.5 sm:w-auto"
              disabled={loading}
              onClick={clearFilters}
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      {msg && <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-brand-900">{msg}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className="btn-secondary min-h-[44px] w-full py-2.5 sm:w-auto"
          disabled={busy || !selectedId}
          onClick={() => createTrip()}
          title="Tạo chuyến đang gom, chưa gán tài xế — gán sau ở cột ②"
        >
          Tạo chuyến chưa tài xế
        </button>
        {selectedId && selectedBooking && (
          <span className="min-w-0 text-sm leading-relaxed text-slate-600">
            Đơn <b>{selectedBooking.code}</b> · <b>{selectedSeatsNeeded}</b> ghế còn gán ·{" "}
            {routePrimaryLabel(selectedBooking.route, "Chưa chọn tuyến")}
            <button type="button" className="ml-2 font-semibold text-brand-800 underline" onClick={clearSelection}>
              Bỏ chọn
            </button>
          </span>
        )}
        <button
          type="button"
          className="min-h-[44px] w-full text-sm font-semibold text-brand-800 underline sm:ml-auto sm:w-auto"
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual ? "Ẩn 3 cột điều phối" : "Hiện 3 cột điều phối"}
        </button>
      </div>

      {showManual && (
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="card min-w-0 !p-0 overflow-hidden">
            <div className="border-b bg-slate-50 px-3 py-3 sm:px-4">
              <h2 className="text-base font-bold leading-snug break-words sm:text-lg">
                ① Đơn chưa gán — chọn một ({data?.bookingsMeta?.total ?? data?.unassignedBookings?.length ?? 0}) ·{" "}
                {dateRangeLabel}
                {(data?.unassignedBookings || []).some((b: any) => !b.scheduledAt) && (
                  <span className="ml-2 text-sm font-semibold text-amber-700">
                    • {(data?.unassignedBookings || []).filter((b: any) => !b.scheduledAt).length} thiếu giờ đi (trang này)
                  </span>
                )}
              </h2>
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
              {(data?.unassignedBookings || []).map((b: any) => (
                <label
                  key={b.id}
                  className={`block cursor-pointer rounded-2xl border p-3 ${selectedId === b.id ? "border-brand-700 bg-blue-50 ring-1 ring-brand-600" : "border-slate-200"}`}
                >
                  <div className="flex gap-3">
                    <input
                      type="radio"
                      name="dispatch-selected-booking"
                      checked={selectedId === b.id}
                      onChange={() => selectBooking(b)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <b>{b.code}</b>
                        <span className="badge">{bookingStatus(b.status)}</span>
                      </div>
                      <p className={`mt-1 text-sm ${b.scheduledAt ? "text-slate-600" : "font-semibold text-amber-700"}`}>
                        {fmtTime(b.scheduledAt)} | <b>{routePrimaryLabel(b.route, b.direction || "Chưa chọn tuyến")}</b>
                      </p>
                      {!b.scheduledAt && (
                        <div className="mt-2 flex flex-wrap items-end gap-2" onClick={(e) => e.preventDefault()}>
                          <div>
                            <GregorianDateTimeInput
                              value={timeEdits[b.id] ?? ""}
                              onChange={(value) => setTimeEdits((prev) => ({ ...prev, [b.id]: value }))}
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-primary py-1 text-sm"
                            disabled={busy}
                            onClick={() => saveBookingTime(b.id)}
                          >
                            Lưu giờ
                          </button>
                        </div>
                      )}
                      <p className="text-sm text-slate-600">
                        {b.pickupAddress || "—"} → {b.dropoffAddress || "—"}
                      </p>
                      <p className="mt-1 text-sm">
                        {serviceTypeLabel[b.type] || b.type} • {bookingCapacityLabel(b)} •{" "}
                        <b className="text-cta">{formatMoney(b.finalTotal || b.estimatedTotal)}</b>
                      </p>
                      <p className="text-xs text-slate-500">
                        {b.customerName} • {b.customerPhone}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
              {!data?.unassignedBookings?.length && (
                <p className="p-4 text-sm text-slate-500">Không có đơn chờ gán có giờ đi {dateRangeLabel}.</p>
              )}
            </div>
            <ColumnPager
              meta={data?.bookingsMeta}
              disabled={loading || busy}
              onPage={(p) => setColumnPage("bookingsPage", p)}
            />
          </section>

          <section className="card min-w-0 !p-0 overflow-hidden">
            <div className="border-b bg-slate-50 px-3 py-3 sm:px-4">
              <h2 className="text-base font-bold leading-snug break-words sm:text-lg">
                ② Chuyến đang gom · {dateRangeLabel}
                {selectedBooking?.routeId ? (
                  <span className="ml-1 text-sm font-semibold text-brand-800">
                    · {routePrimaryLabel(selectedBooking.route, `tuyến #${selectedBooking.routeId}`)} ({tripsForManual.length} phù hợp)
                  </span>
                ) : (
                  <span className="ml-1 text-sm font-normal text-slate-500">· chọn đơn cột ①</span>
                )}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Chỉ chuyến <b>cùng tuyến</b>, <b>còn ghế trống</b>. Không hiện chuyến đã đủ khách. Gom thêm vào chuyến
                đang trống chỗ hoặc tạo chuyến mới (③ tài xế rảnh).
              </p>
              {manualTripHidden > 0 && (
                <p className="text-xs text-slate-500">Đã ẩn {manualTripHidden} chuyến hết ghế hoặc sai chiều.</p>
              )}
              {selectedId && !selectedBooking?.routeId && (
                <p className="text-xs font-semibold text-amber-800">Đơn chưa có tuyến — không lọc được chuyến.</p>
              )}
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
              {tripsForManual.map((t: any) => {
                const eligibleDrivers = driversEligibleForTrip(t, assignCandidates, selectedBooking);
                return (
                <div
                  key={t.id}
                  className={`rounded-2xl border p-3 ${!t.driverId ? "border-amber-300 bg-amber-50/40" : "border-slate-200"}`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <b className="min-w-0 break-words">{t.code}</b>
                    <span className="badge shrink-0">{tripStatus(t.status)}</span>
                  </div>
                  <div className="mt-1">
                    <RouteCell route={t.route} className="text-sm" />
                  </div>
                  <p className="text-sm text-slate-600">{fmtDepartureTime(t.departureAt)}</p>
                  <p className="text-sm font-medium">
                    {t.driver?.name || (
                      <span className="text-amber-800">Chưa gán tài xế</span>
                    )}{" "}
                    {t.vehicle?.licensePlate
                      ? `• ${t.vehicle.licensePlate}`
                      : t.vehicle?.vehicleType
                        ? `• ${t.vehicle.vehicleType}`
                        : !t.driverId
                          ? "• chưa có biển số"
                          : ""}
                  </p>
                  <p className="mt-2 text-sm">
                    Ghế <b>{t.bookedSeats}/{t.totalSeats}</b>, còn <b>{t.availableSeats}</b>
                  </p>
                  {!t.driverId && (
                    <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-white p-2">
                      <p className="text-xs font-bold text-amber-900">Gán tài xế cho chuyến này</p>
                      <select
                        className="input py-1.5 text-sm"
                        value={assignDriverPick[t.id] || ""}
                        onChange={(e) => setAssignDriverPick((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      >
                        <option value="">— Chọn tài xế rảnh —</option>
                        {eligibleDrivers.map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.name} · {d.vehicles?.[0]?.seats} chỗ
                            {d.vehicles?.[0]?.licensePlate ? ` · ${d.vehicles[0].licensePlate}` : ""}
                          </option>
                        ))}
                      </select>
                      {!eligibleDrivers.length && (
                        <p className="text-xs text-red-600">Không có tài xế rảnh đủ chỗ / đúng chiều.</p>
                      )}
                      <button
                        type="button"
                        className="btn-primary w-full py-2 text-sm"
                        disabled={busy || !assignDriverPick[t.id]}
                        onClick={() => assignDriverToTrip(t.id)}
                      >
                        Xác nhận gán tài xế
                      </button>
                    </div>
                  )}
                  <button
                    className="btn-primary mt-3 w-full py-2"
                    disabled={busy || !selectedId}
                    onClick={() => assignToTrip(t.id)}
                  >
                    {(() => {
                      const { total } = computeAssignSeatCounts(selectedBookings, Number(t.availableSeats || 0));
                      const partial = total > 0 && total < selectedSeatsNeeded;
                      return partial
                        ? `Gán ${total}/${selectedSeatsNeeded} ghế vào chuyến`
                        : `Gán đơn vào chuyến (${selectedSeatsNeeded} ghế)`;
                    })()}
                  </button>
                </div>
              );
              })}
              {!tripsForManual.length && (
                <p className="p-4 text-sm text-slate-500">
                  {!selectedId
                    ? "Chọn một đơn ở cột ① để xem chuyến cùng tuyến."
                    : !selectedBooking?.routeId
                      ? "Đơn chưa có tuyến — sửa đơn hoặc chọn đơn khác."
                      : `Không có chuyến còn chỗ khởi hành ${dateRangeLabel} — tạo chuyến mới với tài xế rảnh (③).`}
                </p>
              )}
            </div>
            <ColumnPager meta={data?.tripsMeta} disabled={loading || busy} onPage={(p) => setColumnPage("tripsPage", p)} />
          </section>

          <section className="card min-w-0 !p-0 overflow-hidden">
            <div className="border-b bg-slate-50 px-3 py-3 sm:px-4">
              <h2 className="text-base font-bold leading-snug break-words sm:text-lg">
                ③ Tài xế rảnh
                {selectedBooking?.routeId ? (
                  <span className="ml-1 text-sm font-semibold text-brand-800">
                    · đúng chiều ({driversForManual.length} tài)
                  </span>
                ) : (
                  <span className="ml-1 text-sm font-normal text-slate-500">· chọn đơn cột ①</span>
                )}
              </h2>
              <p className="text-xs text-slate-600">
                {selectedId
                  ? `Tài xế Rảnh, đúng chiều, xe đủ ${selectedSeatsNeeded} ghế — đơn ${selectedBooking?.code || ""}`
                  : "Chọn đơn để lọc tài xế đúng chiều chạy"}
              </p>
              {manualDriverHidden > 0 && (
                <p className="text-xs text-slate-500">Đã ẩn {manualDriverHidden} tài xế xe nhỏ hoặc không khớp chiều.</p>
              )}
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
              {driversForManual.map((d: any) => (
                <div key={d.id} className="rounded-2xl border border-slate-200 p-3">
                  <b>{d.name}</b>
                  <p className="text-sm text-slate-600">{d.phone}</p>
                  <p className="text-sm text-slate-600">
                    {d.runDirection === "SG_TO_PROVINCE" || d.runDirection === "PROVINCE_TO_SG"
                      ? runDirectionLabel(d.runDirection)
                      : d.direction || d.location || "Chưa chọn chiều"}
                  </p>
                  <p className="mt-2 text-sm">
                    {d.vehicles?.[0]?.vehicleType || "Chưa có xe"} • xe <b>{d.vehicles?.[0]?.seats ?? "—"}</b> chỗ
                    {d.seatsFree != null && (
                      <span className="text-slate-500"> • báo rảnh ghép {d.seatsFree}</span>
                    )}
                  </p>
                  <button
                    className="btn-secondary mt-3 w-full py-2"
                    disabled={busy || !selectedId}
                    onClick={() => createTrip(d)}
                  >
                    Tạo chuyến + gán tài ({d.vehicles?.[0]?.seats || "?"} chỗ)
                  </button>
                </div>
              ))}
              {!driversForManual.length && (
                <p className="p-4 text-sm text-slate-500">
                  {!selectedId
                    ? "Chọn một đơn ở cột ① để xem tài xế phù hợp."
                    : !selectedBooking?.routeId
                      ? "Đơn chưa có tuyến."
                      : "Không có tài xế rảnh đủ ghế / đúng chiều — thử tạo chuyến chưa tài xế."}
                </p>
              )}
            </div>
            <ColumnPager
              meta={data?.driversMeta}
              disabled={loading || busy}
              onPage={(p) => setColumnPage("driversPage", p)}
            />
          </section>
        </div>
      )}

      <section className="card mt-8 min-w-0 !p-0 overflow-hidden">
        <div className="border-b bg-slate-50 px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-snug break-words sm:text-lg">
                ④ Đã điều phối ({data?.dispatchedMeta?.total ?? data?.dispatchedBookings?.length ?? 0}) · {dateRangeLabel}
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Đơn đã gán ít nhất một phần lên chuyến trong khoảng ngày lọc. Xem chi tiết chuyến tại{" "}
                <Link to="/admin/dieu-phoi" className="font-semibold text-brand-700 underline">
                  Danh sách chuyến xe
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto p-3">
          {(data?.dispatchedBookings || []).map((b: any) => {
            const tripLines = (b.tripBookings || [])
              .map((tb: any) => {
                const trip = tb.trip;
                if (!trip?.code) return null;
                const seats = Number(tb.seatCount || 0);
                const driver = trip.driver?.name || "Chưa gán tài xế";
                return `${trip.code} (${seats} ghế · ${driver})`;
              })
              .filter(Boolean);
            return (
              <div key={b.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b>{b.code}</b>
                  <span className="badge badge-success">{bookingStatus(b.status)}</span>
                </div>
                <p className={`mt-1 text-sm ${b.scheduledAt ? "text-slate-600" : "text-slate-500"}`}>
                  {fmtTime(b.scheduledAt)} | <b>{routePrimaryLabel(b.route, b.direction || "Chưa chọn tuyến")}</b>
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {bookingCapacityLabel(b)}
                  {b.dispatchSeatRemaining != null && Number(b.dispatchSeatRemaining) > 0 && (
                    <span className="text-amber-800"> · còn {b.dispatchSeatRemaining} ghế chưa gán</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Chuyến: {tripLines.length ? tripLines.join(" · ") : "—"}
                </p>
                <p className="text-xs text-slate-500">
                  {b.customerName} • {b.customerPhone}
                </p>
              </div>
            );
          })}
          {!data?.dispatchedBookings?.length && (
            <p className="p-4 text-sm text-slate-500">
              Chưa có đơn nào được gán chuyến có giờ đi {dateRangeLabel}. Gán ở 3 cột trên hoặc xác nhận gợi ý.
            </p>
          )}
        </div>
        <ColumnPager
          meta={data?.dispatchedMeta}
          disabled={loading || busy}
          onPage={(p) => setColumnPage("dispatchedPage", p)}
        />
      </section>

      <section className="mt-8 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug break-words text-brand-900 sm:text-xl">
              Gợi ý tự động ({data?.suggestionsMeta?.total ?? suggestions.length}) · {dateRangeLabel}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Gợi ý theo <b>sức chỗ từng xe</b> cho đơn có giờ đi {dateRangeLabel} — đơn lớn có thể gán nhiều lần cho
              đến khi hết ghế.
            </p>
          </div>
          {suggestions.length > 0 && (
            <button
              className="btn-primary min-h-[44px] w-full shrink-0 py-2.5 sm:w-auto"
              disabled={busy}
              onClick={applyAllSuggestions}
            >
              Xác nhận trang gợi ý ({suggestions.length})
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3">
          {suggestions.map((s: any) => {
            const ov = overrides[s.id] || {};
            const ok = canConfirmSuggestion(s, data, ov);
            const dispatchOptions: DispatchOption[] = (s.dispatchOptions || []).filter((o: DispatchOption) => o.eligible);
            const selectedKey =
              ov.optionKey && dispatchOptions.some((o) => o.key === ov.optionKey)
                ? ov.optionKey
                : dispatchOptions[0]?.key ?? "";
            const lines: { code: string; passengerCount: number; scheduledAt?: string | null }[] =
              s.bookings ||
              s.bookingIds.map((id: number) => {
                const b = (data?.unassignedBookings || []).find((x: any) => x.id === id);
                return {
                  code: b?.code || String(id),
                  passengerCount: bookingSeatUnits(b),
                  scheduledAt: b?.scheduledAt,
                };
              });

            return (
              <div key={s.id} className="card min-w-0 border-2 border-brand-200 bg-gradient-to-br from-blue-50/80 to-white">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <b className="text-lg">{s.title}</b>
                    <p className="mt-1 text-xs font-medium text-brand-800">
                      {s.orderTypeLabel || s.orderType} • Đi từ <b>{s.departureEndpoint}</b> • {s.routeName}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-800">Giờ đi gợi ý: {fmtTime(s.departureAt)}</p>
                    <p className="mt-1 text-sm text-slate-600">{s.reason}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-xl bg-white px-3 py-1 font-semibold shadow-sm">
                        Ghế còn gán: <b className="text-cta">{s.seatsNeeded}</b>
                      </span>
                      <span className="rounded-xl bg-white px-3 py-1 font-semibold shadow-sm">
                        Xe: <b>{s.vehicleSeats}</b> chỗ
                        {s.vehicleType ? ` (${s.vehicleType})` : ""}
                      </span>
                      <span className="rounded-xl bg-white px-3 py-1 font-semibold shadow-sm">
                        Sau gán còn: <b>{s.seatsRemainingAfter}</b> chỗ
                      </span>
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[12rem] text-xs">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="py-1 pr-2">Mã đơn</th>
                            <th className="py-1 pr-2">Giờ đi</th>
                            <th className="py-1">Chỗ / đơn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((row) => (
                            <tr key={row.code} className="border-t border-slate-100">
                              <td className="py-1 pr-2 font-medium">{row.code}</td>
                              <td className={`py-1 pr-2 ${row.scheduledAt ? "" : "font-semibold text-amber-700"}`}>
                                {fmtTime(row.scheduledAt)}
                              </td>
                              <td className="py-1">{row.passengerCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!ok && (
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        Không còn phương án — thêm chuyến/tài xế hoặc đợi ghế trống.
                      </p>
                    )}
                  </div>
                  <button
                    className="btn-primary min-h-[44px] w-full shrink-0 py-2.5 sm:w-auto"
                    disabled={busy || !ok}
                    onClick={() => applySuggestion(s)}
                  >
                    Xác nhận
                  </button>
                </div>

                <div className="mt-4 grid gap-3 border-t border-brand-100 pt-4 md:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Phương án điều phối
                    <select
                      className="input mt-1"
                      value={selectedKey}
                      disabled={!dispatchOptions.length}
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          [s.id]: { ...prev[s.id], optionKey: e.target.value || undefined },
                        }))
                      }
                    >
                      {dispatchOptions.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                      {!dispatchOptions.length && (
                        <option value="">
                          Không có chuyến/tài còn ghế phù hợp
                        </option>
                      )}
                    </select>
                  </label>
                  <div className="text-sm text-slate-600">
                    {dispatchOptions.length > 0 && (
                      <p>
                        Mặc định:{" "}
                        <b>{dispatchOptions.find((o) => o.key === selectedKey)?.label || dispatchOptions[0].label}</b>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!suggestions.length && (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Không có gợi ý cho đơn có giờ đi {dateRangeLabel} (không đơn chờ hoặc thiếu tuyến). Dùng điều phối thủ
              công nếu cần.
            </p>
          )}
        </div>
        <div className="mt-4">
          <ColumnPager
            meta={data?.suggestionsMeta}
            disabled={loading || busy}
            onPage={(p) => setColumnPage("suggestionsPage", p)}
          />
        </div>
      </section>
    </div>
  );
}
