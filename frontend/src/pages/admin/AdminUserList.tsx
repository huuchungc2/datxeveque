import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { AdminListPager } from "../../components/admin/AdminListPager";
import { AdminResetPasswordModal, type ResetPasswordTarget } from "../../components/admin/AdminResetPasswordModal";
import { api, parsePaginated } from "../../lib/api";
import { USER_ROLE_VI, USER_STATUS_VI, userRole, userStatus } from "../../lib/vi";

export function AdminUserList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 1 });
  const [qDraft, setQDraft] = useState(searchParams.get("q") || "");
  const [resetTarget, setResetTarget] = useState<ResetPasswordTarget | null>(null);

  const q = searchParams.get("q") || "";
  const role = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const load = useCallback(() => {
    setLoading(true);
    return api
      .get("/admin/users", {
        params: {
          page,
          pageSize: 15,
          q: q || undefined,
          role: role || undefined,
          status: status || undefined,
        },
      })
      .then((r) => {
        const p = parsePaginated(r.data);
        setItems(p.items);
        setMeta({ page: p.page, pageSize: p.pageSize, total: p.total, totalPages: p.totalPages });
      })
      .finally(() => setLoading(false));
  }, [page, q, role, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setQDraft(q);
  }, [q]);

  const applyFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (qDraft.trim()) next.set("q", qDraft.trim());
    else next.delete("q");
    next.set("page", "1");
    setSearchParams(next);
  };

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  };

  const setPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(p));
    setSearchParams(next);
  };

  const toggleLock = async (u: any) => {
    const next = u.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    await api.patch(`/admin/users/${u.id}/status`, { status: next });
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-slate-600">Nhân viên, tài xế, khách — thêm/sửa trên màn hình riêng.</p>
        </div>
        <Link to="/admin/users/moi" className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> Thêm người dùng
        </Link>
      </div>

      <div className="card mt-5 grid gap-3 md:grid-cols-4">
        <input
          className="input md:col-span-2"
          placeholder="Tìm tên / SĐT / email"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
        <select className="input" value={role} onChange={(e) => setFilter("role", e.target.value)}>
          <option value="">Tất cả vai trò</option>
          {Object.entries(USER_ROLE_VI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="input" value={status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(USER_STATUS_VI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 md:col-span-4">
          <button type="button" className="btn-primary py-2" onClick={applyFilters}>
            Áp dụng lọc
          </button>
          <button type="button" className="btn-secondary py-2" onClick={() => setSearchParams({})}>
            Xóa lọc
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        <b className="text-ink-900">{meta.total}</b> người dùng
        {meta.totalPages > 1 && (
          <>
            {" "}
            · Trang <b className="text-ink-900">{meta.page}</b>/{meta.totalPages}
          </>
        )}
      </p>

      <div className="card mt-3 hidden overflow-hidden !p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Liên hệ</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-semibold text-ink-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.phone}
                    {u.email ? <span className="block text-xs">{u.email}</span> : null}
                  </td>
                  <td className="px-4 py-3">{userRole(u.role)}</td>
                  <td className="px-4 py-3">{userStatus(u.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link to={`/admin/users/${u.id}`} className="btn-ghost py-1.5 px-2.5 text-xs">
                        Sửa
                      </Link>
                      <button type="button" className="btn-ghost py-1.5 px-2.5 text-xs" onClick={() => toggleLock(u)}>
                        {u.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                      </button>
                      <button type="button" className="btn-ghost py-1.5 px-2.5 text-xs" onClick={() => setResetTarget({ userId: u.id, label: `${u.name} · ${u.phone}` })}>
                        Đặt lại MK
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !items.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Không có người dùng phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:hidden">
        {items.map((u) => (
          <div className="card" key={u.id}>
            <b>{u.name}</b>
            <p className="text-sm text-slate-600">
              {u.phone} · {userRole(u.role)} · {userStatus(u.status)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/admin/users/${u.id}`} className="btn-secondary flex-1 py-2 text-center text-sm">
                Sửa
              </Link>
              <button type="button" className="btn-secondary flex-1 py-2 text-sm" onClick={() => toggleLock(u)}>
                {u.status === "ACTIVE" ? "Khóa" : "Mở"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <AdminListPager page={meta.page} totalPages={meta.totalPages} loading={loading} onPage={setPage} />
      </div>

      {resetTarget && (
        <AdminResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} onSuccess={(m) => alert(m)} />
      )}
    </div>
  );
}
