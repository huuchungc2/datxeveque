import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { SEOHead } from "../components/SEOHead";
import { useSiteSettings, getBrandAssets } from "../lib/useSiteSettings";

const categories = [
  { value: "RATING", label: "Đánh giá dịch vụ" },
  { value: "COMPLAINT_DRIVER", label: "Phàn nàn về tài xế" },
  { value: "SUGGESTION", label: "Góp ý cải thiện" },
  { value: "BUG_REPORT", label: "Báo lỗi kỹ thuật" },
  { value: "OTHER", label: "Khác" },
];

export default function FeedbackPage() {
  const { settings } = useSiteSettings();
  const brand = getBrandAssets(settings);

  const [form, setForm] = useState({
    category: "SUGGESTION",
    name: "",
    phone: "",
    email: "",
    content: "",
    bookingId: "",
    routeId: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên");
      return;
    }
    if (!form.phone.trim()) {
      setError("Vui lòng nhập số điện thoại");
      return;
    }
    if (!form.content.trim()) {
      setError("Vui lòng nhập nội dung");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        category: form.category,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        content: form.content.trim(),
        bookingId: form.bookingId ? Number(form.bookingId) : null,
        routeId: form.routeId ? Number(form.routeId) : null,
      };
      await api.post("/feedback", payload);
      setSuccess(true);
      setForm({ category: "SUGGESTION", name: "", phone: "", email: "", content: "", bookingId: "", routeId: "" });
    } catch (err: any) {
      setError(err.response?.data?.message || "Không gửi được phản hồi. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <SEOHead
          title={`Cảm ơn góp ý | ${settings.brand_name || brand.brandName}`}
          description="Cảm ơn bạn đã gửi phản hồi. Chúng tôi sẽ xem xét và cải thiện dịch vụ."
          canonicalPath="/gop-y"
        />
        <div className="page max-w-2xl py-10 text-center">
          <div className="panel flex flex-col items-center p-8 shadow-xl">
            <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 mb-4">
              <CheckCircle2 size={48} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Cảm ơn phản hồi của bạn!</h1>
            <p className="mt-3 text-sm text-slate-600 leading-6">
              Chúng tôi đã nhận được phản hồi của bạn. Đội ngũ sẽ xem xét để cải thiện dịch vụ.
            </p>
            <button
              type="button"
              className="mt-6 btn-primary py-2.5"
              onClick={() => {
                setSuccess(false);
                window.location.href = "/";
              }}
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`Góp ý & Phàn nàn | ${settings.brand_name || brand.brandName}`}
        description="Gửi góp ý, phàn nàn hoặc báo lỗi để giúp chúng tôi cải thiện dịch vụ. Ý kiến của bạn rất quan trọng."
        canonicalPath="/gop-y"
      />
      <div className="page max-w-2xl py-10">
        <div className="panel shadow-xl p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Góp ý & Phàn nàn</h1>
          <p className="text-sm text-slate-600 mb-6">
            Ý kiến của bạn rất quan trọng. Hãy chia sẻ để chúng tôi cải thiện dịch vụ.
          </p>

          {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Loại phản hồi</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-12 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="w-full h-12 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0912xxxxxx"
                className="w-full h-12 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Email (tùy chọn)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full h-12 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Booking ID (optional) */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Mã đơn (nếu liên quan)</label>
              <input
                type="text"
                value={form.bookingId}
                onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
                placeholder="Ví dụ: DVQ-2024-001"
                className="w-full h-12 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">
                Nội dung <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Chia sẻ chi tiết về trải nghiệm hoặc phàn nàn của bạn..."
                rows={5}
                className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
              />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
              <Send size={18} /> {loading ? "Đang gửi..." : "Gửi phản hồi"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
