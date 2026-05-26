import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { CalendarClock, MapPinned, Search } from "lucide-react";
import { api, formatMoney } from "../lib/api";
import { formatDisplayDateTime } from "../lib/datetime";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { bookingStatus } from "../lib/vi";
import { EmptyState, PublicHero } from "../components/ui/DesignKit";

export default function TrackBookingPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");

  const search = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setBooking(null);
    const p = normalizeVnPhone(phone);
    if (!p) return setError(PHONE_INVALID_MESSAGE);
    try { const r = await api.post("/track-booking", { code: code.trim(), phone: p }); setBooking(r.data); }
    catch (err: any) { setError(err.response?.data?.message || "Không tìm thấy đơn. Kiểm tra lại mã đơn và số điện thoại."); }
  };

  return (
    <>
      <Helmet><title>Tra cứu đơn | Đặt Xe Về Quê</title></Helmet>
      <PublicHero title="Tra cứu trạng thái đơn" subtitle="Nhập mã đơn và số điện thoại đã đặt để xem tuyến, giờ đi, giá và trạng thái xử lý." />
      <div className="page grid gap-6 py-10 lg:grid-cols-[.8fr_1.2fr]">
        <form className="panel grid gap-4 self-start" onSubmit={search}>
          <h2 className="text-2xl font-extrabold">Thông tin tra cứu</h2>
          <label className="font-bold">Mã đơn<input className="input mt-2" value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: DX000003" required /></label>
          <label className="font-bold">Số điện thoại<input className="input mt-2" {...phoneInputProps} value={phone} onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))} required /></label>
          <button className="btn-primary" type="submit"><Search size={18} /> Tra cứu</button>
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </form>
        <div>
          {!booking && !error && <EmptyState title="Chưa có kết quả" subtitle="Sau khi tra cứu thành công, thông tin đơn sẽ hiển thị ở khu vực này." icon={<Search size={26} />} />}
          {booking && <div className="panel">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Mã đơn</p><b className="text-2xl">{booking.code}</b></div><span className="badge badge-info">{bookingStatus(booking.status)}</span></div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4"><MapPinned className="mb-2 text-brand-700" /><b>Tuyến/chiều</b><p className="mt-1 text-slate-600">{booking.route?.name || booking.direction || "—"}</p></div>
              <div className="rounded-3xl bg-slate-50 p-4"><CalendarClock className="mb-2 text-orange-600" /><b>Giờ đi</b><p className="mt-1 text-slate-600">{formatDisplayDateTime(booking.scheduledAt, "Chưa hẹn")}</p></div>
              <div className="rounded-3xl bg-slate-50 p-4 md:col-span-2"><b>Điểm đón/trả</b><p className="mt-1 text-slate-600">{booking.pickupAddress || "—"} → {booking.dropoffAddress || "—"}</p></div>
            </div>
            <div className="mt-5 rounded-3xl bg-orange-50 p-4"><p className="text-sm font-bold text-orange-700">Tổng tiền</p><p className="mt-1 text-3xl font-extrabold text-cta-500">{formatMoney(booking.finalTotal || booking.estimatedTotal)}</p></div>
          </div>}
        </div>
      </div>
    </>
  );
}
