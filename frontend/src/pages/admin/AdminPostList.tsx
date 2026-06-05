import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { AdminListPager } from "../../components/admin/AdminListPager";
import { api, parsePaginated } from "../../lib/api";
import { postStatus } from "../../lib/vi";
import type { PostRow } from "../../lib/adminPostShared";

type Category = { id: number; name: string };

export function AdminPostList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<PostRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 1 });
  const [qDraft, setQDraft] = useState(searchParams.get("q") || "");

  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const load = useCallback(() => {
    setLoading(true);
    return api
      .get("/admin/posts", {
        params: {
          page,
          pageSize: 15,
          q: q || undefined,
          status: status || undefined,
          categoryId: categoryId || undefined,
        },
      })
      .then((r) => {
        const p = parsePaginated<PostRow>(r.data);
        setItems(p.items);
        setMeta({ page: p.page, pageSize: p.pageSize, total: p.total, totalPages: p.totalPages });
      })
      .finally(() => setLoading(false));
  }, [page, q, status, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get("/admin/post-categories").then((r) => setCategories(r.data));
  }, []);

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

  const publish = async (id: number) => {
    await api.patch(`/admin/posts/${id}`, { status: "PUBLISHED" });
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">Bài viết</h1>
          <p className="mt-1 text-sm text-slate-600">Danh sách bài kinh nghiệm — thêm hoặc sửa trên màn hình riêng.</p>
        </div>
        <Link to="/admin/noi-dung/bai-viet/moi" className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> Thêm bài viết
        </Link>
      </div>

      <div className="card mt-5 grid gap-3 md:grid-cols-4">
        <input
          className="input md:col-span-2"
          placeholder="Tìm tiêu đề, slug, mô tả…"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
        <select className="input" value={status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="PUBLISHED">Đã xuất bản</option>
        </select>
        <select className="input" value={categoryId} onChange={(e) => setFilter("categoryId", e.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
        <b className="text-ink-900">{meta.total}</b> bài
        {meta.totalPages > 1 && (
          <>
            {" "}
            · Trang <b className="text-ink-900">{meta.page}</b>/{meta.totalPages}
          </>
        )}
        {loading && <span className="ml-2 text-xs font-semibold text-brand-700">Đang tải…</span>}
      </p>

      <div className="card mt-3 hidden overflow-hidden !p-0 md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Tiêu đề</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3">
                    <b className="text-ink-900">{p.title}</b>
                    <p className="mt-0.5 text-xs text-slate-500">{p.category?.name || "—"}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">/kinh-nghiem/{p.slug}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-info">{postStatus(p.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link to={`/admin/noi-dung/bai-viet/${p.id}`} className="btn-ghost inline-flex items-center gap-1 py-1.5 px-2.5 text-xs">
                        <Pencil size={14} /> Sửa
                      </Link>
                      {p.status === "PUBLISHED" ? (
                        <a href={`/kinh-nghiem/${p.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost inline-flex items-center gap-1 py-1.5 px-2.5 text-xs">
                          <ExternalLink size={14} /> Web
                        </a>
                      ) : (
                        <button type="button" className="btn-ghost py-1.5 px-2.5 text-xs" onClick={() => publish(p.id)}>
                          Xuất bản
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !items.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Không có bài phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:hidden">
        {items.map((p) => (
          <div className="card flex flex-col gap-3" key={p.id}>
            <div>
              <b>{p.title}</b>
              <p className="text-xs text-slate-500">/kinh-nghiem/{p.slug}</p>
              <p className="mt-1 text-sm">{postStatus(p.status)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/admin/noi-dung/bai-viet/${p.id}`} className="btn-secondary flex-1 py-2 text-center text-sm">
                Sửa
              </Link>
              {p.status !== "PUBLISHED" && (
                <button type="button" className="btn-secondary flex-1 py-2 text-sm" onClick={() => publish(p.id)}>
                  Xuất bản
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <AdminListPager page={meta.page} totalPages={meta.totalPages} loading={loading} onPage={setPage} />
      </div>
    </div>
  );
}
