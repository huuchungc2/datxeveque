import { useEffect, useState } from "react";
import { api, formatMoney } from "../lib/api";
import { defaultDepartureLocal, fmtDepartureTime, toDatetimeLocalValue } from "../lib/datetime";
import { ROUTE_REQUIRED_SERVICE_TYPES } from "../routes/bookableServices";
import { usesPassengerCount } from "../lib/bookingSeats";
import { useSiteSettings } from "../lib/useSiteSettings";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { SERVICE_TYPE_OPTIONS } from "../lib/serviceTypes";
import {
  BOOKING_STATUS_VI,
  TRIP_STATUS_VI,
  USER_ROLE_VI,
  USER_STATUS_VI,
  bookingStatus,
  tripStatus,
  userRole,
  userStatus,
  settingKey,
} from "../lib/vi";

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

function emptyBookingForm() {
  return {
    id: null as number | null,
    code: "",
    type: "SHARED_RIDE",
    routeId: "",
    customerName: "",
    customerPhone: "",
    pickupAddress: "",
    dropoffAddress: "",
    direction: "",
    scheduledAtLocal: defaultDepartureLocal(),
    passengerCount: 1,
    weightKg: 1,
    vehicleType: "Xe 7 chỗ",
    cargoDescription: "",
    marketDescription: "",
    note: "",
    status: "WAITING_DISPATCH",
    paymentReceiver: "DRIVER",
    finalTotal: 0,
    commissionAmount: 0,
  };
}

function bookingToForm(b: any) {
  const base = emptyBookingForm();
  return {
    ...base,
    id: b.id,
    code: b.code,
    type: b.type || base.type,
    routeId: b.routeId != null ? String(b.routeId) : "",
    customerName: b.customerName || "",
    customerPhone: b.customerPhone || "",
    pickupAddress: b.pickupAddress || "",
    dropoffAddress: b.dropoffAddress || "",
    direction: b.direction || "",
    scheduledAtLocal: toDatetimeLocalValue(b.scheduledAt),
    passengerCount: usesPassengerCount(b.type) ? Number(b.passengerCount ?? 1) : 0,
    vehicleType: b.vehicleType || "",
    cargoDescription: b.cargoDescription || "",
    marketDescription: b.marketDescription || "",
    note: b.note || "",
    status: b.status || base.status,
    paymentReceiver: b.paymentReceiver || "DRIVER",
    finalTotal: Number(b.finalTotal ?? 0),
    commissionAmount: Number(b.commissionAmount ?? 0),
  };
}

