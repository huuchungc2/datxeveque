import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Eye, ImagePlus } from "lucide-react";
import { PostArticlePreview } from "../../components/admin/PostArticlePreview";
import { PostImagePickerModal } from "../../components/admin/PostImagePickerModal";
import { api } from "../../lib/api";
import { emptyPostForm, imageHtml, postToForm, type PostForm, type PostRow } from "../../lib/adminPostShared";

export function AdminPostFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "moi";
  const editId = isNew ? null : Number(id);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState<PostForm>(emptyPostForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const previewCategoryName = useMemo(() => {
    const c = categories.find((x) => String(x.id) === form.categoryId);
    return c?.name;
  }, [categories, form.categoryId]);

  useEffect(() => {
    api.get("/admin/post-categories").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    if (isNew || !editId) return;
    setLoading(true);
    api
      .get(`/admin/posts/${editId}`)
      .then((r) => setForm(postToForm(r.data as PostRow)))
      .catch(() => {
        alert("Không tải được bài viết");
        navigate("/admin/noi-dung/bai-viet");
      })
      .finally(() => setLoading(false));
  }, [editId, isNew, navigate]);

  const insertContentAtCursor = (snippet: string) => {
    const el = contentRef.current;
    if (!el) {
      setForm((f) => ({ ...f, content: f.content + (f.content ? "\n\n" : "") + snippet }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = form.content.slice(0, start);
    const after = form.content.slice(end);
    const glueBefore = before && !before.endsWith("\n") ? "\n\n" : "";
    const glueAfter = after && !after.startsWith("\n") ? "\n\n" : "";
    const next = `${before}${glueBefore}${snippet}${glueAfter}${after}`;
    setForm((f) => ({ ...f, content: next }));
    requestAnimationFrame(() => {
      const pos = (before + glueBefore + snippet).length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const save = async () => {
    if (!form.title || !form.slug || !form.content) return alert("Nhập tiêu đề, đường dẫn và nội dung");
    setBusy(true);
    try {
      const payload = { ...form, categoryId: form.categoryId || null };
      if (editId) {
        await api.patch(`/admin/posts/${editId}`, payload);
        alert("Đã cập nhật bài viết");
      } else {
        await api.post("/admin/posts", payload);
        alert("Đã tạo bài viết");
      }
      navigate("/admin/noi-dung/bai-viet");
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Không lưu được bài viết");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Đang tải bài viết…</p>;
  }

  return (
    <div>
      <Link to="/admin/noi-dung/bai-viet" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-700">
        <ArrowLeft size={16} /> Danh sách bài viết
      </Link>

      <h1 className="section-title">{isNew ? "Thêm bài viết" : `Sửa bài #${editId}`}</h1>
      <p className="mt-1 text-sm text-slate-600">Nội dung HTML — ảnh đầu bài dùng làm thumbnail trên web.</p>

      <div className="card mt-5 grid gap-3">
        <input className="input" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input" placeholder="Đường dẫn (slug)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <textarea className="input" rows={2} placeholder="Mô tả ngắn" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Nội dung (HTML)</span>
            <button type="button" className="btn-secondary inline-flex items-center gap-2 py-1.5 text-sm" onClick={() => setMediaOpen(true)}>
              <ImagePlus size={16} /> Chèn ảnh
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2 py-1.5 text-sm"
              onClick={() => setPreviewOpen(true)}
              disabled={!form.title.trim() && !form.content.trim()}
            >
              <Eye size={16} /> Xem trước
            </button>
            {form.slug.trim() && form.status === "PUBLISHED" && (
              <a href={`/kinh-nghiem/${form.slug}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2 py-1.5 text-sm">
                <ExternalLink size={16} /> Mở trang thật
              </a>
            )}
          </div>
          <textarea
            ref={contentRef}
            className="input font-mono text-sm"
            rows={16}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </div>
        <input className="input" placeholder="SEO title" value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
        <textarea className="input" rows={2} placeholder="SEO description" value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} />
        <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">Danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="DRAFT">Nháp</option>
          <option value="PUBLISHED">Xuất bản</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy} onClick={save}>
            {isNew ? "Tạo bài viết" : "Lưu thay đổi"}
          </button>
          <Link to="/admin/noi-dung/bai-viet" className="btn-secondary">
            Hủy
          </Link>
        </div>
      </div>

      <PostImagePickerModal open={mediaOpen} onClose={() => setMediaOpen(false)} onPick={(m) => { insertContentAtCursor(imageHtml(m.fileUrl, m.altText)); setMediaOpen(false); }} />

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-100">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <p className="font-bold">Xem trước</p>
            <button type="button" className="btn-secondary py-2" onClick={() => setPreviewOpen(false)}>
              Đóng
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
            <PostArticlePreview
              title={form.title}
              excerpt={form.excerpt}
              content={form.content}
              categoryName={previewCategoryName}
              seoTitle={form.seoTitle}
              seoDescription={form.seoDescription}
            />
          </div>
        </div>
      )}
    </div>
  );
}
