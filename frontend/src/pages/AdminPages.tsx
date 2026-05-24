import { useEffect, useState } from "react";
import { api, formatMoney } from "../lib/api";

export function AdminDashboard() {
  const [r, setR] = useState<any>();
  useEffect(() => {
    api.get("/admin/reports/overview").then((x) => setR(x.data));
  }, []);
  return (
    <div>
      <h1 className="text-3xl font-bold">Tổng quan</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="card"><p>Doanh thu</p><b className="text-2xl">{formatMoney(r?.totalRevenue)}</b></div>
        <div className="card"><p>Hoa hồng</p><b className="text-2xl text-cta">{formatMoney(r?.totalCommission)}</b></div>
        <div className="card"><p>Tài xế còn lại</p><b className="text-2xl">{formatMoney(r?.totalDriverNet)}</b></div>
        <div className="card"><p>Công nợ tài xế</p><b className="text-2xl text-red-600">{formatMoney(r?.totalDriverDebt)}</b></div>
      </div>
    </div>
  );
}

const BOOKING_STATUS: Record<string, string> = {
  NEW: "Mới",
  WAITING_DISPATCH: "Chờ điều phối",
  ASSIGNED: "Đã gán",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export function AdminBookings() {
  const [items, setItems] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [detail, setDetail] = useState<any>(null);
  const load = () => api.get("/admin/bookings", { params: filters }).then((r) => setItems(r.data));
  useEffect(() => {
    load();
    api.get("/admin/routes").then((r) => setRoutes(r.data));
  }, []);
  const updateStatus = async (id: number, status: string) => {
    await api.patch(`/admin/bookings/${id}`, { status });
    load();
    if (detail?.id === id) setDetail({ ...detail, status });
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">Đơn hàng</h1>
      <div className="card mt-5 grid gap-3 md:grid-cols-5">
        <input className="input" placeholder="Tìm tên/SĐT/mã" onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select className="input" onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="">Loại đơn</option><option value="SHARED_RIDE">Xe ghép</option><option value="PRIVATE_RIDE">Bao xe</option><option value="CARGO">Gửi hàng</option><option value="MARKET">Đi chợ</option></select>
        <select className="input" onChange={(e) => setFilters({ ...filters, routeId: e.target.value })}><option value="">Tuyến</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <select className="input" onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Trạng thái</option>{Object.entries(BOOKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input className="input" type="date" onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <button className="btn-secondary" onClick={load}>Lọc</button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="grid gap-3">
          {items.map((b) => (
            <button type="button" key={b.id} className="card text-left" onClick={() => setDetail(b)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><b>{b.code} - {b.customerName}</b><p className="text-sm text-slate-600">{b.route?.name || "Chưa chọn tuyến"} • {b.pickupAddress} → {b.dropoffAddress}</p></div>
                <div className="text-right"><span className="badge">{b.status}</span><p className="mt-2 font-bold text-cta">{formatMoney(b.finalTotal)}</p></div>
              </div>
            </button>
          ))}
        </div>
        {detail && (
          <div className="card sticky top-4">
            <h2 className="text-xl font-bold">{detail.code}</h2>
            <p className="mt-2 text-sm">{detail.customerName} • {detail.customerPhone}</p>
            <p className="text-sm text-slate-600">{detail.route?.name} • {detail.direction}</p>
            <p className="mt-2 text-sm">{detail.pickupAddress} → {detail.dropoffAddress}</p>
            <p className="mt-2 font-bold text-cta">{formatMoney(detail.finalTotal)}</p>
            <label className="mt-4 block font-semibold">Đổi trạng thái<select className="input mt-2" value={detail.status} onChange={(e) => updateStatus(detail.id, e.target.value)}>{Object.entries(BOOKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminUsers() {
  const [items, setItems] = useState<any[]>([]);
  const [f, setF] = useState<any>({});
  const load = () => api.get("/admin/users", { params: f }).then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);
  const reset = async (id: number) => {
    const p = prompt("Mật khẩu mới", "123456");
    if (p) {
      await api.post(`/admin/users/${id}/reset-password`, { password: p });
      alert("Đã reset");
    }
  };
  const toggleLock = async (u: any) => {
    const next = u.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    await api.patch(`/admin/users/${u.id}/status`, { status: next });
    load();
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">Quản lý user</h1>
      <div className="card mt-5 grid gap-3 md:grid-cols-4">
        <input className="input" placeholder="Tìm user" onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select className="input" onChange={(e) => setF({ ...f, role: e.target.value })}><option value="">Tất cả vai trò</option><option value="ADMIN">Admin</option><option value="DRIVER">Tài xế</option><option value="CUSTOMER">Khách hàng</option></select>
        <select className="input" onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="LOCKED">Đã khóa</option></select>
        <button className="btn-secondary" onClick={load}>Lọc</button>
      </div>
      <div className="mt-5 grid gap-3">
        {items.map((u) => (
          <div className="card flex flex-wrap items-center justify-between gap-3" key={u.id}>
            <div><b>{u.name}</b><p className="text-sm text-slate-600">{u.phone} • {u.role} • {u.status}</p></div>
            <div className="flex gap-2">
              <button className="btn-secondary py-2" onClick={() => toggleLock(u)}>{u.status === "ACTIVE" ? "Khóa" : "Mở khóa"}</button>
              <button className="btn-primary py-2" onClick={() => reset(u.id)}>Reset pass</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminDrivers() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api.get("/admin/drivers").then((r) => setItems(r.data));
  }, []);
  return (
    <div>
      <h1 className="text-3xl font-bold">Tài xế</h1>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((d) => (
          <div className="card" key={d.id}>
            <b>{d.name}</b>
            <p className="text-sm text-slate-600">{d.phone} • {d.status} • {d.location || "Chưa cập nhật vị trí"}</p>
            <p className="mt-2">Ghế trống: <b>{d.seatsFree}</b></p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TRIP_STATUS: Record<string, string> = {
  COLLECTING: "Đang gom",
  READY: "Sẵn sàng",
  IN_PROGRESS: "Đang chạy",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export function AdminTrips() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api.get("/admin/trips").then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);
  const setStatus = async (id: number, status: string) => {
    await api.patch(`/admin/trips/${id}`, { status });
    load();
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">Danh sách chuyến</h1>
      <p className="mt-2 text-sm text-slate-600">Điều phối 3 cột tại menu <b>Điều phối</b> (/admin/dispatch).</p>
      <div className="mt-5 grid gap-3">
        {items.map((t) => (
          <div className="card" key={t.id}>
            <div className="flex justify-between gap-3">
              <div><b>{t.code} - {t.route?.name}</b><p className="text-sm text-slate-600">{new Date(t.departureAt).toLocaleString("vi-VN")} • {t.driver?.name || "Chưa gán tài xế"}</p></div>
              <select className="input w-auto py-1 text-sm" value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}>{Object.entries(TRIP_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <p>Ghế: <b>{t.bookedSeats}/{t.totalSeats}</b></p>
              <p>Doanh thu: <b>{formatMoney(t.totalCustomerAmount)}</b></p>
              <p>Hoa hồng: <b>{formatMoney(t.adminCommission)}</b></p>
              <p>Công nợ: <b>{formatMoney(t.driverDebtAmount)}</b></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminReports() {
  const [r, setR] = useState<any>();
  const [f, setF] = useState<any>({});
  const [routes, setRoutes] = useState<any[]>([]);
  const load = () => api.get("/admin/reports/overview", { params: f }).then((x) => setR(x.data));
  useEffect(() => {
    load();
    api.get("/admin/routes").then((x) => setRoutes(x.data));
  }, []);
  return (
    <div>
      <h1 className="text-3xl font-bold">Báo cáo doanh thu & hoa hồng</h1>
      <div className="card mt-5 grid gap-3 md:grid-cols-6">
        <input className="input" type="date" onChange={(e) => setF({ ...f, from: e.target.value })} />
        <input className="input" type="date" onChange={(e) => setF({ ...f, to: e.target.value })} />
        <input className="input" placeholder="ID tài xế" onChange={(e) => setF({ ...f, driverId: e.target.value })} />
        <select className="input" onChange={(e) => setF({ ...f, routeId: e.target.value })}><option value="">Tất cả tuyến</option>{routes.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}</select>
        <select className="input" onChange={(e) => setF({ ...f, serviceType: e.target.value })}><option value="">Dịch vụ</option><option value="SHARED_RIDE">Xe ghép</option><option value="PRIVATE_RIDE">Bao xe</option><option value="CARGO">Gửi hàng</option><option value="MARKET">Đi chợ</option></select>
        <button className="btn-secondary" onClick={load}>Lọc báo cáo</button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-5">
        <div className="card"><p>Tổng chuyến</p><b className="text-2xl">{r?.totalTrips}</b></div>
        <div className="card"><p>Doanh thu</p><b>{formatMoney(r?.totalRevenue)}</b></div>
        <div className="card"><p>Hoa hồng</p><b>{formatMoney(r?.totalCommission)}</b></div>
        <div className="card"><p>TX nợ admin</p><b className="text-red-600">{formatMoney(r?.totalDriverDebt)}</b></div>
        <div className="card"><p>Admin trả TX</p><b className="text-cta">{formatMoney(r?.totalAdminOwesDriver)}</b></div>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    api.get("/admin/settings").then((r) => setRows(r.data));
  }, []);
  const save = async () => {
    const body: Object = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    await api.put("/admin/settings", body);
    alert("Đã lưu");
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">Cài đặt website</h1>
      <div className="card mt-5 grid gap-4 md:grid-cols-2">
        {rows.map((r, i) => (
          <label key={r.key} className="block text-sm font-semibold">{r.key}<input className="input mt-2" value={r.value || ""} onChange={(e) => setRows(rows.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))} /></label>
        ))}
        <button className="btn-primary md:col-span-2" onClick={save}>Lưu cấu hình</button>
      </div>
    </div>
  );
}
