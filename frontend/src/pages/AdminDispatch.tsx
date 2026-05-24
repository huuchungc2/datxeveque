import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatMoney } from "../lib/api";

const TYPE_LABELS: Record<string, string> = {
  SHARED_RIDE: "Xe ghép",
  PRIVATE_RIDE: "Bao xe",
  CARGO: "Gửi hàng",
  MARKET: "Đi chợ",
  CONTRACT: "Hợp đồng",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Mới",
  WAITING_DISPATCH: "Chờ điều phối",
  ASSIGNED: "Đã gán",
  QUOTED: "Đã báo giá",
};

function fmtTime(v?: string | null) {
  if (!v) return "Chưa có giờ";
  return new Date(v).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export function AdminDispatch() {
  const [data, setData] = useState<any>(null);
  const [filters, setFilters] = useState<any>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return api.get("/admin/dispatch", { params: filters }).then((r) => setData(r.data));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedBookings = useMemo(
    () => (data?.unassignedBookings || []).filter((b: any) => selected.includes(b.id)),
    [data, selected]
  );

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const assignToTrip = async (tripId: number) => {
    if (!selected.length) return setMsg("Chọn ít nhất 1 đơn trước khi gán.");
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
    const first = selectedBookings[0];
    if (!first?.routeId) return setMsg("Đơn đầu tiên chưa có tuyến, không tạo được chuyến.");

    const vehicle = driver?.vehicles?.[0];
    const totalSeats = vehicle?.seats || Math.max(5, selectedBookings.reduce((s: number, b: any) => s + Number(b.passengerCount || 0), 0));
    const departureAt = first.scheduledAt || new Date().toISOString();

    setBusy(true);
    setMsg("");
    try {
      const tripRes = await api.post("/admin/trips", {
        routeId: first.routeId,
        driverId: driver?.id || null,
        vehicleId: vehicle?.id || null,
        departureAt,
        totalSeats,
      });
      const trip = tripRes.data;
      const assignRes = await api.post(`/admin/trips/${trip.id}/add-bookings`, { bookingIds: selected });
      setMsg(`Đã tạo chuyến ${trip.code} và gán ${assignRes.data.added} đơn.`);
      setSelected([]);
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.message || "Không tạo được chuyến.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Điều phối chuyến</h1>
      <p className="mt-2 text-slate-600">Chọn đơn chưa gán → gán vào chuyến đang gom hoặc tạo chuyến mới với tài xế rảnh.</p>

      <div className="card mt-5 grid gap-3 md:grid-cols-6">
        <select className="input" onChange={(e) => setFilters({ ...filters, routeId: e.target.value || undefined })}>
          <option value="">Tất cả tuyến</option>
          {(data?.routes || []).map((r: any) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select className="input" onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}>
          <option value="">Loại đơn</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input className="input" type="date" onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })} />
        <input className="input" placeholder="Tìm mã/SĐT/tên" onChange={(e) => setFilters({ ...filters, q: e.target.value || undefined })} />
        <input className="input" placeholder="Chiều đi" onChange={(e) => setFilters({ ...filters, direction: e.target.value || undefined })} />
        <button className="btn-secondary" onClick={load}>Lọc</button>
      </div>

      {msg && <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-brand-900">{msg}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn-primary py-2" disabled={busy || !selected.length} onClick={() => createTrip()}>
          Tạo chuyến từ đơn đã chọn ({selected.length})
        </button>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <section className="card !p-0 overflow-hidden">
          <div className="border-b bg-slate-50 px-4 py-3">
            <h2 className="font-bold">Đơn chưa gán ({data?.unassignedBookings?.length || 0})</h2>
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
            {(data?.unassignedBookings || []).map((b: any) => (
              <label key={b.id} className={`block cursor-pointer rounded-2xl border p-3 ${selected.includes(b.id) ? "border-brand-700 bg-blue-50" : "border-slate-200"}`}>
                <div className="flex gap-3">
                  <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b>{b.code}</b>
                      <span className="badge">{STATUS_LABELS[b.status] || b.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{fmtTime(b.scheduledAt)} | {b.route?.name || b.direction || "Chưa chọn tuyến"}</p>
                    <p className="text-sm text-slate-600">{b.pickupAddress || "—"} → {b.dropoffAddress || "—"}</p>
                    <p className="mt-1 text-sm">{TYPE_LABELS[b.type] || b.type} • {b.passengerCount} khách • <b className="text-cta">{formatMoney(b.finalTotal || b.estimatedTotal)}</b> • HH {formatMoney(b.commissionAmount)}</p>
                    <p className="text-xs text-slate-500">{b.customerName} • {b.customerPhone}</p>
                  </div>
                </div>
              </label>
            ))}
            {!data?.unassignedBookings?.length && <p className="p-4 text-sm text-slate-500">Không có đơn chờ gán.</p>}
          </div>
        </section>

        <section className="card !p-0 overflow-hidden">
          <div className="border-b bg-slate-50 px-4 py-3">
            <h2 className="font-bold">Chuyến đang gom ({data?.collectingTrips?.length || 0})</h2>
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
            {(data?.collectingTrips || []).map((t: any) => (
              <div key={t.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <b>{t.code}</b>
                  <span className="badge">{t.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{t.route?.name}</p>
                <p className="text-sm text-slate-600">{new Date(t.departureAt).toLocaleString("vi-VN")}</p>
                <p className="text-sm">{t.driver?.name || "Chưa gán tài xế"} {t.vehicle?.vehicleType ? `• ${t.vehicle.vehicleType}` : ""}</p>
                <p className="mt-2 text-sm">Ghế <b>{t.bookedSeats}/{t.totalSeats}</b>, còn <b>{t.availableSeats}</b></p>
                <p className="text-sm">DT {formatMoney(t.totalCustomerAmount)} • HH {formatMoney(t.adminCommission)} • Nợ {formatMoney(t.driverDebtAmount)}</p>
                <p className="mt-1 text-xs text-slate-500">{t.tripBookings?.length || 0} đơn trong chuyến</p>
                <button className="btn-primary mt-3 w-full py-2" disabled={busy || !selected.length} onClick={() => assignToTrip(t.id)}>Gán đơn đã chọn</button>
              </div>
            ))}
            {!data?.collectingTrips?.length && <p className="p-4 text-sm text-slate-500">Chưa có chuyến đang gom.</p>}
          </div>
        </section>

        <section className="card !p-0 overflow-hidden">
          <div className="border-b bg-slate-50 px-4 py-3">
            <h2 className="font-bold">Tài xế rảnh ({data?.availableDrivers?.length || 0})</h2>
          </div>
          <div className="max-h-[70vh] space-y-2 overflow-y-auto p-3">
            {(data?.availableDrivers || []).map((d: any) => (
              <div key={d.id} className="rounded-2xl border border-slate-200 p-3">
                <b>{d.name}</b>
                <p className="text-sm text-slate-600">{d.phone}</p>
                <p className="text-sm text-slate-600">Đang ở: {d.location || "Chưa cập nhật"}</p>
                <p className="text-sm text-slate-600">Chiều: {d.direction || "—"}</p>
                <p className="mt-2 text-sm">{d.vehicles?.[0]?.vehicleType || "Chưa có xe"} • còn <b>{d.seatsFree}</b> ghế</p>
                <button className="btn-secondary mt-3 w-full py-2" disabled={busy || !selected.length} onClick={() => createTrip(d)}>Tạo chuyến với tài xế này</button>
              </div>
            ))}
            {!data?.availableDrivers?.length && <p className="p-4 text-sm text-slate-500">Không có tài xế rảnh.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
