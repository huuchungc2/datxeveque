import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, Search } from "lucide-react";
import { api } from "../lib/api";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, sanitizePhoneInput } from "../lib/phone";
import { BookingCustomerDetail } from "../components/BookingCustomerDetail";
import { EmptyState, PublicHero } from "../components/ui/DesignKit";

export function TrackBookingPage() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const runSearch = async (codeVal: string, phoneVal: string) => {
    setError("");
    setBooking(null);
    const p = normalizeVnPhone(phoneVal);
    if (!p) {
      setError(PHONE_INVALID_MESSAGE);
      return;
    }
    if (!codeVal.trim()) {
      setError("Vui lòng nhập mã đơn.");
      return;
    }
    setLoading(true);
    try {
      const r = await api.post("/track-booking", { code: codeVal.trim(), phone: p });
      setBooking(r.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Không tìm thấy đơn hoặc số điện thoại không đúng."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const c = searchParams.get("code");
    const p = searchParams.get("phone");
    if (c && p) {
      setCode(c);
      setPhone(p);
      void runSearch(c, p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(code, phone);
  };

  const lookup =
    booking && code && phone
      ? { code: code.trim(), phone: normalizeVnPhone(phone) || phone }
      : undefined;

  return (
    <>
      <Helmet>
        <title>Tra cứu đơn | Đặt Xe Về Quê</title>
      </Helmet>
      <PublicHero
        title="Tra cứu đơn"
        subtitle="Nhập mã đơn và số điện thoại đặt xe để xem trạng thái, tài xế và thông tin chuyến."
      />

      <div className="page max-w-5xl py-10">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div>
            <form className="panel bg-white p-6 rounded-3xl shadow-card space-y-4 sticky top-6" onSubmit={search}>
              <h2 className="text-xl font-extrabold text-ink-900">Tra cứu</h2>
              <p className="text-xs text-slate-500">Cần đúng cả mã đơn và số điện thoại đã đặt.</p>

              <div>
                <label className="text-sm font-bold block mb-2">Mã đơn</label>
                <input
                  className="input"
                  placeholder="Ví dụ: DX-260528-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-bold block mb-2">Số điện thoại</label>
                <input
                  className="input"
                  placeholder="Số đã dùng khi đặt"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 border border-red-100">
                  {error}
                </div>
              )}

              <button className="btn-primary w-full justify-center mt-2 flex items-center gap-2" disabled={loading}>
                <Search size={18} /> {loading ? "Đang tra cứu..." : "Tra cứu đơn"}
              </button>
            </form>
          </div>

          <div>
            {!booking ? (
              <div className="panel flex h-full items-center justify-center bg-white border-dashed border-2 border-slate-200 py-16 rounded-3xl">
                <EmptyState
                  title="Chưa có kết quả"
                  subtitle="Nhập mã đơn và số điện thoại để xem chi tiết."
                  icon={<ClipboardList size={32} className="text-slate-300" />}
                />
              </div>
            ) : (
              <BookingCustomerDetail
                booking={booking}
                lookup={lookup}
                onRefresh={() => runSearch(code, phone)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
