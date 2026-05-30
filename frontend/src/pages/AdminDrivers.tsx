import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Lock, LockOpen, MapPin, Pencil, Search, Truck, Users } from "lucide-react";
import { adminResetUserPassword, validateAdminNewPassword } from "../components/admin/AdminResetPasswordModal";
import { api } from "../lib/api";
import { fmtDepartureTime } from "../lib/datetime";
import { getVisiblePageNumbers } from "../lib/paginationUi";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { useAuth } from "../lib/auth";
import { runDirectionLabel, type RunDirection } from "../lib/runDirection";
import { userStatus } from "../lib/vi";
import { EmptyState, PageIntro } from "../components/ui/DesignKit";

const DRIVER_STATUS_OPTIONS = ["Rảnh", "Bận", "Đang chạy chuyến", "Nghỉ hôm nay"];

const emptyDriverForm = () => ({
  name: "",
  phone: "",
  zaloPhone: "",
  status: "Rảnh",
  runDirection: "" as "" | RunDirection,
  location: "",
  direction: "",
  seatsFree: 0,
  note: "",
});

function driverStatusBadge(status?: string) {
  const s = status || "";
  if (s === "Rảnh") return "badge-success";
  if (s === "Bận" || s === "Nghỉ hôm nay") return "badge-warning";
  if (s === "Đang chạy chuyến") return "badge-info";
  return "badge-info";
}

type DriverRow = {
  id: number;
  name: string;
  phone: string;
  zaloPhone?: string | null;
  status: string;
  location?: string | null;
  direction?: string | null;
  seatsFree: number;
  routeId?: number | null;
  runDirection?: string | null;
  route?: { id: number; name: string; direction?: string } | null;
  note?: string | null;
  user?: { id: number; phone: string; status: string; name?: string } | null;
  vehicles?: { vehicleType: string; seats: number; licensePlate?: string | null }[];
};

