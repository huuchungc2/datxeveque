import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { AdminListPager } from "../../components/admin/AdminListPager";
import { BUILTIN_POST_IMAGES } from "../../data/builtinPostImages";
import { api, parsePaginated } from "../../lib/api";
import { MEDIA_USAGE_VI } from "../../lib/vi";

export function AdminMediaList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, pageSize: 18, total: 0, totalPages: 1 });
  const [qDraft, setQDraft] = useState(searchParams.get("q") || "");

  const q = searchParams.get("q") || "";
  const usageType = searchParams.get("usageType") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const load = useCallback(() => {
    setLoading(true);
    return api
      .get("/admin/media", {
        params: { page, pageSize: 18, q: q || undefined, usageType: usageType || undefined },
      })
      .then((r) => {
        const p = parsePaginated(r.data);
        setItems(p.items);
        setMeta({ page: p.page, pageSize: p.pageSize, total: p.total, totalPages: p.totalPages });
      })
      .finally(() => setLoading(false));
  }, [page, q, usageType]);

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="section-title">Thư viện ảnh</h1>
          <p className="mt-1 text-sm text-slate-600">Ảnh upload WebP — dùng khi chèn vào bài viết.</p>
        </div>
        <Link to="/admin/noi-dung/media/tai-len" className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> Tải ảnh lên
        </Link>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-bold text-slate-800">Ảnh có sẵn trên web ({BUILTIN_POST_IMAGES.length})</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BUILTIN_POST_IMAGES.map((m) => (
            <div className="card" key={m.key}>
              <img src={m.fileUrl} alt={m.altText} className="h-28 w-full rounded-xl object-cover" />
              <p className="mt-2 text-sm font-semibold">{m.title}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-8 grid gap-3 md:grid-cols-4">
        <input
          className="input md:col-span-2"
          placeholder="Tìm tiêu đề, alt, tên file…"
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters()}
        />
        <select className="input" value={usageType} onChange={(e) => setFilter("usageType", e.target.value)}>
          <option value="">Tất cả loại</option>
          {Object.entries(MEDIA_USAGE_VI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" className="btn-primary py-2" onClick={applyFilters}>
          Áp dụng lọc
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        <b className="text-ink-900">{meta.total}</b> ảnh đã upload
        {meta.totalPages > 1 && (
          <>
            {" "}
            · Trang {meta.page}/{meta.totalPages}
          </>
        )}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => (
          <div className="card" key={m.id}>
            <img src={m.fileUrl} alt={m.altText} className="h-36 w-full rounded-xl object-cover" />
            <p className="mt-2 text-sm font-semibold">{m.title}</p>
            <p className="text-xs text-slate-500">{m.altText}</p>
            <p className="mt-1 truncate font-mono text-xs text-slate-400">{m.fileUrl}</p>
          </div>
        ))}
        {!loading && !items.length && <p className="text-slate-500 sm:col-span-2 lg:col-span-3">Chưa có ảnh upload.</p>}
      </div>

      <div className="mt-5">
        <AdminListPager page={meta.page} totalPages={meta.totalPages} loading={loading} onPage={setPage} />
      </div>
    </div>
  );
}
