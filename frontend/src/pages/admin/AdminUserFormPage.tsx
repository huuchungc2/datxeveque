import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { adminResetUserPassword, validateAdminNewPassword } from "../../components/admin/AdminResetPasswordModal";
import { api } from "../../lib/api";
import { DRIVER_STATUS_OPTIONS, USER_FORM_ROLES, emptyUserForm, userToForm } from "../../lib/adminUserForm";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../../lib/phone";
import { runDirectionLabel } from "../../lib/runDirection";
import { USER_ROLE_VI, USER_STATUS_VI } from "../../lib/vi";

export function AdminUserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "moi";
  const editId = isNew ? null : Number(id);

  const [form, setForm] = useState(emptyUserForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const isDriver = form.role === "DRIVER";
  const isCustomer = form.role === "CUSTOMER";
  const isStaff = form.role === "ADMIN" || form.role === "DISPATCHER" || form.role === "ACCOUNTANT";

  useEffect(() => {
    if (isNew || !editId) return;
    setLoading(true);
    api
      .get(`/admin/users/${editId}`)
      .then((r) => setForm(userToForm(r.data)))
      .catch(() => {
        alert("Không tải được người dùng");
        navigate("/admin/users");
      })
      .finally(() => setLoading(false));
  }, [editId, isNew, navigate]);

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
      if (!form.runDirection) throw new Error("Tài xế cần chọn chiều chạy");
      payload.runDirection = form.runDirection;
      payload.seatsFree = Number(form.seatsFree);
      if (isNew) {
        payload.vehicleType = form.vehicleType.trim() || null;
        payload.licensePlate = form.licensePlate.trim() || null;
        payload.vehicleSeats = Number(form.vehicleSeats);
      }
    }

    if (isNew) {
      if (!form.password || form.password.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự");
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
      } else {
        await api.patch(`/admin/users/${editId}`, payload);
        alert("Đã lưu người dùng");
      }
      navigate("/admin/users");
    } catch (e: any) {
      alert(e.message || e.response?.data?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
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

  if (loading) return <p className="text-sm text-slate-500">Đang tải…</p>;

  return (
    <div>
      <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-700">
        <ArrowLeft size={16} /> Danh sách người dùng
      </Link>

      <h1 className="section-title">{isNew ? "Thêm người dùng" : `Sửa người dùng #${editId}`}</h1>

      <div className="card mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold">
          Vai trò *
          <select className="input mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={!isNew}>
            {USER_FORM_ROLES.map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_VI[r]}
              </option>
            ))}
          </select>
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
          <input className="input mt-1" {...phoneInputProps} value={form.phone} onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })} />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          Email
          <input className="input mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        {isNew && (
          <label className="text-sm font-semibold md:col-span-2">
            Mật khẩu *
            <input className="input mt-1" type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
        )}

        {!isNew && editId && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:col-span-2">
            <p className="text-sm font-bold text-slate-800">Đổi mật khẩu</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input className="input" type="password" placeholder="Mật khẩu mới" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
              <input className="input" type="password" placeholder="Nhập lại" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} />
            </div>
            {pwError && <p className="mt-2 text-sm text-red-700">{pwError}</p>}
            <button type="button" className="btn-secondary mt-3" disabled={pwSaving} onClick={savePasswordInForm}>
              Cập nhật mật khẩu
            </button>
          </div>
        )}

        {isStaff && <p className="text-sm text-slate-600 md:col-span-2">Tài khoản nhân viên đăng nhập bằng SĐT + mật khẩu.</p>}

        {isDriver && (
          <>
            <label className="text-sm font-semibold">
              Zalo
              <input className="input mt-1" {...phoneInputProps} value={form.zaloPhone} onChange={(e) => setForm({ ...form, zaloPhone: sanitizePhoneInput(e.target.value) })} />
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
              Chiều chạy *
              <select className="input mt-1" value={form.runDirection} onChange={(e) => setForm({ ...form, runDirection: e.target.value as typeof form.runDirection })}>
                <option value="">— Chọn —</option>
                <option value="SG_TO_PROVINCE">Sài Gòn → Đức Linh / Tánh Linh</option>
                <option value="PROVINCE_TO_SG">Đức Linh / Tánh Linh → Sài Gòn</option>
              </select>
              {form.runDirection && <span className="mt-1 block text-xs text-slate-500">{runDirectionLabel(form.runDirection)}</span>}
            </label>
            <label className="text-sm font-semibold">
              Ghế trống báo
              <input className="input mt-1" type="number" min={0} value={form.seatsFree} onChange={(e) => setForm({ ...form, seatsFree: Number(e.target.value) })} />
            </label>
            {isNew && (
              <>
                <label className="text-sm font-semibold">
                  Loại xe
                  <input className="input mt-1" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
                </label>
                <label className="text-sm font-semibold">
                  Biển số
                  <input className="input mt-1" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
                </label>
                <label className="text-sm font-semibold">
                  Số chỗ
                  <input className="input mt-1" type="number" min={1} value={form.vehicleSeats} onChange={(e) => setForm({ ...form, vehicleSeats: Number(e.target.value) })} />
                </label>
              </>
            )}
          </>
        )}

        {isCustomer && (
          <label className="text-sm font-semibold md:col-span-2">
            Zalo
            <input className="input mt-1" {...phoneInputProps} value={form.zaloPhone} onChange={(e) => setForm({ ...form, zaloPhone: sanitizePhoneInput(e.target.value) })} />
          </label>
        )}

        <label className="text-sm font-semibold md:col-span-2">
          Ghi chú
          <textarea className="input mt-1" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button type="button" className="btn-primary" disabled={saving} onClick={saveUser}>
            {isNew ? "Tạo tài khoản" : "Lưu thay đổi"}
          </button>
          <Link to="/admin/users" className="btn-secondary">
            Hủy
          </Link>
        </div>
      </div>
    </div>
  );
}
