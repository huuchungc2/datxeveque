import { useEffect, useState } from "react";
import { KeyRound, UserCircle } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { userRole } from "../lib/vi";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { PageIntro } from "../components/ui/DesignKit";

type Profile = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  role: string;
  zaloPhone: string | null;
};

export function AccountProfilePage() {
  const { user, reload } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    zaloPhone: "",
  });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  const showZalo = user?.role === "CUSTOMER" || user?.role === "DRIVER";

  useEffect(() => {
    setLoading(true);
    api
      .get("/auth/profile")
      .then((r) => {
        const p = r.data as Profile;
        setProfile(p);
        setForm({
          name: p.name || "",
          phone: p.phone || "",
          email: p.email || "",
          address: p.address || "",
          zaloPhone: p.zaloPhone || "",
        });
      })
      .catch((e) => setProfileErr(e.response?.data?.message || "Không tải được thông tin"))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    const phone = normalizeVnPhone(form.phone);
    if (!phone) return setProfileErr(PHONE_INVALID_MESSAGE);
    if (!form.name.trim()) return setProfileErr("Vui lòng nhập họ tên");

    setSavingProfile(true);
    try {
      const res = await api.patch("/auth/profile", {
        name: form.name.trim(),
        phone,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        zaloPhone: showZalo ? form.zaloPhone.trim() || null : undefined,
      });
      setProfile(res.data.profile);
      setProfileMsg(res.data.message || "Đã lưu thông tin");
      await reload();
    } catch (err: any) {
      setProfileErr(err.response?.data?.message || "Không lưu được");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg("");
    setPwdErr("");
    if (!pwd.current.trim()) return setPwdErr("Nhập mật khẩu hiện tại");
    if (pwd.next.length < 6) return setPwdErr("Mật khẩu mới tối thiểu 6 ký tự");
    if (pwd.next !== pwd.confirm) return setPwdErr("Mật khẩu mới không khớp");

    setSavingPwd(true);
    try {
      const res = await api.post("/auth/change-password", {
        currentPassword: pwd.current,
        newPassword: pwd.next,
      });
      setPwdMsg(res.data.message || "Đã đổi mật khẩu");
      setPwd({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      setPwdErr(err.response?.data?.message || "Không đổi được mật khẩu");
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageIntro title="Tài khoản của tôi" subtitle="Đang tải..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageIntro
        title="Tài khoản của tôi"
        subtitle="Cập nhật họ tên, số điện thoại, địa chỉ và mật khẩu đăng nhập."
      />

      {profile && (
        <p className="text-sm text-slate-600">
          Vai trò: <b>{userRole(profile.role)}</b> • SĐT đăng nhập: <b>{profile.phone}</b>
        </p>
      )}

      <form className="panel space-y-4" onSubmit={saveProfile}>
        <div className="flex items-center gap-2 font-bold text-brand-900">
          <UserCircle size={20} />
          Thông tin cá nhân
        </div>

        {profileErr && <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{profileErr}</div>}
        {profileMsg && (
          <div className="rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-800">{profileMsg}</div>
        )}

        <label className="block font-bold">
          Họ và tên
          <input
            className="input mt-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoComplete="name"
          />
        </label>

        <label className="block font-bold">
          Số điện thoại đăng nhập
          <input
            className="input mt-2"
            {...phoneInputProps}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
            required
          />
        </label>

        {showZalo && (
          <label className="block font-bold">
            Số Zalo (tuỳ chọn)
            <input
              className="input mt-2"
              {...phoneInputProps}
              placeholder="0901234567"
              value={form.zaloPhone}
              onChange={(e) => setForm({ ...form, zaloPhone: sanitizePhoneInput(e.target.value) })}
            />
          </label>
        )}

        <label className="block font-bold">
          Email (tuỳ chọn)
          <input
            className="input mt-2"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            placeholder="email@example.com"
          />
        </label>

        <label className="block font-bold">
          Địa chỉ thường trú / nhận hàng (tuỳ chọn)
          <textarea
            className="input mt-2 min-h-[88px]"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Số nhà, ấp/xã, huyện, tỉnh..."
          />
        </label>

        <button type="submit" className="btn-primary" disabled={savingProfile}>
          {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
        </button>
      </form>

      <form className="panel space-y-4" onSubmit={savePassword}>
        <div className="flex items-center gap-2 font-bold text-brand-900">
          <KeyRound size={20} />
          Đổi mật khẩu
        </div>
        <p className="text-sm text-slate-600">Quên mật khẩu: liên hệ admin để được reset (không tự reset công khai).</p>

        {pwdErr && <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{pwdErr}</div>}
        {pwdMsg && <div className="rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-800">{pwdMsg}</div>}

        <label className="block font-bold">
          Mật khẩu hiện tại
          <input
            className="input mt-2"
            type="password"
            autoComplete="current-password"
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
            required
          />
        </label>
        <label className="block font-bold">
          Mật khẩu mới
          <input
            className="input mt-2"
            type="password"
            autoComplete="new-password"
            value={pwd.next}
            onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            minLength={6}
            required
          />
        </label>
        <label className="block font-bold">
          Nhập lại mật khẩu mới
          <input
            className="input mt-2"
            type="password"
            autoComplete="new-password"
            value={pwd.confirm}
            onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            minLength={6}
            required
          />
        </label>
        <button type="submit" className="btn-secondary" disabled={savingPwd}>
          {savingPwd ? "Đang đổi..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
}
