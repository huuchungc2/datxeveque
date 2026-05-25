import { useEffect, useState } from "react";
import { api, formatMoney } from "../lib/api";
import { usesPassengerCount } from "../lib/bookingSeats";
import { bookingStatus } from "../lib/vi";

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

  return (
    <div>
      <h1 className="text-3xl font-bold">Khu vực khách hàng</h1>
      <p className="mt-2 text-slate-500">Xem lịch sử đặt xe, gửi hàng và trạng thái xử lý.</p>

      {loading && <div className="card mt-5">Đang tải lịch sử đơn...</div>}
      {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}

      {!loading && !error && bookings.length === 0 && (
        <div className="card mt-5">
          <b>Chưa có đơn nào</b>
          <p className="mt-2 text-slate-600">Khi đặt xe bằng tài khoản này, đơn sẽ xuất hiện tại đây.</p>
        </div>
      )}

      <div className="mt-5 grid gap-4">
        {bookings.map((b) => (
          <div className="card" key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Mã đơn</p>
                <h2 className="text-xl font-bold">{b.code}</h2>
                <p className="mt-2 text-slate-600">{b.route?.name || b.direction || "Chưa chọn tuyến"}</p>
              </div>
              <span className="badge">{bookingStatus(b.status)}</span>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <p><b>Ngày đi:</b> {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString("vi-VN") : "Chưa hẹn"}</p>
              {usesPassengerCount(b.type) ? (
                <p><b>Số khách:</b> {b.passengerCount}</p>
              ) : (
                <p><b>Loại:</b> {b.type === "CARGO" ? "Gửi hàng" : "Đi chợ quê"}</p>
              )}
              <p><b>Tổng tiền:</b> {formatMoney(b.finalTotal || b.estimatedTotal)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
