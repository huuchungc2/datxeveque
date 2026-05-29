import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, MapPinned, MessageCircle, Phone, Ticket, User } from "lucide-react";
import { getContactInfo, useSiteSettings } from "../lib/useSiteSettings";
import { api, formatMoney } from "../lib/api";
import { formatDisplayDateTime } from "../lib/datetime";
import { ContactQuickBlock } from "./ContactQuickBlock";
import { customerBookingStatus, customerBookingTypeLabel } from "../lib/vi";
import { usesPassengerCount } from "../lib/bookingSeats";

type BookingView = {
  id: number;
  code: string;
  type: string;
  hasAccompanyingCargo?: boolean;
  status: string;
  customerName?: string;
  customerPhone?: string;
  cargoReceiverName?: string | null;
  cargoReceiverPhone?: string | null;
  route?: { name?: string } | null;
  direction?: string | null;
  scheduledAt?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  parcelDropoffAddress?: string | null;
  passengerCount?: number;
  cargoDescription?: string | null;
  note?: string | null;
  estimatedTotal?: number | string;
  finalTotal?: number | string;
  canRequestChange?: boolean;
  trip?: {
    driver?: { name: string; phone?: string; phoneMasked?: string | null };
    vehicle?: { model?: string; plate?: string };
  } | null;
};

type Props = {
  booking: BookingView;
  /** Tra cứu khách vãng lai: gửi kèm mã + SĐT */
  lookup?: { code: string; phone: string };
  onRefresh?: () => void;
};

