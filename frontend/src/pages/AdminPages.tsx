import { useEffect, useState } from "react";
import { api, formatMoney } from "../lib/api";
import { fmtDepartureTime, formatDisplayDate } from "../lib/datetime";
import { SERVICE_TYPE_OPTIONS } from "../lib/serviceTypes";
import { useSiteSettings } from "../lib/useSiteSettings";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { runDirectionLabel, type RunDirection } from "../lib/runDirection";
import { DriverDebtChart, OccupancyChart, PageTitle, RevenueTrendChart, RouteRevenueChart, StatCard, StatusDonutChart, dashboardIcons } from "../components/ui/AdminCharts";
import { GregorianDateInput } from "../components/ui/GregorianDateInputs";
import {
  USER_ROLE_VI,
  USER_STATUS_VI,
  bookingStatus,
  userRole,
  userStatus,
  settingKey,
} from "../lib/vi";
import {
  AdminResetPasswordModal,
  adminResetUserPassword,
  validateAdminNewPassword,
  type ResetPasswordTarget,
} from "../components/admin/AdminResetPasswordModal";

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

const USER_FORM_ROLES = ["ADMIN", "DISPATCHER", "ACCOUNTANT", "DRIVER", "CUSTOMER"] as const;

const emptyUserForm = () => ({
  name: "",
  phone: "",
  email: "",
  password: "",
  role: "DISPATCHER" as string,
  status: "ACTIVE",
  zaloPhone: "",
  driverStatus: "Rảnh",
  runDirection: "" as "" | RunDirection,
  location: "",
  direction: "",
  seatsFree: 0,
  note: "",
  vehicleType: "",
  licensePlate: "",
  vehicleSeats: 7,
});

function userToForm(u: any) {
  const base = emptyUserForm();
  return {
    ...base,
    id: u.id,
    name: u.name ?? "",
    phone: u.phone ?? "",
    email: u.email ?? "",
    password: "",
    role: u.role ?? base.role,
    status: u.status ?? base.status,
    zaloPhone: u.driver?.zaloPhone ?? u.customer?.zaloPhone ?? "",
    driverStatus: u.driver?.status ?? base.driverStatus,
    runDirection: (
      u.driver?.runDirection === "SG_TO_PROVINCE" || u.driver?.runDirection === "PROVINCE_TO_SG"
        ? u.driver.runDirection
        : ""
    ) as "" | RunDirection,
    location: u.driver?.location ?? "",
    direction: u.driver?.direction ?? "",
    seatsFree: Number(u.driver?.seatsFree ?? 0),
    note: u.driver?.note ?? u.customer?.note ?? "",
    vehicleType: u.driver?.vehicles?.[0]?.vehicleType ?? "",
    licensePlate: u.driver?.vehicles?.[0]?.licensePlate ?? "",
    vehicleSeats: Number(u.driver?.vehicles?.[0]?.seats ?? 7),
  };
}

const DRIVER_STATUS_OPTIONS = ["Rảnh", "Bận", "Đang chạy chuyến", "Nghỉ hôm nay"];