export function AdminBookings() {
  const [items, setItems] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [form, setForm] = useState(emptyBookingForm);
  const [priceHint, setPriceHint] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const isNew = form.id == null;

  const load = () => api.get("/admin/bookings", { params: filters }).then((r) => setItems(r.data));
  useEffect(() => {
    load();
    api.get("/admin/routes").then((r) => setRoutes(r.data));
  }, []);

  useEffect(() => {
    if (!form.type) {
      setPriceHint(null);
      return;
    }
    if (ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId) {
      setPriceHint(null);
      return;
    }
    api
      .post("/price/estimate", {
        type: form.type,
        routeId: form.routeId ? Number(form.routeId) : null,
        passengerCount: usesPassengerCount(form.type) ? Number(form.passengerCount || 1) : 0,
        weightKg: Number(form.weightKg || 0),
        vehicleType: form.vehicleType || null,
      })
      .then((r) => setPriceHint(r.data))
      .catch(() => setPriceHint(null));
  }, [form.type, form.routeId, form.passengerCount, form.weightKg, form.vehicleType]);

  const buildPayload = () => {
    const phone = normalizeVnPhone(form.customerPhone);
    if (!phone) throw new Error(PHONE_INVALID_MESSAGE);
    if (!form.customerName.trim()) throw new Error("Vui lòng nhập họ tên khách");
    if (!form.scheduledAtLocal) throw new Error("Vui lòng chọn ngày giờ đi");
    if (ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId) {
      throw new Error("Vui lòng chọn tuyến");
    }
    const selectedRoute = routes.find((r) => String(r.id) === String(form.routeId));
    return {
      customerName: form.customerName.trim(),
      customerPhone: phone,
      type: form.type,
      routeId: form.routeId ? Number(form.routeId) : null,
      direction: form.direction || selectedRoute?.direction || selectedRoute?.name || null,
      pickupAddress: form.pickupAddress || null,
      dropoffAddress: form.dropoffAddress || null,
      scheduledAt: form.scheduledAtLocal,
      passengerCount: usesPassengerCount(form.type) ? Number(form.passengerCount || 1) : 0,
      weightKg: Number(form.weightKg || 0),
      vehicleType: form.vehicleType || null,
      cargoDescription: form.cargoDescription || null,
      marketDescription: form.marketDescription || null,
      note: form.note || null,
      status: form.status,
      paymentReceiver: form.paymentReceiver,
      finalTotal: Number(form.finalTotal),
      commissionAmount: Number(form.commissionAmount),
    };
  };

  const saveBooking = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isNew) {
        const r = await api.post("/admin/bookings", payload);
        setForm(bookingToForm(r.data));
        alert(`Đã tạo đơn ${r.data.code}`);
      } else {
        const r = await api.patch(`/admin/bookings/${form.id}`, payload);
        setForm(bookingToForm(r.data));
        alert("Đã lưu đơn");
      }
      load();
    } catch (e: any) {
      alert(e.message || e.response?.data?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const recalcFromRules = async () => {
    if (isNew) {
      if (priceHint) {
        setForm((f) => ({
          ...f,
          finalTotal: Number(priceHint.estimatedTotal || 0),
          commissionAmount: Number(priceHint.commissionAmount || 0),
        }));
      }
      return;
    }
    setSaving(true);
    try {
      const r = await api.patch(`/admin/bookings/${form.id}`, {
        type: form.type,
        routeId: form.routeId ? Number(form.routeId) : null,
        passengerCount: usesPassengerCount(form.type) ? Number(form.passengerCount || 1) : 0,
        recalcFromRules: true,
      });
      setForm(bookingToForm(r.data));
      load();
      alert("Đã tính lại từ bảng giá");
    } catch (e: any) {
      alert(e.response?.data?.message || "Không tính lại được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Đơn hàng</h1>
        <button type="button" className="btn-primary py-2" onClick={() => setForm(emptyBookingForm())}>
          + Thêm đơn
        </button>
      </div>
      <div className="card mt-5 grid gap-3 md:grid-cols-5">
        <input className="input" placeholder="Tìm tên/SĐT/mã" onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select className="input" onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}>
          <option value="">Loại đơn</option>
          {SERVICE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select className="input" onChange={(e) => setFilters({ ...filters, routeId: e.target.value })}><option value="">Tuyến</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        <select className="input" onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Trạng thái</option>
          {Object.entries(BOOKING_STATUS_VI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input className="input" type="date" onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <button className="btn-secondary" onClick={load}>Lọc</button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="grid max-h-[75vh] gap-3 overflow-y-auto pr-1">
          {items.map((b) => (
            <button
              type="button"
              key={b.id}
              className={`card text-left ${form.id === b.id ? "ring-2 ring-brand-500" : ""}`}
              onClick={() => setForm(bookingToForm(b))}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <b>
                    {b.code} — {b.customerName}
                  </b>
                  <p className={`text-sm ${b.scheduledAt ? "text-slate-600" : "font-semibold text-amber-700"}`}>
                    {fmtDepartureTime(b.scheduledAt)} • {b.route?.name || "Chưa chọn tuyến"}
                  </p>
                  <p className="text-sm text-slate-600">
                    {b.pickupAddress || "—"} → {b.dropoffAddress || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="badge">{bookingStatus(b.status)}</span>
                  <p className="mt-2 font-bold text-cta">{formatMoney(b.finalTotal)}</p>
                </div>
              </div>
            </button>
          ))}
          {!items.length && <p className="text-sm text-slate-500">Chưa có đơn. Bấm «Thêm đơn» để tạo.</p>}
        </div>

        <div className="card sticky top-4 max-h-[85vh] overflow-y-auto">
          <h2 className="text-xl font-bold">{isNew ? "Thêm đơn mới" : `Sửa đơn ${form.code}`}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">
              Loại dịch vụ
              <select className="input mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {SERVICE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Tuyến {ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) ? "*" : "(tuỳ chọn)"}
              <select className="input mt-1" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
                <option value="">— Chọn tuyến —</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Họ tên khách *
              <input className="input mt-1" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </label>
            <label className="text-sm font-semibold">
              SĐT (10 số) *
              <input
                className="input mt-1"
                {...phoneInputProps}
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: sanitizePhoneInput(e.target.value) })}
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Ngày giờ đi *
              <input
                className="input mt-1"
                type="datetime-local"
                value={form.scheduledAtLocal}
                onChange={(e) => setForm({ ...form, scheduledAtLocal: e.target.value })}
              />
            </label>
            <label className="text-sm font-semibold">
              Điểm đón / gửi
              <input className="input mt-1" value={form.pickupAddress} onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} />
            </label>
            <label className="text-sm font-semibold">
              Điểm trả / nhận
              <input className="input mt-1" value={form.dropoffAddress} onChange={(e) => setForm({ ...form, dropoffAddress: e.target.value })} />
            </label>
            <label className="text-sm font-semibold">
              Chiều / ghi chú tuyến
              <input className="input mt-1" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} />
            </label>
            {usesPassengerCount(form.type) && (
              <label className="text-sm font-semibold">
                Số khách
                <input
                  className="input mt-1"
                  type="number"
                  min={1}
                  value={form.passengerCount}
                  onChange={(e) => setForm({ ...form, passengerCount: Number(e.target.value) })}
                />
              </label>
            )}
            {form.type === "CARGO" && (
              <label className="text-sm font-semibold">
                Khối lượng (kg)
                <input
                  className="input mt-1"
                  type="number"
                  min={1}
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
                />
              </label>
            )}
            {(form.type === "PRIVATE_RIDE" ||
              form.type === "CONTRACT" ||
              form.type === "WEDDING" ||
              form.type === "TOUR" ||
              form.type === "HOSPITAL" ||
              form.type === "AIRPORT") && (
              <label className="text-sm font-semibold">
                Loại xe
                <input className="input mt-1" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
              </label>
            )}
            {form.type === "CARGO" && (
              <label className="text-sm font-semibold sm:col-span-2">
                Mô tả hàng
                <textarea className="input mt-1" rows={2} value={form.cargoDescription} onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })} />
              </label>
            )}
            {form.type === "MARKET" && (
              <label className="text-sm font-semibold sm:col-span-2">
                Đồ cần mua
                <textarea className="input mt-1" rows={2} value={form.marketDescription} onChange={(e) => setForm({ ...form, marketDescription: e.target.value })} />
              </label>
            )}
            <label className="text-sm font-semibold sm:col-span-2">
              Ghi chú
              <textarea className="input mt-1" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>
            <label className="text-sm font-semibold">
              Trạng thái
              <select className="input mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(BOOKING_STATUS_VI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Ai thu tiền
              <select className="input mt-1" value={form.paymentReceiver} onChange={(e) => setForm({ ...form, paymentReceiver: e.target.value })}>
                <option value="DRIVER">Khách trả tài xế</option>
                <option value="ADMIN">Khách trả văn phòng</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Tổng tiền
              <input
                className="input mt-1"
                type="number"
                min={0}
                value={form.finalTotal}
                onChange={(e) => setForm({ ...form, finalTotal: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm font-semibold">
              Hoa hồng
              <input
                className="input mt-1"
                type="number"
                min={0}
                value={form.commissionAmount}
                onChange={(e) => setForm({ ...form, commissionAmount: Number(e.target.value) })}
              />
            </label>
          </div>
          {priceHint && (
            <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm text-brand-900">
              Giá tạm tính: <b>{formatMoney(priceHint.estimatedTotal)}</b>
              {priceHint.commissionAmount != null && (
                <>
                  {" "}
                  — Hoa hồng: <b>{formatMoney(priceHint.commissionAmount)}</b>
                </>
              )}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary py-2" disabled={saving} onClick={saveBooking}>
              {isNew ? "Tạo đơn" : "Lưu thay đổi"}
            </button>
            <button type="button" className="btn-secondary py-2" disabled={saving} onClick={recalcFromRules}>
              Tính lại từ bảng giá
            </button>
            {!isNew && (
              <button type="button" className="btn-secondary py-2" onClick={() => setForm(emptyBookingForm())}>
                Thêm đơn khác
              </button>
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
    location: u.driver?.location ?? "",
    direction: u.driver?.direction ?? "",
    seatsFree: Number(u.driver?.seatsFree ?? 0),
    note: u.driver?.note ?? u.customer?.note ?? "",
    vehicleType: u.driver?.vehicles?.[0]?.vehicleType ?? "",
    licensePlate: u.driver?.vehicles?.[0]?.licensePlate ?? "",
    vehicleSeats: Number(u.driver?.vehicles?.[0]?.seats ?? 7),
  };
}

export function AdminUsers() {
  const [items, setItems] = useState<any[]>([]);
  const [f, setF] = useState<any>({});
  const [form, setForm] = useState(emptyUserForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const isNew = creating && editId === null;
  const showForm = creating || editId !== null;

  const load = () => api.get("/admin/users", { params: f }).then((r) => setItems(r.data));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyUserForm());
    setEditId(null);
    setCreating(false);
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
      payload.location = form.location.trim() || null;
      payload.direction = form.direction.trim() || null;
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

  const resetPassword = async (id: number) => {
    const p = prompt("Mật khẩu mới (tối thiểu 6 ký tự)", "123456");
    if (!p) return;
    try {
      await api.post(`/admin/users/${id}/reset-password`, { password: p });
      alert("Đã đặt lại mật khẩu");
    } catch (e: any) {
      alert(e.response?.data?.message || "Không đổi được mật khẩu");
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
        <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
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
                <label className="text-sm font-semibold">
                  Vị trí hiện tại
                  <input className="input mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </label>
                <label className="text-sm font-semibold">
                  Chiều / khu vực nhận
                  <input className="input mt-1" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} />
                </label>
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
              <button type="button" className="btn-primary py-2" onClick={() => resetPassword(u.id)}>
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

const DRIVER_STATUS_OPTIONS = ["Rảnh", "Bận", "Đang chạy chuyến", "Nghỉ hôm nay"];

const emptyDriverForm = () => ({
  name: "",
  phone: "",
  zaloPhone: "",
  status: "Rảnh",
  location: "",
  direction: "",
  seatsFree: 0,
  note: "",
});

export function AdminDrivers() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(emptyDriverForm);
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => api.get("/admin/drivers").then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyDriverForm());
    setEditId(null);
  };

  const startEdit = (d: any) => {
    setEditId(d.id);
    setForm({
      name: d.name ?? "",
      phone: d.phone ?? "",
      zaloPhone: d.zaloPhone ?? "",
      status: d.status ?? "Rảnh",
      location: d.location ?? "",
      direction: d.direction ?? "",
      seatsFree: Number(d.seatsFree ?? 0),
      note: d.note ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const payload = () => {
    const phone = normalizeVnPhone(form.phone);
    if (!phone) throw new Error(PHONE_INVALID_MESSAGE);
    const zaloPhone = form.zaloPhone.trim() ? normalizeVnPhone(form.zaloPhone) : null;
    if (form.zaloPhone.trim() && !zaloPhone) throw new Error("Số Zalo phải đủ 10 chữ số, bắt đầu bằng 0");
    return {
    name: form.name.trim(),
    phone,
    zaloPhone,
    status: form.status,
    location: form.location.trim() || null,
    direction: form.direction.trim() || null,
    seatsFree: Number(form.seatsFree),
    note: form.note.trim() || null,
  };
  };

  const save = async () => {
    if (!editId) return;
    if (!form.name.trim() || !form.phone.trim()) return alert("Nhập tên và số điện thoại");
    try {
      await api.patch(`/admin/drivers/${editId}`, payload());
    } catch (e: any) {
      return alert(e.message || e.response?.data?.message || "Không lưu được");
    }
    alert("Đã cập nhật tài xế");
    resetForm();
    load();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Tài xế</h1>
      {editId && (
        <div className="card mt-5 grid gap-3 md:grid-cols-2">
          <p className="text-sm text-slate-600 md:col-span-2">Đang sửa tài xế #{editId}</p>
          <input className="input" placeholder="Họ tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input
            className="input"
            {...phoneInputProps}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
          />
          <input
            className="input"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="Zalo (10 số, tuỳ chọn)"
            value={form.zaloPhone}
            onChange={(e) => setForm({ ...form, zaloPhone: sanitizePhoneInput(e.target.value) })}
          />
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {DRIVER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input className="input" placeholder="Vị trí hiện tại" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="input md:col-span-2" placeholder="Chiều nhận" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} />
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Ghế trống"
            value={form.seatsFree}
            onChange={(e) => setForm({ ...form, seatsFree: Number(e.target.value) })}
          />
          <textarea className="input md:col-span-2" rows={2} placeholder="Ghi chú nội bộ" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button className="btn-primary" onClick={save}>
              Lưu thay đổi
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Hủy sửa
            </button>
          </div>
        </div>
      )}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((d) => (
          <div className={`card ${editId === d.id ? "ring-2 ring-brand-500" : ""}`} key={d.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <b>{d.name}</b>
                <p className="text-sm text-slate-600">
                  {d.phone}
                  {d.zaloPhone ? ` • Zalo ${d.zaloPhone}` : ""}
                </p>
                <p className="text-sm text-slate-600">
                  {d.status} • {d.location || "Chưa cập nhật vị trí"}
                </p>
                {d.direction && <p className="text-sm text-slate-600">Chiều: {d.direction}</p>}
                <p className="mt-2 text-sm">
                  Ghế trống: <b>{d.seatsFree}</b>
                  {d.user?.phone && (
                    <>
                      {" "}
                      • Tài khoản: {d.user.phone} ({userStatus(d.user.status)})
                    </>
                  )}
                </p>
                {d.vehicles?.length > 0 && (
                  <p className="mt-1 text-sm text-slate-500">
                    Xe: {d.vehicles.map((v: any) => `${v.vehicleType} ${v.seats} chỗ${v.licensePlate ? ` • ${v.licensePlate}` : ""}`).join("; ")}
                  </p>
                )}
                {d.note && <p className="mt-2 text-sm italic text-slate-500">{d.note}</p>}
              </div>
              <button type="button" className="btn-secondary shrink-0 py-2" onClick={() => startEdit(d)}>
                Sửa
              </button>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-slate-500 md:col-span-2">Chưa có tài xế.</p>}
      </div>
    </div>
  );
}

export function AdminTrips() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api.get("/admin/trips").then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);
  const setStatus = async (id: number, status: string) => {
    if (status === "COMPLETED" && !confirm("Hoàn thành chuyến? Hệ thống chốt hoa hồng và đặt tài xế Rảnh tại điểm đến.")) return;
    const r = await api.patch(`/admin/trips/${id}`, { status });
    if (status === "COMPLETED" && r.data?.message) alert(r.data.message);
    load();
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">Danh sách chuyến</h1>
      <p className="mt-2 text-sm text-slate-600">Gom và gán khách tại menu <b>Điều phối</b> (3 cột).</p>
      <div className="mt-5 grid gap-3">
        {items.map((t) => (
          <div className="card" key={t.id}>
            <div className="flex justify-between gap-3">
              <div><b>{t.code} - {t.route?.name}</b><p className="text-sm text-slate-600">{new Date(t.departureAt).toLocaleString("vi-VN")} • {t.driver?.name || "Chưa gán tài xế"}</p></div>
              <select className="input w-auto py-1 text-sm" value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}>
                {Object.entries(TRIP_STATUS_VI).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
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
        <input className="input" placeholder="Mã tài xế" onChange={(e) => setF({ ...f, driverId: e.target.value })} />
        <select className="input" onChange={(e) => setF({ ...f, routeId: e.target.value })}><option value="">Tất cả tuyến</option>{routes.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}</select>
        <select className="input" onChange={(e) => setF({ ...f, serviceType: e.target.value || undefined })}>
          <option value="">Dịch vụ</option>
          {SERVICE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button className="btn-secondary" onClick={load}>Lọc báo cáo</button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-5">
        <div className="card"><p>Tổng chuyến</p><b className="text-2xl">{r?.totalTrips}</b></div>
        <div className="card"><p>Doanh thu</p><b>{formatMoney(r?.totalRevenue)}</b></div>
        <div className="card"><p>Hoa hồng</p><b>{formatMoney(r?.totalCommission)}</b></div>
        <div className="card"><p>Tài xế nợ văn phòng</p><b className="text-red-600">{formatMoney(r?.totalDriverDebt)}</b></div>
        <div className="card"><p>Văn phòng trả tài xế</p><b className="text-cta">{formatMoney(r?.totalAdminOwesDriver)}</b></div>
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
      <h1 className="text-3xl font-bold">Cài đặt website</h1>
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
