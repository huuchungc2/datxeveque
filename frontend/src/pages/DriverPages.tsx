import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, MapPinned, Phone, Users } from "lucide-react";
import { api, formatMoney } from "../lib/api";
import { formatDisplayDateTime } from "../lib/datetime";
import { tripStatus, settlementStatus } from "../lib/vi";
import { EmptyState, PageIntro } from "../components/ui/DesignKit";
import { StatCard } from "../components/ui/AdminCharts";

export function DriverJobs() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api.get("/driver/jobs").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const accept = async (id: number) => { await api.post(`/driver/jobs/${id}/accept`); load(); };
  const reject = async (id: number) => { if (!confirm("Từ chối chuyến này?")) return; await api.post(`/driver/jobs/${id}/reject`); load(); };
  const status = async (id: number, s: string) => { await api.patch(`/driver/jobs/${id}/status`, { status: s }); load(); };

  const debt = items.reduce((sum, t) => sum + Number(t.driverDebtAmount || 0), 0);
  const seats = items.reduce((sum, t) => sum + Number(t.bookedSeats || 0), 0);

  return (
    <div className="space-y-6">
      <PageIntro title="Chuyến của tôi" subtitle="Nhận chuyến, xem khách trong xe, cập nhật trạng thái chạy và hoàn thành." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Chuyến được giao" value={items.length} tone="brand" icon={<CalendarClock size={20} />} />
        <StatCard label="Khách đã gán" value={seats} tone="blue" icon={<Users size={20} />} />
        <StatCard label="Hoa hồng phải nộp" value={formatMoney(debt)} tone="orange" icon={<AlertTriangle size={20} />} />
      </div>
      <div className="grid gap-4">
        {items.map((t) => (
          <div className="card card-hover" key={t.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">{t.code} — {t.route?.name || "Chưa rõ tuyến"}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><CalendarClock size={16} />{formatDisplayDateTime(t.departureAt)} • {tripStatus(t.status)}</p>
              </div>
              <span className="badge badge-warning">{t.bookedSeats}/{t.totalSeats} ghế</span>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3"><b>Hoa hồng nộp</b><p className="mt-1 text-lg font-extrabold text-cta-500">{formatMoney(t.driverDebtAmount)}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>Tài xế</b><p className="mt-1 text-slate-600">{t.driver?.name || "Tôi"}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>Tuyến</b><p className="mt-1 text-slate-600">{t.route?.name || "—"}</p></div>
            </div>
            {t.tripBookings?.length > 0 && (
              <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <b className="mb-2 block">Khách trong chuyến</b>
                <div className="grid gap-2">
                  {t.tripBookings.map((tb: any) => (
                    <div key={tb.id} className="rounded-2xl bg-white p-3"><b>{tb.booking?.customerName}</b><p className="mt-1 flex flex-wrap gap-3 text-slate-600"><span><Phone size={14} className="inline" /> {tb.booking?.customerPhone}</span><span><MapPinned size={14} className="inline" /> {tb.booking?.pickupAddress || "Chưa có điểm đón"}</span></p></div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {t.status === "COLLECTING" || t.status === "READY" ? (<><button className="btn-primary py-2" onClick={() => accept(t.id)}>Nhận chuyến</button><button className="btn-ghost py-2" onClick={() => reject(t.id)}>Từ chối</button></>) : null}
              <button className="btn-secondary py-2" onClick={() => status(t.id, "IN_PROGRESS")}>Bắt đầu</button>
              <button className="btn-primary py-2" onClick={() => status(t.id, "COMPLETED")}>Hoàn thành</button>
            </div>
          </div>
        ))}
        {!items.length && <EmptyState title="Chưa có chuyến được giao" subtitle="Khi điều phối viên gán chuyến, chuyến sẽ xuất hiện tại đây." />}
      </div>
    </div>
  );
}

export function DriverAvailability() {
  const [form, setForm] = useState({ status: "Rảnh", location: "Sài Gòn", direction: "Sài Gòn → Đức Linh/Tánh Linh", seatsFree: 4 });
  const save = async () => { await api.patch("/driver/availability", form); alert("Đã cập nhật"); };
  return (
    <div className="space-y-6">
      <PageIntro title="Báo rảnh/bận" subtitle="Cập nhật trạng thái hiện tại để điều phối viên biết bạn đang nhận được chuyến nào." />
      <div className="panel grid gap-4 md:grid-cols-2">
        <label className="font-bold">Trạng thái<select className="input mt-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Rảnh</option><option>Bận</option><option>Đang chạy chuyến</option><option>Nghỉ hôm nay</option></select></label>
        <label className="font-bold">Vị trí hiện tại<input className="input mt-2" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <label className="font-bold">Chiều nhận<input className="input mt-2" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} /></label>
        <label className="font-bold">Ghế trống<input className="input mt-2" type="number" value={form.seatsFree} onChange={(e) => setForm({ ...form, seatsFree: Number(e.target.value) })} /></label>
        <button className="btn-primary md:col-span-2" onClick={save}>Cập nhật trạng thái</button>
      </div>
    </div>
  );
}

export function DriverDebts() {
  const [r, setR] = useState<any>();
  useEffect(() => { api.get("/driver/reports").then((x) => setR(x.data)); }, []);
  return (
    <div className="space-y-6">
      <PageIntro title="Công nợ của tôi" subtitle="Theo dõi chuyến đã chạy, khoản cần nộp văn phòng và khoản văn phòng còn phải trả." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tổng chuyến" value={r?.totalTrips || 0} tone="brand" icon={<CalendarClock size={20} />} />
        <StatCard label="Còn phải nộp văn phòng" value={formatMoney(r?.totalDebt)} tone="red" icon={<AlertTriangle size={20} />} />
        <StatCard label="Văn phòng còn trả tôi" value={formatMoney(r?.totalAdminOwes)} tone="green" icon={<CheckCircle2 size={20} />} />
      </div>
      <div className="grid gap-3">
        {r?.trips?.map((t: any) => (
          <div className="card" key={t.id}>
            <div className="flex flex-wrap justify-between gap-3"><b>{t.code} - {t.route?.name}</b><span className="badge badge-info">{settlementStatus(t.settlementStatus)}</span></div>
            <p className="mt-2 text-sm text-slate-600">Còn nợ văn phòng: <b>{formatMoney(t.driverDebtRemaining)}</b> • Văn phòng trả: <b>{formatMoney(t.adminOwesRemaining)}</b></p>
          </div>
        ))}
        {!r?.trips?.length && <EmptyState title="Chưa có dữ liệu công nợ" subtitle="Khi có chuyến hoàn thành, số liệu sẽ hiển thị tại đây." />}
      </div>
    </div>
  );
}
