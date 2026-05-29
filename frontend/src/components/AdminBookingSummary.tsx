import type { ReactNode } from "react";
import { formatMoney } from "../lib/api";
import { formatDisplayDateTime } from "../lib/datetime";
import { adminBookingQuantityLabel } from "../lib/bookingSeats";
import { serviceTypeLabel } from "../lib/serviceTypes";
import { bookingPaymentStatus, bookingStatus, PAYMENT_RECEIVER_VI } from "../lib/vi";

type BookingLike = {
  code?: string;
  type?: string;
  status?: string;
  customerName?: string;
  customerPhone?: string;
  route?: { name?: string } | null;
  direction?: string | null;
  scheduledAt?: string | null;
  scheduledAtLocal?: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  parcelDropoffAddress?: string | null;
  passengerCount?: number | null;
  weightKg?: number | string | null;
  hasAccompanyingCargo?: boolean | null;
  vehicleType?: string | null;
  cargoDescription?: string | null;
  marketDescription?: string | null;
  note?: string | null;
  finalTotal?: number | string | null;
  commissionAmount?: number | string | null;
  paymentReceiver?: string | null;
  paymentStatus?: string | null;
  tripBookings?: { trip?: { code?: string; driver?: { name?: string; phone?: string } } }[];
};

function tripLine(b: BookingLike) {
  const trip = b.tripBookings?.[0]?.trip;
  if (!trip?.code) return "Chưa gán chuyến";
  const driver = trip.driver?.name;
  return driver ? `${trip.code} · ${driver}` : trip.code;
}

export function AdminBookingSummary({ booking, compact = false }: { booking: BookingLike; compact?: boolean }) {
  const when = booking.scheduledAtLocal
    ? formatDisplayDateTime(booking.scheduledAtLocal)
    : formatDisplayDateTime(booking.scheduledAt, "Chưa hẹn giờ đi");
  const dropoff = booking.parcelDropoffAddress || booking.dropoffAddress || "—";
  const payRecv = booking.paymentReceiver ? PAYMENT_RECEIVER_VI[booking.paymentReceiver] || booking.paymentReceiver : "—";

  const cells: { label: string; value: ReactNode }[] = [
    { label: "Loại dịch vụ", value: serviceTypeLabel[booking.type || ""] || booking.type || "—" },
    { label: "Số ghế / khối lượng", value: <b className="text-brand-800">{adminBookingQuantityLabel(booking)}</b> },
    { label: "Tuyến", value: booking.route?.name || "—" },
    { label: "Chiều", value: booking.direction?.trim() || "—" },
    { label: "Giờ đi", value: when },
    { label: "Trạng thái", value: bookingStatus(booking.status) },
    { label: "Chuyến / tài xế", value: tripLine(booking) },
    { label: "Tổng tiền", value: <b className="text-cta">{formatMoney(booking.finalTotal)}</b> },
    { label: "Hoa hồng", value: formatMoney(booking.commissionAmount) },
    { label: "Thu tiền", value: payRecv },
  ];

  if (booking.paymentStatus) {
    cells.push({ label: "Thanh toán", value: bookingPaymentStatus(booking.paymentStatus) });
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {cells.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{c.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink-900">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Điểm đón / lấy → trả / giao</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-900">
          <span className="font-bold text-brand-700">Đón/lấy:</span> {booking.pickupAddress || "—"}
          <br />
          <span className="font-bold text-orange-600">Trả/giao:</span> {dropoff}
        </p>
      </div>
      {(booking.cargoDescription || booking.marketDescription || booking.note) && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5 text-sm text-ink-800">
          {booking.cargoDescription && (
            <p>
              <span className="font-bold">Hàng:</span> {booking.cargoDescription}
            </p>
          )}
          {booking.marketDescription && (
            <p className={booking.cargoDescription ? "mt-1" : ""}>
              <span className="font-bold">Đi chợ:</span> {booking.marketDescription}
            </p>
          )}
          {booking.note && (
            <p className="mt-1 text-slate-600">
              <span className="font-bold">Ghi chú:</span> {booking.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
