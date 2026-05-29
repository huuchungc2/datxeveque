import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, MapPinned, ReceiptText, Users } from "lucide-react";
import { api, formatMoney } from "../lib/api";
import { formatDisplayDateTime } from "../lib/datetime";
import { customerBookingStatus, customerBookingTypeLabel } from "../lib/vi";
import { BookingCustomerDetail } from "../components/BookingCustomerDetail";
import { EmptyState, PageIntro } from "../components/ui/DesignKit";
import { StatCard } from "../components/ui/AdminCharts";

export function CustomerHome() {
  const [data, setData] = useState<{ items: any[]; total: number; page: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = () => {
    setLoading(true);
    api
      .get("/customer/bookings", { params: { page, limit: 20 } })
      .then((res) => {
        const d = res.data;
        if (Array.isArray(d)) {
          setData({ items: d, total: d.length, page: 1, limit: 20 });
        } else {
          setData({ items: d.items || [], total: d.total ?? 0, page: d.page ?? 1, limit: d.limit ?? 20 });
        }
      })
      .catch((err) => setError(err.response?.data?.message || "Không tải được lịch sử đơn"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadDetail = (id: number) => {
    setDetailLoading(true);
    api
      .get(`/customer/bookings/${id}`)
      .then((r) => setDetail(r.data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
  }, [selectedId]);

  const bookings = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const totalValue = bookings.reduce((sum, b) => sum + Number(b.finalTotal || b.estimatedTotal || 0), 0);
  const upcoming = bookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED").length;

  return (
    <div className="space-y-6">
      <PageIntro
        title="Đơn của tôi"
        subtitle="Theo dõi lịch sử đặt xe, gửi hàng và trạng thái xử lý."
        actions={<Link className="btn-primary" to="/dat-xe">Đặt xe mới</Link>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tổng đơn" value={data?.total ?? 0} tone="brand" icon={<ReceiptText size={20} />} hint="Trên tài khoản" />
        <StatCard label="Đơn đang xử lý (trang)" value={upcoming} tone="orange" icon={<CalendarClock size={20} />} />
        <StatCard label="Giá trị (trang)" value={formatMoney(totalValue)} tone="green" icon={<Users size={20} />} />
      </div>

      {loading && <div className="card text-sm font-semibold text-slate-600">Đang tải...</div>}
      {error && <div className="rounded-3xl bg-red-50 p-4 text-red-700">{error}</div>}

      {!loading && !error && bookings.length === 0 && (
        <EmptyState
          title="Chưa có đơn"
          subtitle="Đơn đặt bằng số điện thoại tài khoản sẽ hiển thị tại đây."
          action={<Link className="btn-primary" to="/dat-xe">Đặt xe ngay</Link>}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4">
          {bookings.map((b) => (
            <button
              type="button"
              key={b.id}
              className={`card card-hover text-left w-full ${selectedId === b.id ? "ring-2 ring-brand-500" : ""}`}
              onClick={() => setSelectedId(b.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Mã đơn</p>
                  <h2 className="mt-1 text-xl font-extrabold">{b.code}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {customerBookingTypeLabel(b.type, b.hasAccompanyingCargo)}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-slate-600 text-sm">
                    <MapPinned size={16} className="text-brand-700" />
                    {b.route?.name || b.direction || "—"}
                  </p>
                </div>
                <span className="badge badge-info">{customerBookingStatus(b.status)}</span>
              </div>
              <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                <p className="text-slate-600">{formatDisplayDateTime(b.scheduledAt, "Chưa hẹn")}</p>
                <p className="font-extrabold text-cta-500">{formatMoney(b.finalTotal || b.estimatedTotal)}</p>
              </div>
            </button>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <button type="button" className="btn-ghost text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Trang trước
              </button>
              <span className="text-sm text-slate-500">
                Trang {page}/{totalPages}
              </span>
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </button>
            </div>
          )}
        </div>

        <div>
          {!selectedId ? (
            <div className="card border-dashed text-sm text-slate-500 text-center py-12">
              Chọn một đơn để xem chi tiết, tài xế và gửi yêu cầu sửa/hủy.
            </div>
          ) : detailLoading ? (
            <div className="card text-sm text-slate-600">Đang tải chi tiết...</div>
          ) : detail ? (
            <BookingCustomerDetail booking={detail} onRefresh={() => selectedId && loadDetail(selectedId)} />
          ) : (
            <div className="card text-sm text-red-600">Không tải được chi tiết đơn.</div>
          )}
        </div>
      </div>
    </div>
  );
}