export function AdminDrivers() {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "ADMIN";
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<DriverRow[]>([]);
  const [seatLogs, setSeatLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [form, setForm] = useState(emptyDriverForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const accountStatus = searchParams.get("accountStatus") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const load = useCallback(() => {
    setLoading(true);
    return api
      .get("/admin/drivers", {
        params: {
          page,
          limit: 15,
          q: q || undefined,
          status: status || undefined,
          accountStatus: accountStatus || undefined,
        },
      })
      .then((r) => {
        const data = r.data;
        if (Array.isArray(data)) {
          setItems(data);
          setMeta({ page: 1, limit: data.length, total: data.length, totalPages: 1 });
        } else {
          setItems(data.items || []);
          setMeta({
            page: data.page || 1,
            limit: data.limit || 15,
            total: data.total || 0,
            totalPages: data.totalPages || 1,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [page, q, status, accountStatus]);

  const loadSeatLogs = () =>
    api.get("/admin/driver-seat-logs", { params: { limit: 20 } }).then((r) => setSeatLogs(r.data?.items || []));

  useEffect(() => {
    setQDraft(q);
  }, [q]);

  useEffect(() => {
    load();
    loadSeatLogs();
  }, [load]);

  const setFilter = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    if (!patch.page) next.set("page", "1");
    setSearchParams(next);
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next);
  };

  const resetForm = () => {
    setForm(emptyDriverForm());
    setEditId(null);
    setPwNew("");
    setPwConfirm("");
    setPwError("");
  };

  const startEdit = (d: DriverRow) => {
    setPwNew("");
    setPwConfirm("");
    setPwError("");
    setEditId(d.id);
    setForm({
      name: d.name ?? "",
      phone: d.phone ?? "",
      zaloPhone: d.zaloPhone ?? "",
      status: d.status ?? "Rảnh",
      runDirection:
        d.runDirection === "SG_TO_PROVINCE" || d.runDirection === "PROVINCE_TO_SG"
          ? d.runDirection
          : "",
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
      runDirection: form.runDirection || undefined,
      note: form.note.trim() || null,
    };
  };

  const save = async () => {
    if (!editId) return;
    if (!form.name.trim() || !form.phone.trim()) return alert("Nhập tên và số điện thoại");
    if (!form.runDirection) return alert("Chọn chiều chạy cho tài xế");
    setBusy(true);
    try {
      await api.patch(`/admin/drivers/${editId}`, payload());
      setMsg("Đã cập nhật tài xế");
      resetForm();
      await load();
    } catch (e: any) {
      alert(e.message || e.response?.data?.message || "Không lưu được");
    } finally {
      setBusy(false);
    }
  };

  const editingDriver = editId ? items.find((d) => d.id === editId) : null;
  const editingUserId = editingDriver?.user?.id;

  const savePasswordInForm = async () => {
    if (!editingUserId) return;
    const err = validateAdminNewPassword(pwNew, pwConfirm);
    if (err) {
      setPwError(err);
      return;
    }
    setPwSaving(true);
    setPwError("");
    try {
      await adminResetUserPassword(editingUserId, pwNew);
      setPwNew("");
      setPwConfirm("");
      setMsg("Đã đặt lại mật khẩu");
    } catch (e: any) {
      setPwError(e.response?.data?.message || "Không đổi được mật khẩu");
    } finally {
      setPwSaving(false);
    }
  };

  const toggleLock = async (d: DriverRow) => {
    if (!d.user?.id) return alert("Tài xế chưa có tài khoản — tạo tại menu Người dùng (vai trò Tài xế).");
    const next = d.user.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    const label = next === "LOCKED" ? "khóa" : "mở khóa";
    if (!confirm(`${next === "LOCKED" ? "Khóa" : "Mở khóa"} tài khoản ${d.name}? Tài xế sẽ ${next === "LOCKED" ? "không" : ""} đăng nhập được.`)) return;
    setBusy(true);
    try {
      await api.patch(`/admin/drivers/${d.id}/account-status`, { status: next });
      setMsg(next === "LOCKED" ? `Đã khóa ${d.name}` : `Đã mở khóa ${d.name}`);
      await load();
    } catch (e: any) {
      alert(e.response?.data?.message || "Không đổi được trạng thái tài khoản");
    } finally {
      setBusy(false);
    }
  };

  const vehicleSummary = (d: DriverRow) => {
    if (!d.vehicles?.length) return "—";
    return d.vehicles.map((v) => `${v.vehicleType || "Xe"} ${v.seats} chỗ${v.licensePlate ? ` · ${v.licensePlate}` : ""}`).join("; ");
  };

  return (
    <div className="space-y-6">
      <PageIntro
        title="Danh sách tài xế"
        subtitle="Theo dõi trạng thái rảnh/bận, xe và khóa tài khoản đăng nhập. Tạo tài xế mới tại menu Người dùng."
        actions={
          <Link className="btn-primary py-2" to="/admin/users">
            + Tạo tài khoản tài xế
          </Link>
        }
      />

      {msg && (
        <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900" role="status">
          {msg}
        </p>
      )}

      {editId && (
        <div className="card border-2 border-brand-200">
          <p className="text-sm font-bold text-brand-800">Sửa tài xế #{editId}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
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
              placeholder="Zalo (tuỳ chọn)"
              value={form.zaloPhone}
              onChange={(e) => setForm({ ...form, zaloPhone: sanitizePhoneInput(e.target.value) })}
            />
            <label className="text-sm font-semibold">
              Trạng thái (tài xế tự cập nhật trên app)
              <input className="input mt-1 bg-slate-50" readOnly value={form.status} />
            </label>
            <label className="text-sm font-semibold">
              Ghế báo rảnh (tài xế tự cập nhật)
              <input className="input mt-1 bg-slate-50" readOnly type="number" value={form.seatsFree} />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Chiều chạy (mọi tuyến cùng chiều) <span className="text-red-600">*</span>
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
                Vị trí đón: <b>{form.location || "—"}</b> · {form.direction || runDirectionLabel(form.runDirection)}
              </p>
            )}
            <textarea className="input md:col-span-2" rows={2} placeholder="Ghi chú nội bộ" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            {isAdmin && editingUserId && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:col-span-2">
                <p className="text-sm font-bold text-slate-800">Đổi mật khẩu đăng nhập</p>
                <p className="mt-1 text-xs text-slate-500">
                  Tài khoản: <b>{editingDriver?.name}</b> · {editingDriver?.user?.phone || editingDriver?.phone} — chỉ admin, mật khẩu không hiển thị lại sau khi lưu.
                </p>
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
                <button type="button" className="btn-secondary mt-3" disabled={pwSaving || busy} onClick={savePasswordInForm}>
                  {pwSaving ? "Đang lưu…" : "Cập nhật mật khẩu"}
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button type="button" className="btn-primary" disabled={busy} onClick={save}>
                Lưu
              </button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={resetForm}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card grid gap-3 md:grid-cols-4">
        <label className="md:col-span-2">
          <span className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
            <Search size={14} /> Tìm kiếm
          </span>
          <input
            className="input"
            placeholder="Tên, SĐT, Zalo, vị trí..."
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFilter({ q: qDraft.trim() || undefined });
            }}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Trạng thái tài xế</span>
          <select className="input" value={status} onChange={(e) => setFilter({ status: e.target.value || undefined })}>
            <option value="">Tất cả</option>
            {DRIVER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Tài khoản</span>
          <select
            className="input"
            value={accountStatus}
            onChange={(e) => setFilter({ accountStatus: e.target.value || undefined })}
          >
            <option value="">Tất cả</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
            <option value="NO_ACCOUNT">Chưa có TK</option>
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 md:col-span-4">
          <button type="button" className="btn-primary py-2" onClick={() => setFilter({ q: qDraft.trim() || undefined })}>
            Lọc
          </button>
          <button
            type="button"
            className="btn-ghost py-2"
            onClick={() => {
              setQDraft("");
              setSearchParams(new URLSearchParams({ page: "1" }));
              setMsg("");
            }}
          >
            Xóa lọc
          </button>
          <span className="ml-auto text-sm text-slate-600">
            <b>{meta.total}</b> tài xế
          </span>
        </div>
      </div>

      {loading ? (
        <div className="card py-12 text-center text-sm text-slate-500">Đang tải...</div>
      ) : !items.length ? (
        <EmptyState
          title="Không có tài xế"
          subtitle="Thử đổi bộ lọc hoặc tạo tài khoản vai trò Tài xế."
          icon={<Users size={26} />}
          action={
            <Link className="btn-primary py-2" to="/admin/users">
              Tạo tài xế
            </Link>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tài xế</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Chiều chạy</th>
                  <th className="px-4 py-3">Xe</th>
                  <th className="px-4 py-3">Ghế báo</th>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((d) => {
                  const locked = d.user?.status === "LOCKED";
                  return (
                    <tr key={d.id} className={`hover:bg-slate-50/80 ${locked ? "bg-red-50/40" : ""} ${editId === d.id ? "bg-brand-50/60" : ""}`}>
                      <td className="px-4 py-3">
                        <b className="text-brand-900">{d.name}</b>
                        <p className="text-slate-600">
                          {d.phone}
                          {d.zaloPhone ? ` · Zalo ${d.zaloPhone}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${driverStatusBadge(d.status)}`}>{d.status}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[14rem]">
                        <p className="font-semibold text-slate-800">
                          {d.runDirection === "SG_TO_PROVINCE" || d.runDirection === "PROVINCE_TO_SG"
                            ? runDirectionLabel(d.runDirection)
                            : d.direction || "Chưa chọn chiều"}
                        </p>
                        {d.location && (
                          <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
                            <MapPin size={12} className="mt-0.5 shrink-0" />
                            {d.location}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-slate-700">
                          <Truck size={14} className="text-slate-400" />
                          {vehicleSummary(d)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">{d.seatsFree}</td>
                      <td className="px-4 py-3">
                        {d.user ? (
                          <span className={locked ? "badge badge-danger" : "badge badge-success"}>
                            {userStatus(d.user.status)}
                          </span>
                        ) : (
                          <span className="badge badge-warning">Chưa có TK</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => startEdit(d)} title="Sửa">
                            <Pencil size={14} />
                          </button>
                          {isAdmin && d.user && (
                            <>
                              <button
                                type="button"
                                className={`btn-ghost py-1.5 text-xs ${locked ? "text-green-700" : "text-red-700"}`}
                                disabled={busy}
                                onClick={() => toggleLock(d)}
                                title={locked ? "Mở khóa" : "Khóa"}
                              >
                                {locked ? <LockOpen size={14} /> : <Lock size={14} />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {items.map((d) => {
              const locked = d.user?.status === "LOCKED";
              return (
                <div
                  key={d.id}
                  className={`card ${locked ? "border-red-200 bg-red-50/30" : ""} ${editId === d.id ? "ring-2 ring-brand-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <b className="text-lg">{d.name}</b>
                      <p className="text-sm text-slate-600">{d.phone}</p>
                    </div>
                    <span className={`badge ${driverStatusBadge(d.status)}`}>{d.status}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {d.runDirection === "SG_TO_PROVINCE" || d.runDirection === "PROVINCE_TO_SG"
                      ? runDirectionLabel(d.runDirection)
                      : "Chưa chọn chiều"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    <MapPin size={14} className="mr-1 inline" />
                    {d.location || "Chưa báo vị trí"}
                  </p>
                  <p className="mt-1 text-sm">
                    Xe: {vehicleSummary(d)} · Ghế báo: <b>{d.seatsFree}</b>
                  </p>
                  <p className="mt-2">
                    {d.user ? (
                      <span className={locked ? "badge badge-danger" : "badge badge-success"}>{userStatus(d.user.status)}</span>
                    ) : (
                      <span className="badge badge-warning">Chưa có tài khoản</span>
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary py-2 text-sm" onClick={() => startEdit(d)}>
                      Sửa
                    </button>
                    {isAdmin && d.user && (
                      <>
                        <button
                          type="button"
                          className={locked ? "btn-secondary py-2 text-sm" : "btn-ghost py-2 text-sm text-red-700"}
                          disabled={busy}
                          onClick={() => toggleLock(d)}
                        >
                          {locked ? "Mở khóa" : "Khóa TK"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {meta.totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Phân trang tài xế">
              <button
                type="button"
                className="btn-secondary min-w-[2.5rem] px-3 py-2 text-sm"
                disabled={meta.page <= 1}
                onClick={() => setPage(meta.page - 1)}
              >
                ‹
              </button>
              {getVisiblePageNumbers(meta.page, meta.totalPages).map((p, i) =>
                p === "ellipsis" ? (
                  <span key={`e-${i}`} className="px-2 text-sm text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`min-w-[2.5rem] rounded-xl px-3 py-2 text-sm font-bold transition ${
                      p === meta.page ? "bg-brand-700 text-white shadow-sm" : "btn-secondary"
                    }`}
                    onClick={() => setPage(p)}
                    aria-current={p === meta.page ? "page" : undefined}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                type="button"
                className="btn-secondary min-w-[2.5rem] px-3 py-2 text-sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage(meta.page + 1)}
              >
                ›
              </button>
            </nav>
          )}
        </>
      )}

      <div className="card">
        <h2 className="text-lg font-extrabold text-ink-900">Lịch sử cập nhật ghế (mới nhất)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase text-slate-500">
                <th className="py-2">Thời gian</th>
                <th className="py-2">Tài xế</th>
                <th className="py-2">Chuyến</th>
                <th className="py-2">Ghế</th>
                <th className="py-2">Lý do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {seatLogs.map((row) => (
                <tr key={row.id}>
                  <td className="py-2">{fmtDepartureTime(row.createdAt)}</td>
                  <td className="py-2">{row.driver?.name}</td>
                  <td className="py-2">{row.trip?.code || "—"}</td>
                  <td className="py-2">
                    {row.oldAvailableSeats} → <b>{row.newAvailableSeats}</b>
                  </td>
                  <td className="py-2">{row.reason || "—"}</td>
                </tr>
              ))}
              {!seatLogs.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    Chưa có log.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
