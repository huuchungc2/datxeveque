import { useEffect, useState } from "react";
import { api, formatMoney } from "../lib/api";
import { SETTLEMENT_STATUS_VI, settlementStatus } from "../lib/vi";

export function AdminDebts() {
  const [data, setData] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [f, setF] = useState<any>({});
  const [form, setForm] = useState({ tripId: "", driverId: "", amount: "", direction: "DRIVER_OWES_ADMIN", method: "Tiền mặt", note: "" });

  const load = () => api.get("/admin/reports/debts", { params: f }).then((r) => setData(r.data));
  useEffect(() => {
    load();
    api.get("/admin/drivers").then((r) => setDrivers(r.data));
  }, []);

  const pay = async () => {
    if (!form.driverId || !form.amount) return alert("Chọn tài xế và nhập số tiền");
    await api.post("/admin/settlements", { ...form, tripId: form.tripId || null, amount: Number(form.amount) });
    setForm({ tripId: "", driverId: "", amount: "", direction: "DRIVER_OWES_ADMIN", method: "Tiền mặt", note: "" });
    load();
    alert("Đã ghi nhận thanh toán");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Công nợ & đối soát</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="card"><p>Tài xế còn nợ văn phòng</p><b className="text-2xl text-red-600">{formatMoney(data?.totalDriverDebt)}</b></div>
        <div className="card"><p>Văn phòng còn phải trả tài xế</p><b className="text-2xl text-cta">{formatMoney(data?.totalAdminOwesDriver)}</b></div>
        <div className="card"><p>Số chuyến</p><b className="text-2xl">{data?.trips?.length || 0}</b></div>
      </div>

      <div className="card mt-5 grid gap-3 md:grid-cols-4">
        <select className="input" onChange={(e) => setF({ ...f, driverId: e.target.value })}>
          <option value="">Tất cả tài xế</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input" onChange={(e) => setF({ ...f, settlementStatus: e.target.value })}>
          <option value="">Trạng thái đối soát</option>
          {Object.entries(SETTLEMENT_STATUS_VI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn-secondary md:col-span-2" onClick={load}>Lọc</button>
      </div>

      <div className="card mt-5">
        <h2 className="font-bold">Ghi nhận thanh toán</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select className="input" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
            <option value="">Chọn tài xế</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input className="input" placeholder="Mã chuyến (số)" value={form.tripId} onChange={(e) => setForm({ ...form, tripId: e.target.value })} />
          <input className="input" type="number" placeholder="Số tiền" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            <option value="DRIVER_OWES_ADMIN">Tài xế nộp văn phòng</option>
            <option value="ADMIN_OWES_DRIVER">Văn phòng trả tài xế</option>
          </select>
          <input className="input" placeholder="Hình thức" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} />
          <button className="btn-primary" onClick={pay}>Xác nhận</button>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {data?.trips?.map((t: any) => (
          <div className="card" key={t.id}>
            <b>{t.code} — {t.route?.name}</b>
            <p className="text-sm text-slate-600">{t.driver?.name || "Chưa gán tài xế"} • {settlementStatus(t.settlementStatus)}</p>
            <p className="mt-2 text-sm">Tài xế nợ: <b className="text-red-600">{formatMoney(t.driverDebtRemaining)}</b> • Văn phòng trả tài xế: <b className="text-cta">{formatMoney(t.adminOwesRemaining)}</b></p>
            <button className="btn-secondary mt-2 py-1 text-sm" onClick={() => setForm({ ...form, tripId: String(t.id), driverId: String(t.driverId || "") })}>Chọn để thanh toán</button>
          </div>
        ))}
      </div>
    </div>
  );
}
