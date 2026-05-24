import { useEffect, useState } from "react";
import { api, formatMoney } from "../lib/api";

export function DriverJobs() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api.get("/driver/jobs").then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);

  const accept = async (id: number) => {
    await api.post(`/driver/jobs/${id}/accept`);
    load();
  };
  const reject = async (id: number) => {
    if (!confirm("Từ chối chuyến này?")) return;
    await api.post(`/driver/jobs/${id}/reject`);
    load();
  };
  const status = async (id: number, s: string) => {
    await api.patch(`/driver/jobs/${id}/status`, { status: s });
    load();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Chuyến của tôi</h1>
      <div className="mt-5 grid gap-3">
        {items.map((t) => (
          <div className="card" key={t.id}>
            <b>{t.code} — {t.route?.name}</b>
            <p className="text-sm text-slate-600">{new Date(t.departureAt).toLocaleString("vi-VN")} • {t.status}</p>
            <p className="mt-2 text-sm">Ghế: {t.bookedSeats}/{t.totalSeats} • Hoa hồng nộp: <b className="text-cta">{formatMoney(t.driverDebtAmount)}</b></p>
            {t.tripBookings?.length > 0 && (
              <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm">
                <b>Khách trong chuyến:</b>
                {t.tripBookings.map((tb: any) => (
                  <p key={tb.id} className="mt-1">{tb.booking?.customerName} • {tb.booking?.customerPhone} • {tb.booking?.pickupAddress}</p>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {t.status === "COLLECTING" || t.status === "READY" ? (
                <>
                  <button className="btn-primary py-2" onClick={() => accept(t.id)}>Nhận chuyến</button>
                  <button className="btn-secondary py-2" onClick={() => reject(t.id)}>Từ chối</button>
                </>
              ) : null}
              <button className="btn-secondary py-2" onClick={() => status(t.id, "IN_PROGRESS")}>Bắt đầu</button>
              <button className="btn-primary py-2" onClick={() => status(t.id, "COMPLETED")}>Hoàn thành</button>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-slate-500">Chưa có chuyến được giao.</p>}
      </div>
    </div>
  );
}

export function DriverAvailability() {
  const [form, setForm] = useState({ status: "Rảnh", location: "Sài Gòn", direction: "Sài Gòn → Đức Linh/Tánh Linh", seatsFree: 4 });
  const save = async () => {
    await api.patch("/driver/availability", form);
    alert("Đã cập nhật");
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">Báo rảnh/bận</h1>
      <div className="card mt-5 grid gap-4">
        <label className="font-semibold">Trạng thái<select className="input mt-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Rảnh</option><option>Bận</option><option>Đang chạy chuyến</option><option>Nghỉ hôm nay</option></select></label>
        <label className="font-semibold">Vị trí hiện tại<input className="input mt-2" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <label className="font-semibold">Chiều nhận<input className="input mt-2" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} /></label>
        <label className="font-semibold">Ghế trống<input className="input mt-2" type="number" value={form.seatsFree} onChange={(e) => setForm({ ...form, seatsFree: Number(e.target.value) })} /></label>
        <button className="btn-primary" onClick={save}>Cập nhật</button>
      </div>
    </div>
  );
}

export function DriverDebts() {
  const [r, setR] = useState<any>();
  useEffect(() => {
    api.get("/driver/reports").then((x) => setR(x.data));
  }, []);
  return (
    <div>
      <h1 className="text-3xl font-bold">Công nợ của tôi</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="card"><p>Tổng chuyến</p><b className="text-2xl">{r?.totalTrips}</b></div>
        <div className="card"><p>Còn phải nộp admin</p><b className="text-2xl text-red-600">{formatMoney(r?.totalDebt)}</b></div>
      </div>
      <div className="mt-5 grid gap-3">
        {r?.trips?.map((t: any) => (
          <div className="card" key={t.id}>
            <b>{t.code} - {t.route?.name}</b>
            <p className="text-sm text-slate-600">Hoa hồng/công nợ: {formatMoney(t.driverDebtAmount)} • {t.settlementStatus}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
