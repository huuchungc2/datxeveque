import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../../lib/api";
import { MEDIA_USAGE_VI } from "../../lib/vi";

export function AdminMediaUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({ altText: "", title: "", usageType: "general" });
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file || !meta.altText.trim()) return alert("Chọn ảnh và nhập mô tả ảnh (bắt buộc)");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("altText", meta.altText);
      fd.append("title", meta.title || meta.altText);
      fd.append("usageType", meta.usageType);
      await api.post("/admin/media/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      alert("Đã tải ảnh lên");
      navigate("/admin/noi-dung/media");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Không tải được ảnh");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link to="/admin/noi-dung/media" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-700">
        <ArrowLeft size={16} /> Thư viện ảnh
      </Link>
      <h1 className="section-title">Tải ảnh lên</h1>
      <p className="mt-1 text-sm text-slate-600">Tự động convert WebP, rộng tối đa 1600px.</p>

      <div className="card mt-5 grid max-w-xl gap-3">
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <input className="input" placeholder="Mô tả ảnh / alt (bắt buộc)" value={meta.altText} onChange={(e) => setMeta({ ...meta, altText: e.target.value })} />
        <input className="input" placeholder="Tiêu đề" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
        <select className="input" value={meta.usageType} onChange={(e) => setMeta({ ...meta, usageType: e.target.value })}>
          {Object.entries(MEDIA_USAGE_VI).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" disabled={busy} onClick={upload}>
            {busy ? "Đang tải…" : "Tải lên"}
          </button>
          <Link to="/admin/noi-dung/media" className="btn-secondary">
            Hủy
          </Link>
        </div>
      </div>
    </div>
  );
}
