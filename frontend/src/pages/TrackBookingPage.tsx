import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { api, formatMoney } from "../lib/api";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { bookingStatus } from "../lib/vi";

export default function TrackBookingPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBooking(null);
    const p = normalizeVnPhone(phone);
    if (!p) return setError(PHONE_INVALID_MESSAGE);
    try {
      const r = await api.post("/track-booking", { code: code.trim(), phone: p });
      setBooking(r.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Không tìm thấy đơn. Kiểm tra lại mã đơn và số điện thoại.");
    }
  };

  return (
    <>
      <Helmet><title>Tra cứu đơn | Đặt Xe Về Quê</title></Helmet>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold">Tra cứu đơn</h1>
        <p className="mt-2 text-slate-600">Nhập mã đơn và số điện thoại đã đặt để xem trạng thái.</p>
        <form className="card mt-6 grid gap-4" onSubmit={search}>
          <label className="font-semibold">Mã đơn<input className="input mt-2" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: DX000003" required /></label>
          <label className="font-semibold">
            Số điện thoại (10 số)
            <input
              className="input mt-2"
              {...phoneInputProps}
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              required
            />
          </label>
          <button className="btn-primary" type="submit">Tra cứu</button>
        </form>
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {booking && (
          <div className="card mt-6">
            <div className="flex items-center justify-between gap-3">
              <b className="text-xl">{booking.code}</b>
              <span className="badge">{bookingStatus(booking.status)}</span>
            </div>
            <p className="mt-3 text-slate-600">{booking.route?.name || booking.direction}</p>
            <p className="text-sm text-slate-600">{booking.pickupAddress} → {booking.dropoffAddress}</p>
            {booking.scheduledAt && <p className="mt-2 text-sm">Giờ đi: {new Date(booking.scheduledAt).toLocaleString("vi-VN")}</p>}
            <p className="mt-3 font-bold text-cta">{formatMoney(booking.finalTotal || booking.estimatedTotal)}</p>
          </div>
        )}
      </div>
    </>
  );
}
