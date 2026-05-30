import { useState } from "react";
import { api } from "../../lib/api";

export const ADMIN_PASSWORD_MIN_LENGTH = 6;

export type ResetPasswordTarget = { userId: number; label: string };

export function validateAdminNewPassword(password: string, confirm: string): string | null {
  const p = password.trim();
  if (p.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return `Mật khẩu tối thiểu ${ADMIN_PASSWORD_MIN_LENGTH} ký tự`;
  }
  if (p !== confirm.trim()) return "Mật khẩu nhập lại không khớp";
  return null;
}

export async function adminResetUserPassword(userId: number, password: string) {
  await api.post(`/admin/users/${userId}/reset-password`, { password: password.trim() });
}

type Props = {
  target: ResetPasswordTarget;
  onClose: () => void;
  onSuccess?: (message: string) => void;
};

export function AdminResetPasswordModal({ target, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const err = validateAdminNewPassword(password, confirm);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await adminResetUserPassword(target.userId, password);
      onSuccess?.("Đã đặt lại mật khẩu");
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || "Không đổi được mật khẩu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Đóng" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md shadow-xl" role="dialog" aria-modal="true" aria-labelledby="reset-pw-title">
        <h2 id="reset-pw-title" className="text-lg font-bold text-ink-900">
          Đặt lại mật khẩu
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Tài khoản: <b>{target.label}</b>
        </p>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-semibold">
            Mật khẩu mới *
            <input
              className="input mt-1"
              type="password"
              autoComplete="new-password"
              minLength={ADMIN_PASSWORD_MIN_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="text-sm font-semibold">
            Nhập lại mật khẩu *
            <input
              className="input mt-1"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={saving} onClick={submit}>
            {saving ? "Đang lưu…" : "Lưu mật khẩu"}
          </button>
          <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
