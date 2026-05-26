import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { postStatus, MEDIA_USAGE_VI } from "../lib/vi";

export function AdminPosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", categoryId: "", status: "DRAFT", seoTitle: "", seoDescription: "" });

  const load = () => {
    api.get("/admin/posts").then((r) => setPosts(r.data));
    api.get("/admin/post-categories").then((r) => setCategories(r.data));
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.title || !form.slug || !form.content) return alert("Nhập tiêu đề, đường dẫn và nội dung");
    await api.post("/admin/posts", { ...form, categoryId: form.categoryId || null });
    setForm({ title: "", slug: "", excerpt: "", content: "", categoryId: "", status: "DRAFT", seoTitle: "", seoDescription: "" });
    load();
    alert("Đã tạo bài viết");
  };

  const publish = async (id: number) => {
    await api.patch(`/admin/posts/${id}`, { status: "PUBLISHED" });
    load();
  };

  return (
    <div>
      <h1 className="section-title">Bài viết</h1>
      <div className="card mt-5 grid gap-3">
        <input className="input" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input" placeholder="Đường dẫn bài (vd. kinh-nghiem-dat-xe)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <textarea className="input" rows={2} placeholder="Mô tả ngắn" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        <textarea className="input" rows={6} placeholder="Nội dung bài viết" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">Danh mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="DRAFT">Nháp</option>
          <option value="PUBLISHED">Xuất bản</option>
        </select>
        <button className="btn-primary" onClick={save}>Tạo bài viết</button>
      </div>
      <div className="mt-5 grid gap-3">
        {posts.map((p) => (
          <div className="card flex flex-wrap items-center justify-between gap-3" key={p.id}>
            <div><b>{p.title}</b><p className="text-sm text-slate-600">/{p.slug} • {postStatus(p.status)}</p></div>
            {p.status !== "PUBLISHED" && <button className="btn-secondary py-2" onClick={() => publish(p.id)}>Xuất bản</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminMedia() {
  const [items, setItems] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({ altText: "", title: "", usageType: "general" });

  const load = () => api.get("/admin/media").then((r) => setItems(r.data));
  useEffect(() => {
    load();
  }, []);

  const upload = async () => {
    if (!file || !meta.altText.trim()) return alert("Chọn ảnh và nhập mô tả ảnh (bắt buộc)");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("altText", meta.altText);
    fd.append("title", meta.title || meta.altText);
    fd.append("usageType", meta.usageType);
    await api.post("/admin/media/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setFile(null);
    setMeta({ altText: "", title: "", usageType: "general" });
    load();
    alert("Đã tải ảnh lên");
  };

  return (
    <div>
      <h1 className="section-title">Thư viện ảnh</h1>
      <div className="card mt-5 grid gap-3 md:grid-cols-2">
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <input className="input" placeholder="Mô tả ảnh (bắt buộc)" value={meta.altText} onChange={(e) => setMeta({ ...meta, altText: e.target.value })} />
        <input className="input" placeholder="Tiêu đề" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
        <select className="input" value={meta.usageType} onChange={(e) => setMeta({ ...meta, usageType: e.target.value })}>
          {Object.entries(MEDIA_USAGE_VI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn-primary md:col-span-2" onClick={upload}>Tải ảnh lên</button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {items.map((m) => (
          <div className="card" key={m.id}>
            <img src={m.fileUrl} alt={m.altText} className="h-32 w-full rounded-xl object-cover" />
            <p className="mt-2 text-sm font-semibold">{m.title}</p>
            <p className="text-xs text-slate-500">{m.altText}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
