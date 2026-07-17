import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { api } from "../lib/api";

const categoryLabels: Record<string, string> = {
  RATING: "Đánh giá",
  COMPLAINT_DRIVER: "Phàn nàn tài xế",
  SUGGESTION: "Góp ý",
  BUG_REPORT: "Báo lỗi",
  OTHER: "Khác",
};

interface Feedback {
  id: number;
  category: string;
  name: string;
  phone: string;
  email?: string;
  content: string;
  resolved: boolean;
  booking?: { id: number; code: string; customerName: string };
  route?: { id: number; name: string };
  createdAt: string;
}

interface PaginatedResponse {
  items: Feedback[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [resolved, setResolved] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: pageSize };
      if (query) params.q = query;
      if (category) params.category = category;
      if (resolved) params.resolved = resolved;
      const res = await api.get("/admin/feedbacks", { params });
      const data = res.data as PaginatedResponse;
      setFeedbacks(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Load feedbacks error:", error);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [page, pageSize, query, category, resolved]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrevious = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Phản hồi & Góp ý</h1>
        <p className="mt-1 text-sm text-slate-600">Quản lý các phản hồi từ khách hàng</p>
      </div>

      {/* Filters */}
      <div className="panel shadow-xl p-5 space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row md:items-end md:gap-2">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tìm kiếm</label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tên, SĐT, email, nội dung..."
                className="w-full h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Loại</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">— Tất cả —</option>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Trạng thái</label>
            <select
              value={resolved}
              onChange={(e) => {
                setResolved(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">— Tất cả —</option>
              <option value="false">Chưa xử lý</option>
              <option value="true">Đã xử lý</option>
            </select>
          </div>
          <button type="submit" className="h-10 px-4 bg-brand-700 text-white rounded-xl text-sm font-semibold hover:bg-brand-800">
            Tìm
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="panel shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Đang tải...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-6 text-center text-slate-500">Không có phản hồi nào</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Từ</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">SĐT</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Loại</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Nội dung</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Trạng thái</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((fb) => (
                    <tr key={fb.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{fb.name}</td>
                      <td className="px-4 py-3 text-slate-600">{fb.phone}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                          {categoryLabels[fb.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{fb.content.slice(0, 50)}...</td>
                      <td className="px-4 py-3">
                        {fb.resolved ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Đã xử lý
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Chưa xử lý
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedId(fb.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                        >
                          <Eye size={16} /> Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <div className="text-xs text-slate-600">
                Trang {page} / {totalPages} — Tổng {total} phản hồi
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!canPrevious}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!canNext}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedId && <AdminFeedbackDetail id={selectedId} onClose={() => setSelectedId(null)} onRefresh={loadFeedbacks} />}
    </div>
  );
}

function AdminFeedbackDetail({ id, onClose, onRefresh }: { id: number; onClose: () => void; onRefresh: () => void }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState("");
  const [resolved, setResolved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const res = await api.get(`/admin/feedbacks/${id}`);
        setFeedback(res.data);
        setAdminNote(res.data.adminNote || "");
        setResolved(res.data.resolved);
      } catch (error) {
        console.error("Load feedback detail error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [id]);

  const handleSave = async () => {
    if (!feedback) return;
    setSaving(true);
    try {
      await api.patch(`/admin/feedbacks/${feedback.id}`, {
        resolved,
        adminNote,
      });
      onRefresh();
      onClose();
    } catch (error) {
      console.error("Save feedback error:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 cursor-default bg-slate-900/25" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex items-center justify-center overflow-y-auto md:inset-auto md:top-1/2 md:left-1/2 md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          {loading ? (
            <div className="text-center text-slate-500">Đang tải...</div>
          ) : feedback ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{feedback.name}</h2>
                  <p className="text-sm text-slate-600">{feedback.phone}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">
                  {categoryLabels[feedback.category]}
                </span>
              </div>

              <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nội dung</p>
                <p className="text-slate-700">{feedback.content}</p>
              </div>

              {feedback.email && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Email</p>
                  <p className="text-slate-700">{feedback.email}</p>
                </div>
              )}

              {feedback.booking && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Booking liên quan</p>
                  <p className="text-slate-700">
                    {feedback.booking.code} — {feedback.booking.customerName}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-slate-100 p-3">
                <span className="text-xs text-slate-600">
                  Gửi: <b>{new Date(feedback.createdAt).toLocaleString("vi-VN")}</b>
                </span>
                {feedback.resolved ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Đã xử lý
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Chưa xử lý
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Ghi chú admin</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ghi chú, hành động đã thực hiện..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} className="h-4 w-4 accent-brand-700" />
                <span className="text-sm font-semibold text-slate-700">Đánh dấu đã xử lý</span>
              </label>

              <div className="flex gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={onClose} className="flex-1 rounded-xl px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100">
                  Đóng
                </button>
                <button type="button" onClick={handleSave} disabled={saving} className="flex-1 rounded-xl px-4 py-2 bg-brand-700 text-white font-semibold hover:bg-brand-800 disabled:opacity-50">
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-red-600">Không tìm thấy phản hồi</div>
          )}
        </div>
      </div>
    </>
  );
}