export function BookingCustomerDetail({ booking, lookup, onRefresh }: Props) {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [changeNote, setChangeNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const requestBody = lookup ? { code: lookup.code, phone: lookup.phone } : {};

  const postRequest = async (path: "request-change" | "request-cancel", body: Record<string, string>) => {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const base = lookup ? `/bookings/${booking.id}/${path}` : `/customer/bookings/${booking.id}/${path}`;
      const r = await api.post(base, { ...requestBody, ...body });
      setMsg(r.data?.message || "Đã gửi yêu cầu.");
      onRefresh?.();
    } catch (e: any) {
      setErr(e.response?.data?.message || "Không gửi được yêu cầu.");
    } finally {
      setBusy(false);
    }
  };

  const driverPhone = booking.trip?.driver?.phone;
  const driverPhoneLabel = booking.trip?.driver?.phoneMasked || driverPhone;
  const isCargo = booking.type === "CARGO";

  return (
    <div className="panel bg-white p-6 rounded-3xl shadow-card relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
            <Ticket size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Mã đơn</p>
            <b className="text-2xl tracking-tight text-ink-900">{booking.code}</b>
            <p className="text-sm text-slate-500 mt-0.5">
              {customerBookingTypeLabel(booking.type, booking.hasAccompanyingCargo)}
            </p>
          </div>
        </div>
        <span className="badge badge-info !py-2 !px-4 !text-sm font-bold">{customerBookingStatus(booking.status)}</span>
      </div>

      <div className="grid mt-6 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <MapPinned className="mb-2 text-brand-700" size={20} />
          <span className="text-xs font-medium text-slate-400 block">Tuyến</span>
          <b className="text-base text-ink-900 mt-0.5 block">{booking.route?.name || booking.direction || "—"}</b>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <CalendarClock className="mb-2 text-orange-600" size={20} />
          <span className="text-xs font-medium text-slate-400 block">Ngày giờ</span>
          <b className="text-base text-ink-900 mt-0.5 block">{formatDisplayDateTime(booking.scheduledAt, "Chưa hẹn")}</b>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2 border border-slate-100">
          <span className="text-xs font-medium text-slate-400 block">
            {isCargo ? "Điểm lấy / giao hàng" : "Điểm đón / trả"}
          </span>
          <p className="mt-1.5 text-sm text-ink-900 font-semibold leading-relaxed">
            <span className="text-brand-600 font-bold">{isCargo ? "Lấy:" : "Đón:"}</span> {booking.pickupAddress || "—"}
            <br />
            <span className="text-cta-500 font-bold">{isCargo ? "Giao:" : "Trả:"}</span>{" "}
            {booking.parcelDropoffAddress || booking.dropoffAddress || "—"}
          </p>
        </div>
        {usesPassengerCount(booking.type) && (
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <span className="text-xs font-medium text-slate-400 block">Số ghế / khách</span>
            <b className="text-base text-ink-900 mt-0.5 block">{booking.passengerCount || 1}</b>
          </div>
        )}
        {(booking.cargoDescription || booking.hasAccompanyingCargo) && (
          <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2 border border-slate-100">
            <span className="text-xs font-medium text-slate-400 block">Mô tả hàng</span>
            <p className="mt-1 text-sm text-ink-900">{booking.cargoDescription || "—"}</p>
            {booking.cargoReceiverName && (
              <p className="mt-2 text-sm text-slate-600">
                Người nhận: <b>{booking.cargoReceiverName}</b>
                {booking.cargoReceiverPhone ? ` · ${booking.cargoReceiverPhone}` : ""}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-6">
        <h3 className="font-extrabold text-base text-ink-900 mb-4 flex items-center gap-2">
          <User size={18} className="text-slate-400" /> Tài xế & xe
        </h3>
        {booking.trip?.driver ? (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <b className="text-ink-900 block text-base">{booking.trip.driver.name}</b>
              <p className="text-sm text-slate-500 mt-1">
                {booking.trip.vehicle?.model || "Xe"} — Biển số:{" "}
                <b className="text-slate-700">{booking.trip.vehicle?.plate || "Đang cập nhật"}</b>
              </p>
            </div>
            {driverPhone && (
              <a href={`tel:${driverPhone}`} className="btn-secondary !rounded-xl !py-2 !px-4 text-xs flex items-center gap-1">
                <Phone size={14} /> Gọi tài xế{driverPhoneLabel ? ` (${driverPhoneLabel})` : ""}
              </a>
            )}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 text-center italic">
            Chưa có tài xế. Nhân viên sẽ liên hệ xác nhận qua điện thoại/Zalo.
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-slate-400 block">Tổng tiền dự kiến</span>
          {booking.note && <p className="text-xs text-slate-500 mt-1 max-w-md">Ghi chú: {booking.note}</p>}
        </div>
        <p className="text-2xl font-black text-cta-500">
          {Number(booking.finalTotal || booking.estimatedTotal || 0) > 0
            ? formatMoney(booking.finalTotal || booking.estimatedTotal)
            : "Giá sẽ được xác nhận khi nhân viên liên hệ"}
        </p>
      </div>

      <div className="mt-6">
        <ContactQuickBlock title="Hotline / Zalo" variant="compact" />
      </div>

      {booking.canRequestChange ? (
        <div className="mt-6 border-t border-slate-100 pt-6 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Yêu cầu sửa hoặc hủy đơn (chờ xác nhận)</p>
          {msg && <p className="text-sm text-emerald-700 font-medium">{msg}</p>}
          {err && <p className="text-sm text-red-700 font-medium">{err}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <textarea
                className="input text-sm"
                rows={2}
                placeholder="Nội dung cần sửa..."
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary w-full text-sm"
                disabled={busy}
                onClick={() => postRequest("request-change", { message: changeNote })}
              >
                Yêu cầu sửa
              </button>
            </div>
            <div className="space-y-2">
              <textarea
                className="input text-sm"
                rows={2}
                placeholder="Lý do hủy (tuỳ chọn)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <button
                type="button"
                className="btn-ghost w-full text-sm border border-red-200 text-red-700"
                disabled={busy}
                onClick={() => postRequest("request-cancel", { reason: cancelReason })}
              >
                Yêu cầu hủy
              </button>
            </div>
          </div>
        </div>
      ) : booking.status !== "COMPLETED" && booking.status !== "CANCELLED" ? (
        <p className="mt-6 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-4">
          Đơn đã được điều phối. Vui lòng gọi hotline/Zalo để được hỗ trợ sửa hoặc hủy.
        </p>
      ) : null}
    </div>
  );
}

export function BookingSuccessActions({
  code,
  phone,
  className = "",
}: {
  code: string;
  phone: string;
  className?: string;
}) {
  const { settings, loading } = useSiteSettings();
  const contact = getContactInfo(settings);
  const q = new URLSearchParams({ code, phone });
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {loading ? (
        <p className="text-sm text-slate-500">Đang tải hotline/Zalo…</p>
      ) : contact.ready ? (
        <>
          <p className="text-sm text-slate-600">{contact.footerLine}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <a className="btn-secondary flex-1 min-w-[140px] justify-center py-2.5 text-sm" href={`tel:${contact.hotline}`}>
              <Phone size={16} /> Gọi hotline
            </a>
            <a
              className="btn-secondary flex-1 min-w-[140px] justify-center py-2.5 text-sm"
              href={contact.zaloUrl}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={16} /> Nhắn Zalo
            </a>
          </div>
        </>
      ) : (
        <p className="text-sm text-amber-700">Chưa cấu hình hotline trong admin → Cài đặt.</p>
      )}
      <Link to={`/tra-cuu-don?${q.toString()}`} className="btn-primary w-full justify-center text-center">
        Tra cứu đơn
      </Link>
      <Link to="/" className="btn-ghost w-full justify-center text-center">
        Về trang chủ
      </Link>
    </div>
  );
}