export function AdminUsers() {
  const [routes, setRoutes] = useState<{ id: number; name: string; direction?: string }[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [f, setF] = useState<any>({});
  const [form, setForm] = useState(emptyUserForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState<ResetPasswordTarget | null>(null);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const isNew = creating && editId === null;
  const showForm = creating || editId !== null;

  const load = () => api.get("/admin/users", { params: f }).then((r) => setItems(r.data));

  useEffect(() => {
    load();
    api.get("/admin/routes").then((r) => setRoutes(Array.isArray(r.data) ? r.data : r.data?.items || []));
  }, []);

  const resetForm = () => {
    setForm(emptyUserForm());
    setEditId(null);
    setCreating(false);
    setPwNew("");
    setPwConfirm("");
    setPwError("");
  };

  const startCreate = () => {
    setEditId(null);
    setCreating(true);
    setForm(emptyUserForm());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEdit = (u: any) => {
    setCreating(false);
    setEditId(u.id);
    setForm(userToForm(u));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    const phone = normalizeVnPhone(form.phone);
    if (!phone) throw new Error(PHONE_INVALID_MESSAGE);
    if (!form.name.trim()) throw new Error("Vui lòng nhập họ tên");
    const zaloPhone = form.zaloPhone.trim() ? normalizeVnPhone(form.zaloPhone) : null;
    if (form.zaloPhone.trim() && !zaloPhone) throw new Error("Số Zalo phải đủ 10 chữ số, bắt đầu bằng 0");

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      phone,
      email: form.email.trim() || null,
      role: form.role,
      status: form.status,
      zaloPhone,
      note: form.note.trim() || null,
    };

    if (form.role === "DRIVER") {
      payload.driverStatus = form.driverStatus;
      if (!form.runDirection) {
        throw new Error("Tài xế cần chọn chiều chạy");
      }
      payload.runDirection = form.runDirection;
      payload.seatsFree = Number(form.seatsFree);
      if (isNew) {
        payload.vehicleType = form.vehicleType.trim() || null;
        payload.licensePlate = form.licensePlate.trim() || null;
        payload.vehicleSeats = Number(form.vehicleSeats);
      }
    }

    if (isNew) {
      if (!form.password || form.password.length < 6) {
        throw new Error("Mật khẩu tối thiểu 6 ký tự");
      }
      payload.password = form.password;
    }

    return payload;
  };

  const saveUser = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isNew) {
        const r = await api.post("/admin/users", payload);
        alert(`Đã tạo tài khoản ${r.data?.phone}`);
        resetForm();
      } else {
        await api.patch(`/admin/users/${editId}`, payload);
        alert("Đã lưu người dùng");
        resetForm();
      }
      load();
    } catch (e: any) {
      alert(e.message || e.response?.data?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const openResetPassword = (u: { id: number; name?: string; phone?: string }) => {
    setResetTarget({ userId: u.id, label: `${u.name || "—"} · ${u.phone || ""}` });
  };

  const savePasswordInForm = async () => {
    if (!editId) return;
    const err = validateAdminNewPassword(pwNew, pwConfirm);
    if (err) {
      setPwError(err);
      return;
    }
    setPwSaving(true);
    setPwError("");
    try {
      await adminResetUserPassword(editId, pwNew);
      setPwNew("");
      setPwConfirm("");
      alert("Đã đặt lại mật khẩu");
    } catch (e: any) {
      setPwError(e.response?.data?.message || "Không đổi được mật khẩu");
    } finally {
      setPwSaving(false);
    }
  };

  const toggleLock = async (u: any) => {
    const next = u.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    await api.patch(`/admin/users/${u.id}/status`, { status: next });
    load();
  };

  const isDriver = form.role === "DRIVER";
  const isCustomer = form.role === "CUSTOMER";
  const isStaff = form.role === "ADMIN" || form.role === "DISPATCHER" || form.role === "ACCOUNTANT";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="section-title">Quản lý người dùng</h1>
        <button type="button" className="btn-primary" onClick={startCreate}>
          + Thêm người dùng
        </button>
      </div>

      {showForm && (
        <div className="card mt-5">
          <h2 className="text-lg font-bold">{isNew ? "Thêm người dùng" : `Sửa #${editId}`}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Chọn vai trò — form hiển thị trường tương ứng (nhân viên / tài xế / khách).
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Vai trò *
              <select
                className="input mt-1"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={!isNew}
              >
                {USER_FORM_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {USER_ROLE_VI[r]}
                  </option>
                ))}
              </select>
              {!isNew && <span className="mt-1 block text-xs text-slate-500">Vai trò không đổi sau khi tạo — tạo tài khoản mới nếu cần đổi loại.</span>}
            </label>
            <label className="text-sm font-semibold">
              Trạng thái
              <select className="input mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(USER_STATUS_VI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Họ tên *
              <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="text-sm font-semibold">
              SĐT đăng nhập *
              <input
                className="input mt-1"
                {...phoneInputProps}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Email (tuỳ chọn)
              <input
                className="input mt-1"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            {isNew && (
              <label className="text-sm font-semibold md:col-span-2">
                Mật khẩu *
                <input
                  className="input mt-1"
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
            )}

            {!isNew && editId && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:col-span-2">
                <p className="text-sm font-bold text-slate-800">Đổi mật khẩu đăng nhập</p>
                <p className="mt-1 text-xs text-slate-500">Chỉ admin — mật khẩu được mã hóa trên máy chủ, không hiển thị lại sau khi lưu.</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Mật khẩu mới
                    <input
                      className="input mt-1"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Nhập lại mật khẩu
                    <input
                      className="input mt-1"
                      type="password"
                      autoComplete="new-password"
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                    />
                  </label>
                </div>
                {pwError && (
                  <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
                    {pwError}
                  </p>
                )}
                <button type="button" className="btn-secondary mt-3" disabled={pwSaving} onClick={savePasswordInForm}>
                  {pwSaving ? "Đang lưu…" : "Cập nhật mật khẩu"}
                </button>
              </div>
            )}

            {isStaff && (
              <p className="text-sm text-slate-600 md:col-span-2">
                Tài khoản nhân viên: đăng nhập bằng SĐT + mật khẩu, vào khu vực quản trị theo quyền.
              </p>
            )}

            {isDriver && (
              <>
                <p className="text-sm font-semibold text-brand-800 md:col-span-2">Hồ sơ tài xế</p>
                <label className="text-sm font-semibold">
                  Zalo (tuỳ chọn)
                  <input
                    className="input mt-1"
                    {...phoneInputProps}
                    value={form.zaloPhone}
                    onChange={(e) => setForm({ ...form, zaloPhone: sanitizePhoneInput(e.target.value) })}
                  />
                </label>
                <label className="text-sm font-semibold">
                  Trạng thái tài xế
                  <select className="input mt-1" value={form.driverStatus} onChange={(e) => setForm({ ...form, driverStatus: e.target.value })}>
                    {DRIVER_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold md:col-span-2">
                  Chiều chạy (mọi tuyến) <span className="text-red-600">*</span>
                  <select
                    className="input mt-1"
                    value={form.runDirection}
                    onChange={(e) =>
                      setForm({ ...form, runDirection: e.target.value as typeof form.runDirection })
                    }
                  >
                    <option value="">— Chọn chiều —</option>
                    <option value="SG_TO_PROVINCE">Sài Gòn → Đức Linh / Tánh Linh</option>
                    <option value="PROVINCE_TO_SG">Đức Linh / Tánh Linh → Sài Gòn</option>
                  </select>
                </label>
                {form.runDirection && (
                  <p className="md:col-span-2 text-sm text-slate-600">
                    {runDirectionLabel(form.runDirection)}
                    {form.location ? ` · Vị trí: ${form.location}` : ""}
                  </p>
                )}
                <label className="text-sm font-semibold">
                  Ghế trống báo
                  <input
                    className="input mt-1"
                    type="number"
                    min={0}
                    value={form.seatsFree}
                    onChange={(e) => setForm({ ...form, seatsFree: Number(e.target.value) })}
                  />
                </label>
                {isNew && (
                  <>
                    <p className="text-sm font-semibold text-slate-600 md:col-span-2">Xe (khi tạo mới)</p>
                    <label className="text-sm font-semibold">
                      Loại xe
                      <input className="input mt-1" placeholder="Xe 7 chỗ" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
                    </label>
                    <label className="text-sm font-semibold">
                      Biển số
                      <input className="input mt-1" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
                    </label>
                    <label className="text-sm font-semibold">
                      Số chỗ
                      <input
                        className="input mt-1"
                        type="number"
                        min={1}
                        value={form.vehicleSeats}
                        onChange={(e) => setForm({ ...form, vehicleSeats: Number(e.target.value) })}
                      />
                    </label>
                  </>
                )}
                {!isNew && form.vehicleType && (
                  <p className="text-sm text-slate-500 md:col-span-2">
                    Xe: {form.vehicleType} {form.vehicleSeats} chỗ{form.licensePlate ? ` • ${form.licensePlate}` : ""} — sửa chi tiết tại menu Tài xế.
                  </p>
                )}
              </>
            )}

            {isCustomer && (
              <>
                <p className="text-sm font-semibold text-brand-800 md:col-span-2">Hồ sơ khách</p>
                <label className="text-sm font-semibold">
                  Zalo (tuỳ chọn)
                  <input
                    className="input mt-1"
                    {...phoneInputProps}
                    value={form.zaloPhone}
                    onChange={(e) => setForm({ ...form, zaloPhone: sanitizePhoneInput(e.target.value) })}
                  />
                </label>
              </>
            )}

            <label className="text-sm font-semibold md:col-span-2">
              Ghi chú nội bộ
              <textarea className="input mt-1" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button type="button" className="btn-primary" disabled={saving} onClick={saveUser}>
                {isNew ? "Tạo tài khoản" : "Lưu thay đổi"}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card mt-5 grid gap-3 md:grid-cols-4">
        <input className="input" placeholder="Tìm tên/SĐT/email" onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select className="input" value={f.role || ""} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option value="">Tất cả vai trò</option>
          {Object.entries(USER_ROLE_VI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="input" value={f.status || ""} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(USER_STATUS_VI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" className="btn-secondary" onClick={load}>
          Lọc
        </button>
      </div>

      {resetTarget && (
        <AdminResetPasswordModal
          target={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={(message) => alert(message)}
        />
      )}

      <div className="mt-5 grid gap-3">
        {items.map((u) => (
          <div
            className={`card flex flex-wrap items-center justify-between gap-3 ${editId === u.id ? "ring-2 ring-brand-500" : ""}`}
            key={u.id}
          >
            <div>
              <b>{u.name}</b>
              <p className="text-sm text-slate-600">
                {u.phone}
                {u.email ? ` • ${u.email}` : ""} • {userRole(u.role)} • {userStatus(u.status)}
              </p>
              {u.driver && (
                <p className="text-sm text-slate-500">
                  Tài xế: {u.driver.status}
                  {u.driver.location ? ` • ${u.driver.location}` : ""}
                </p>
              )}
              {u.customer && <p className="text-sm text-slate-500">Khách hàng có hồ sơ CRM</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary py-2" onClick={() => startEdit(u)}>
                Sửa
              </button>
              <button type="button" className="btn-secondary py-2" onClick={() => toggleLock(u)}>
                {u.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
              </button>
              <button type="button" className="btn-primary py-2" onClick={() => openResetPassword(u)}>
                Đặt lại MK
              </button>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-slate-500">Chưa có người dùng phù hợp bộ lọc.</p>}
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
