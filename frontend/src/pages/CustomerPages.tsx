import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, MapPinned, ReceiptText, Users } from "lucide-react";
import { api, formatMoney } from "../lib/api";
import { formatDisplayDateTime } from "../lib/datetime";
import { usesPassengerCount } from "../lib/bookingSeats";
import { bookingStatus } from "../lib/vi";
import { EmptyState, PageIntro } from "../components/ui/DesignKit";
import { StatCard } from "../components/ui/AdminCharts";

export function CustomerHome() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/customer/bookings")
      .then((res) => setBookings(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.response?.data?.message || "Không tải được lịch sử đơn"))
      .finally(() => setLoading(false));
  }, []);

  const totalValue = bookings.reduce((sum, b) => sum + Number(b.finalTotal || b.estimatedTotal || 0), 0);
  const upcoming = bookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED").length;

  return (
    <div className="space-y-6">
      <PageIntro
        title="Đơn của tôi"
        subtitle="Theo dõi lịch sử đặt xe, gửi hàng, trạng thái xử lý và tổng tiền tạm tính của từng đơn."
        actions={<Link className="btn-primary" to="/dat-xe">Đặt xe mới</Link>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Tổng đơn" value={bookings.length} tone="brand" icon={<ReceiptText size={20} />} hint="Tất cả đơn của tài khoản" />
        <StatCard label="Đơn đang xử lý" value={upcoming} tone="orange" icon={<CalendarClock size={20} />} hint="Chưa hoàn thành/hủy" />
        <StatCard label="Tổng giá trị" value={formatMoney(totalValue)} tone="green" icon={<Users size={20} />} hint="Theo giá tạm tính/cuối" />
      </div>

      {loading && <div className="card text-sm font-semibold text-slate-600">Đang tải lịch sử đơn...</div>}
      {error && <div className="rounded-3xl bg-red-50 p-4 text-red-700">{error}</div>}

      {!loading && !error && bookings.length === 0 && (
        <EmptyState title="Chưa có đơn nào" subtitle="Khi đặt xe bằng tài khoản này, đơn sẽ xuất hiện tại đây để bạn theo dõi." action={<Link className="btn-primary" to="/dat-xe">Đặt xe ngay</Link>} />
      )}

      <div className="grid gap-4">
        {bookings.map((b) => (
          <div className="card card-hover" key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Mã đơn</p>
                <h2 className="mt-1 text-2xl font-extrabold">{b.code}</h2>
                <p className="mt-2 flex items-center gap-2 text-slate-600"><MapPinned size={17} className="text-brand-700" />{b.route?.name || b.direction || "Chưa chọn tuyến"}</p>
              </div>
              <span className="badge badge-info">{bookingStatus(b.status)}</span>
            </div>
            <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-3"><b>Ngày đi</b><p className="mt-1 text-slate-600">{formatDisplayDateTime(b.scheduledAt, "Chưa hẹn")}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>{usesPassengerCount(b.type) ? "Số khách" : "Loại"}</b><p className="mt-1 text-slate-600">{usesPassengerCount(b.type) ? b.passengerCount : b.type === "CARGO" ? "Gửi hàng" : "Đi chợ quê"}</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>Điểm đón</b><p className="mt-1 line-clamp-2 text-slate-600">{b.pickupAddress || "—"}</p></div>
              <div className="rounded-2xl bg-orange-50 p-3"><b>Tổng tiền</b><p className="mt-1 text-lg font-extrabold text-cta-500">{formatMoney(b.finalTotal || b.estimatedTotal)}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
