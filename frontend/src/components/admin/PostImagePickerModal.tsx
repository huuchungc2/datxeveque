import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";
import { api, unwrapList } from "../../lib/api";
import { BUILTIN_POST_IMAGES } from "../../data/builtinPostImages";

export type PickableImage = {
  key: string;
  fileUrl: string;
  altText: string;
  title: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (image: PickableImage) => void;
};

function ImageGrid({ items, onPick }: { items: PickableImage[]; onPick: (image: PickableImage) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {items.map((m) => (
        <button
          key={m.key}
          type="button"
          className="overflow-hidden rounded-xl border border-slate-200 text-left transition hover:border-brand-500 hover:shadow-md"
          onClick={() => onPick(m)}
        >
          <img src={m.fileUrl} alt={m.altText} className="h-28 w-full object-cover" />
          <p className="truncate px-2 py-2 text-xs font-semibold text-slate-700">{m.title}</p>
        </button>
      ))}
    </div>
  );
}

export function PostImagePickerModal({ open, onClose, onPick }: Props) {
  const [mediaItems, setMediaItems] = useState<PickableImage[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);

  const loadUploaded = async () => {
    setMediaLoading(true);
    setMediaError("");
    try {
      const r = await api.get("/admin/media");
      const rows = unwrapList<{ id: number; fileUrl: string; altText: string; title: string }>(r.data);
      setMediaItems(
        rows.map((m) => ({
          key: `upload-${m.id}`,
          fileUrl: m.fileUrl,
          altText: m.altText || m.title || "",
          title: m.title || m.altText || m.fileUrl,
        }))
      );
    } catch (e: any) {
      setMediaError(e?.response?.data?.message || e?.message || "Không tải được thư viện ảnh đã upload");
      setMediaItems([]);
    } finally {
      setMediaLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadUploaded();
  }, [open]);

  const uploadNew = async () => {
    if (!uploadFile || !uploadAlt.trim()) return alert("Chọn ảnh và nhập mô tả ảnh (alt)");
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("altText", uploadAlt.trim());
      fd.append("title", uploadAlt.trim());
      fd.append("usageType", "general");
      const r = await api.post("/admin/media/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const m = r.data;
      onPick({
        key: `upload-${m.id}`,
        fileUrl: m.fileUrl,
        altText: m.altText || uploadAlt.trim(),
        title: m.title || uploadAlt.trim(),
      });
      setUploadFile(null);
      setUploadAlt("");
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Không tải ảnh lên được");
    } finally {
      setUploadBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-ink-900">Chọn ảnh chèn vào bài</h2>
          <button type="button" className="text-slate-500 hover:text-slate-800" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Tải ảnh mới (convert WebP, max 1600px)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            <input
              className="input"
              placeholder="Mô tả ảnh (alt, bắt buộc)"
              value={uploadAlt}
              onChange={(e) => setUploadAlt(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-primary mt-3 inline-flex items-center gap-2"
            disabled={uploadBusy || !uploadFile}
            onClick={uploadNew}
          >
            <Upload size={16} /> {uploadBusy ? "Đang tải…" : "Tải lên và chèn"}
          </button>
        </div>

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-bold text-slate-800">Ảnh có sẵn trên web ({BUILTIN_POST_IMAGES.length})</h3>
          <p className="mb-3 text-xs text-slate-500">Ảnh WebP trong thư mục /images — dùng cho bài kinh nghiệm & SEO.</p>
          <ImageGrid items={BUILTIN_POST_IMAGES} onPick={onPick} />
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-slate-800">Ảnh đã upload ({mediaItems.length})</h3>
          {mediaLoading ? (
            <p className="text-sm text-slate-500">Đang tải thư viện ảnh…</p>
          ) : mediaError ? (
            <p className="text-sm text-rose-600">{mediaError}</p>
          ) : mediaItems.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có ảnh upload — dùng form phía trên hoặc tab Thư viện ảnh.</p>
          ) : (
            <ImageGrid items={mediaItems} onPick={onPick} />
          )}
        </section>
      </div>
    </div>
  );
}
