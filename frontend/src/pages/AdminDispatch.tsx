import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatMoney } from "../lib/api";
import { fmtDepartureTime, toDatetimeLocalValue } from "../lib/datetime";
import { SERVICE_TYPE_OPTIONS, serviceTypeLabel } from "../lib/serviceTypes";
import { bookingSeatUnits, bookingCapacityLabel } from "../lib/bookingSeats";
import {
  bookingRunDirection,
  driverMatchesRun,
  driverMismatchReason,
  tripMatchesRun,
  tripMismatchReason,
} from "../lib/runDirection";
import { bookingStatus, tripStatus } from "../lib/vi";
import { GregorianDateInput, GregorianDateTimeInput } from "../components/ui/GregorianDateInputs";

const fmtTime = fmtDepartureTime;

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
  label: string;
};

type SuggestionOverrides = Record<string, { optionKey?: string }>;

function driverFitsSeats(d: any, seatsNeeded: number) {
  const v = d.vehicles?.[0];
  if (!v) return { ok: false, reason: "Chưa khai báo xe" };
  const cap = Number(v.seats);
  if (cap < seatsNeeded) return { ok: false, reason: `Xe ${cap} chỗ, cần ${seatsNeeded}` };
  return { ok: true as const };
}

function canConfirmSuggestion(s: any, data: any, ov: SuggestionOverrides[string]) {
  const opts: DispatchOption[] = s.dispatchOptions || [];
  const chosenKey = ov?.optionKey;
  const chosen = chosenKey ? opts.find((o) => o.key === chosenKey) : opts.find((o) => o.eligible);
  if (chosen) return !!chosen.eligible;

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
  const [data, setData] = useState<any>(null);
  const [filters, setFilters] = useState<any>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [overrides, setOverrides] = useState<SuggestionOverrides>({});
  const [showManual, setShowManual] = useState(true);
  const [timeEdits, setTimeEdits] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    return api.get("/admin/dispatch", { params: filters }).then((r) => {
      setData(r.data);
      setOverrides({});
    });
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const suggestions = useMemo(() => data?.suggestions || [], [data]);

  const selectedBookings = useMemo(
    () => (data?.unassignedBookings || []).filter((b: any) => selected.includes(b.id)),
    [data, selected]
  );

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

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

  const buildApplyBody = (s: any) => {
    const ov = overrides[s.id] || {};
    const opts: DispatchOption[] = s.dispatchOptions || [];
    const chosenKey = ov.optionKey;
    const chosen = chosenKey ? opts.find((o) => o.key === chosenKey) : opts.find((o) => o.eligible);

    if (chosen?.kind === "existing_trip" && chosen.tripId) {
      return { kind: "assign_trip", bookingIds: s.bookingIds, tripId: chosen.tripId };
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
      setSelected([]);
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
    if (!selected.length) return setMsg("Chọn ít nhất 1 đơn trước khi gán.");
    if (missingTimeSelected.length) {
      return setMsg(`${missingTimeSelected.length} đơn chưa có giờ đi — lưu giờ trước khi gán chuyến.`);
    }
    const trip = (data?.collectingTrips || []).find((t: any) => t.id === tripId);
    const seatsNeeded = selectedBookings.reduce((s: number, b: any) => s + bookingSeatUnits(b), 0);
    if (trip && Number(trip.availableSeats) < seatsNeeded) {
      return setMsg(`Chuyến ${trip.code} chỉ còn ${trip.availableSeats} ghế, không gán thêm ${seatsNeeded} khách.`);
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await api.post(`/admin/trips/${tripId}/add-bookings`, { bookingIds: selected });
      setMsg(r.data.message || `Đã gán ${r.data.added} đơn, bỏ qua ${r.data.skipped || 0} đơn trùng.`);
      setSelected([]);
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Không gán được đơn vào chuyến.");
    } finally {
      setBusy(false);
    }
  };

  const createTrip = async (driver?: any) => {
    if (!selected.length) return setMsg("Chọn ít nhất 1 đơn trước khi tạo chuyến.");
    if (missingTimeSelected.length) {
      return setMsg(`${missingTimeSelected.length} đơn chưa có giờ đi — lưu giờ trước khi tạo chuyến.`);
    }
    const first = selectedBookings[0];
    if (!first?.routeId) return setMsg("Đơn đầu tiên chưa có tuyến, không tạo được chuyến.");

    const seatsNeeded = selectedBookings.reduce((s: number, b: any) => s + bookingSeatUnits(b), 0);
    const vehicle = driver?.vehicles?.[0];
    let totalSeats: number;

    if (driver) {
      const fit = driverCreateCheck(driver);
      if (!vehicle) return setMsg("Tài xế chưa khai báo xe — không xác định được số chỗ.");
      if (!fit.ok) return setMsg(`Không gán được: ${fit.reason}`);
      totalSeats = Number(vehicle.seats);
    } else {
      const fleetCaps = (data?.availableDrivers || [])
        .map((d: any) => Number(d.vehicles?.[0]?.seats || 0))
        .filter((n: number) => n > 0);
      const maxCap = fleetCaps.length ? Math.max(...fleetCaps) : 0;
      if (maxCap > 0 && seatsNeeded > maxCap) {
        return setMsg(
          `Đã chọn ${seatsNeeded} khách/ghế nhưng xe rảnh lớn nhất chỉ ${maxCap} chỗ — tách đơn hoặc chờ tài xế xe lớn hơn.`
        );
      }
      totalSeats = Math.max(seatsNeeded, 7);
    }

    const departureAt = first.scheduledAt || new Date().toISOString();

    setBusy(true);
    setMsg("");
    try {
      const r = await api.post("/admin/dispatch/apply", {
        kind: "new_trip",
        bookingIds: selected,
        routeId: first.routeId,
        departureAt,
        totalSeats,
        driverId: driver?.id || null,
        vehicleId: vehicle?.id || null,
      });
      setMsg(r.data.message || "Đã tạo chuyến.");
      setSelected([]);
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Không tạo được chuyến.");
    } finally {
      setBusy(false);
    }
  };

  const selectedSeatsNeeded = useMemo(
    () => selectedBookings.reduce((s: number, b: any) => s + bookingSeatUnits(b), 0),
    [selectedBookings]
  );

  const selectedRun = useMemo(
    () => (selectedBookings[0] ? bookingRunDirection(selectedBookings[0]) : null),
    [selectedBookings]
  );

  const tripAssignCheck = (t: any) => {
    if (!selected.length) return { ok: false, reason: "Chọn đơn trước" };
    if (Number(t.routeId) !== Number(selectedBookings[0]?.routeId)) {
      return { ok: false, reason: "Khác tuyến với đơn đã chọn" };
    }
    if (selectedRun && !tripMatchesRun(t, selectedRun)) {
      return { ok: false, reason: tripMismatchReason(selectedRun) };
    }
    const avail = Number(t.availableSeats || 0);
    if (avail < selectedSeatsNeeded) {
      return { ok: false, reason: `Chỉ còn ${avail} ghế, cần ${selectedSeatsNeeded}` };
    }
    return { ok: true as const };
  };

  const driverCreateCheck = (d: any) => {
    const seatCheck = driverFitsSeats(d, selectedSeatsNeeded);
    if (!seatCheck.ok) return seatCheck;
    if (selectedRun && !driverMatchesRun(d, selectedRun)) {
      return { ok: false, reason: driverMismatchReason(d, selectedRun) };
    }
    return { ok: true as const };
  };

  const tripsForRoute = (routeId: number, seatsNeeded: number, run: ReturnType<typeof bookingRunDirection> | null) =>
    (data?.collectingTrips || []).filter(
      (t: any) =>
        t.routeId === routeId &&
        Number(t.availableSeats) >= seatsNeeded &&
        (!run || tripMatchesRun(t, run))
    );

  /** Khi đã chọn đơn: cột ②③ chỉ hiện chuyến/tài gán được (đủ ghế, đúng tuyến/chiều). */
  const tripsForManual = useMemo(() => {
    const all = data?.collectingTrips || [];
    if (!selected.length) return all;
    return all.filter((t: any) => tripAssignCheck(t).ok);
  }, [data?.collectingTrips, selected.length, selectedBookings, selectedSeatsNeeded, selectedRun]);

  const driversForManual = useMemo(() => {
    const all = data?.availableDrivers || [];
    if (!selected.length) return all;
    return all.filter((d: any) => driverCreateCheck(d).ok);
  }, [data?.availableDrivers, selected.length, selectedBookings, selectedSeatsNeeded, selectedRun]);

  const manualTripHidden =
    selected.length > 0 ? (data?.collectingTrips?.length || 0) - tripsForManual.length : 0;
  const manualDriverHidden =
    selected.length > 0 ? (data?.availableDrivers?.length || 0) - driversForManual.length : 0;

  return (
    <div>
      <h1 className="section-title">Điều phối chuyến</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Mỗi <b>đơn</b> gán nguyên khối (10 ghế = cần một lần ≥ 10 chỗ trống). Muốn chia nhiều chuyến: chọn <b>nhiều đơn nhỏ</b> hoặc tách đơn ở quản lý đặt chỗ.
        Khi đã chọn đơn, dropdown và cột ②③ chỉ hiện chuyến/tài <b>đủ ghế</b> cho tổng đã chọn ({selectedSeatsNeeded || "—"} ghế).
      </p>

      {data?.seatSummary && (
        <div className="card mt-4 grid gap-2 sm:grid-cols-4">
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

      <div className="card mt-5 grid gap-3 md:grid-cols-6">
        <select className="input" onChange={(e) => setFilters({ ...filters, routeId: e.target.value || undefined })}>
          <option value="">Tất cả tuyến</option>
          {(data?.routes || []).map((r: any) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select className="input" onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}>
          <option value="">Loại đơn</option>
          {SERVICE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <GregorianDateInput value={filters.from || ""} onChange={(value) => setFilters({ ...filters, from: value || undefined })} />
        <input className="input" placeholder="Tìm mã/SĐT/tên" onChange={(e) => setFilters({ ...filters, q: e.target.value || undefined })} />
        <input className="input" placeholder="Chiều đi" onChange={(e) => setFilters({ ...filters, direction: e.target.value || undefined })} />
        <button className="btn-secondary" onClick={load}>
          Lọc
        </button>
      </div>

      {msg && <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-brand-900">{msg}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary py-2"
          disabled={busy || !selected.length}
          onClick={() => createTrip()}
        >
          Tạo chuyến từ đơn đã chọn ({selected.length})
        </button>
        {selected.length > 0 && (
          <span className="text-sm text-slate-600">
            Đã chọn{" "}
            <b>{selectedBookings.reduce((s: number, b: any) => s + bookingSeatUnits(b), 0)}</b> khách/ghế
          </span>
        )}
        <button
          type="button"
          className="ml-auto text-sm font-semibold text-brand-800 underline"
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual ? "Ẩn 3 cột điều phối" : "Hiện 3 cột điều phối"}
        </button>
      </div>

      {showManual && (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <section className="card !p-0 overflow-hidden">
            <div className="border-b bg-slate-50 px-4 py-3">
              <h2 className="font-bold">
                ① Đơn chưa gán ({data?.unassignedBookings?.length || 0})
                {(data?.unassignedBookings || []).some((b: any) => !b.scheduledAt) && (
                  <span className="ml-2 text-sm font-semibold text-amber-700">
                    • {(data?.unassignedBookings || []).filter((b: any) => !b.scheduledAt).length} thiếu giờ đi
                  </span>
                )}
              </h2>
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
              {(data?.unassignedBookings || []).map((b: any) => (
                <label
                  key={b.id}
                  className={`block cursor-pointer rounded-2xl border p-3 ${selected.includes(b.id) ? "border-brand-700 bg-blue-50" : "border-slate-200"}`}
                >
                  <div className="flex gap-3">
                    <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <b>{b.code}</b>
                        <span className="badge">{bookingStatus(b.status)}</span>
                      </div>
                      <p className={`mt-1 text-sm ${b.scheduledAt ? "text-slate-600" : "font-semibold text-amber-700"}`}>
                        {fmtTime(b.scheduledAt)} | <b>{b.route?.direction || b.route?.name || b.direction || "Chưa chọn tuyến"}</b>
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
              {!data?.unassignedBookings?.length && <p className="p-4 text-sm text-slate-500">Không có đơn chờ gán.</p>}
            </div>
          </section>

          <section className="card !p-0 overflow-hidden">
            <div className="border-b bg-slate-50 px-4 py-3">
              <h2 className="font-bold">
                ② Chuyến đủ ghế ({tripsForManual.length}
                {selected.length > 0 ? ` / ${data?.collectingTrips?.length || 0} đang gom` : ""})
              </h2>
              {manualTripHidden > 0 && (
                <p className="text-xs text-slate-500">Đã ẩn {manualTripHidden} chuyến không đủ ghế hoặc khác tuyến/chiều.</p>
              )}
            </div>
            <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
              {tripsForManual.map((t: any) => (
                <div key={t.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <b>{t.code}</b>
                    <span className="badge">{tripStatus(t.status)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{t.route?.direction || t.route?.name}</p>
                  <p className="text-sm text-slate-600">{fmtDepartureTime(t.departureAt)}</p>
                  <p className="text-sm">
                    {t.driver?.name || "Chưa gán tài xế"} {t.vehicle?.vehicleType ? `• ${t.vehicle.vehicleType}` : ""}
                  </p>
                  <p className="mt-2 text-sm">
                    Ghế <b>{t.bookedSeats}/{t.totalSeats}</b>, còn <b>{t.availableSeats}</b>
                  </p>
                  <button
                    className="btn-primary mt-3 w-full py-2"
                    disabled={busy || !selected.length}
                    onClick={() => assignToTrip(t.id)}
                  >
                    Gán đơn đã chọn ({selectedSeatsNeeded} ghế)
                  </button>
                </div>
              ))}
              {!tripsForManual.length && (
                <p className="p-4 text-sm text-slate-500">
                  {selected.length
                    ? `Không có chuyến còn ≥ ${selectedSeatsNeeded} ghế — tạo chuyến mới (③) hoặc bỏ bớt đơn.`
                    : "Chưa có chuyến đang gom."}
                </p>
              )}
            </div>
          </section>

          <section className="card !p-0 overflow-hidden">
            <div className="border-b bg-slate-50 px-4 py-3">
              <h2 className="font-bold">
                ③ Tài xế đủ xe ({driversForManual.length}
                {selected.length > 0 ? ` / ${data?.availableDrivers?.length || 0} rảnh` : ""})
              </h2>
              <p className="text-xs text-slate-600">
                {selected.length
                  ? `Xe ≥ ${selectedSeatsNeeded} chỗ, đúng tuyến/chiều`
                  : "Trạng thái Rảnh, báo còn ghế, chưa có chuyến đang gom/chạy"}
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
                  <p className="text-sm text-slate-600">Đang ở: {d.location || "Chưa cập nhật"}</p>
                  <p className="mt-2 text-sm">
                    {d.vehicles?.[0]?.vehicleType || "Chưa có xe"} • xe <b>{d.vehicles?.[0]?.seats ?? "—"}</b> chỗ
                    {d.seatsFree != null && (
                      <span className="text-slate-500"> • báo rảnh ghép {d.seatsFree}</span>
                    )}
                  </p>
                  <button
                    className="btn-secondary mt-3 w-full py-2"
                    disabled={busy || !selected.length}
                    onClick={() => createTrip(d)}
                  >
                    Tạo chuyến ({d.vehicles?.[0]?.seats || "?"} chỗ)
                  </button>
                </div>
              ))}
              {!driversForManual.length && (
                <p className="p-4 text-sm text-slate-500">
                  {selected.length
                    ? `Không có tài xế xe ≥ ${selectedSeatsNeeded} chỗ — tạo chuyến không gán tài hoặc đợi xe lớn hơn.`
                    : "Không có tài xế rảnh."}
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-brand-900">Gợi ý tự động ({suggestions.length})</h2>
            <p className="text-sm text-slate-600">
              Tách theo <b>sức chứa từng xe</b> — không nhét hết 10 khách vào một gợi ý nếu xe chỉ 7 chỗ.
            </p>
          </div>
          {suggestions.length > 0 && (
            <button className="btn-primary py-2" disabled={busy} onClick={applyAllSuggestions}>
              Xác nhận tất cả
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
              <div key={s.id} className="card border-2 border-brand-200 bg-gradient-to-br from-blue-50/80 to-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <b className="text-lg">{s.title}</b>
                    <p className="mt-1 text-xs font-medium text-brand-800">
                      {s.orderTypeLabel || s.orderType} • Đi từ <b>{s.departureEndpoint}</b> • {s.routeName}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-800">Giờ đi gợi ý: {fmtTime(s.departureAt)}</p>
                    <p className="mt-1 text-sm text-slate-600">{s.reason}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-xl bg-white px-3 py-1 font-semibold shadow-sm">
                        Khách gán: <b className="text-cta">{s.seatsNeeded}</b>
                      </span>
                      <span className="rounded-xl bg-white px-3 py-1 font-semibold shadow-sm">
                        Xe: <b>{s.vehicleSeats}</b> chỗ
                        {s.vehicleType ? ` (${s.vehicleType})` : ""}
                      </span>
                      <span className="rounded-xl bg-white px-3 py-1 font-semibold shadow-sm">
                        Sau gán còn: <b>{s.seatsRemainingAfter}</b> chỗ
                      </span>
                    </div>
                    <table className="mt-3 w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-1">Mã đơn</th>
                          <th>Giờ đi</th>
                          <th>Chỗ / đơn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((row) => (
                          <tr key={row.code} className="border-t border-slate-100">
                            <td className="py-1 font-medium">{row.code}</td>
                            <td className={row.scheduledAt ? "" : "font-semibold text-amber-700"}>{fmtTime(row.scheduledAt)}</td>
                            <td>{row.passengerCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!ok && (
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        Không đủ ghế — chọn xe/chuyến khác hoặc tách đơn thủ công.
                      </p>
                    )}
                  </div>
                  <button className="btn-primary shrink-0 py-2" disabled={busy || !ok} onClick={() => applySuggestion(s)}>
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
                          Không có chuyến/tài đủ {s.seatsNeeded} ghế — tách đơn hoặc thêm xe
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
              Không có đơn chờ hoặc đơn thiếu tuyến — không tạo được gợi ý. Dùng điều phối thủ công nếu cần.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
