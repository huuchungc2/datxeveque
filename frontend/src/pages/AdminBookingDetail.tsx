import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Banknote, MapPinned, Route as RouteIcon, Ticket, Truck, User } from "lucide-react";
import { api, formatMoney } from "../lib/api";
import {
  formatDisplayDateTime,
  isLocalDateBeforeToday,
  parseLocalDateTimeParts,
  resolveBookingScheduledAt,
  suggestedBookingDepartureHint,
} from "../lib/datetime";
import { FieldError } from "../components/ui/FieldError";
import { AdminBookingSummary } from "../components/AdminBookingSummary";
import { AdminBookingAddressFields } from "../components/AdminBookingAddressFields";
import {
  canAdminCancelBooking,
  canAdminConfirmBooking,
  cancelAdminBooking,
  emptyAdminAddressFields,
  hydrateAdminBookingAddresses,
  isAdminBookingConfirmed,
  validateAdminBookingAddresses,
} from "../lib/adminBookingAddresses";
import type { RouteLike } from "../lib/routeAddress";
import { ROUTE_REQUIRED_SERVICE_TYPES } from "../routes/bookableServices";
import { usesPassengerCount } from "../lib/bookingSeats";
import { phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { SERVICE_TYPE_OPTIONS, serviceTypeLabel } from "../lib/serviceTypes";
import { GregorianDateTimeInput } from "../components/ui/GregorianDateInputs";
import {
  BOOKING_STATUS_VI,
  PAYMENT_RECEIVER_VI,
  bookingPaymentStatus,
  bookingStatus,
} from "../lib/vi";
import {
  AdminBookingFormState,
  bookingToForm,
  buildAdminBookingPayload,
  emptyBookingForm,
} from "../lib/adminBookingForm";

function statusBadgeClass(status: string) {
  if (status === "COMPLETED") return "badge-success";
  if (status === "CANCELLED" || status === "NO_SHOW") return "badge-danger";
  if (["NEW", "CONTACTED", "QUOTED", "WAITING_DEPOSIT"].includes(status)) return "badge-warning";
  return "badge-info";
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-900">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
        {title}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`text-sm font-semibold text-ink-800 ${className}`}>
      {label}
      {required && <span className="text-cta"> *</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function AdminBookingDetail() {
  const { id } = useParams();
  const { pathname } = useLocation();
  /** Route tĩnh `/moi` không có param `:id` — nhận diện qua pathname hoặc id. */
  const isNew = id === "moi" || pathname.endsWith("/admin/don-hang/moi");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const backHref = searchParams.toString() ? `/admin/don-hang?${searchParams}` : "/admin/don-hang";

  const [routes, setRoutes] = useState<({ id: number; name?: string; direction?: string } & RouteLike)[]>([]);
  const [form, setForm] = useState<AdminBookingFormState>(emptyBookingForm);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [priceHint, setPriceHint] = useState<{ estimatedTotal?: number; commissionAmount?: number; note?: string } | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [scheduledAtError, setScheduledAtError] = useState("");
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const prevRouteIdRef = useRef<string | null>(null);
  const hydratedBookingIdRef = useRef<number | null>(null);

  const selectedRoute = useMemo(
    () => routes.find((r) => String(r.id) === String(form.routeId)) ?? null,
    [routes, form.routeId]
  );
  const isGoods = form.type === "CARGO";
  const needsRoute = ROUTE_REQUIRED_SERVICE_TYPES.has(form.type);

  useEffect(() => {
    api.get("/admin/routes").then((r) => setRoutes(r.data));
  }, []);

  useEffect(() => {
    if (isNew) {
      setForm(emptyBookingForm());
      setRaw(null);
      setLoading(false);
      return;
    }
    const numId = Number(id);
    if (!Number.isFinite(numId)) return;
    setLoading(true);
    api
      .get(`/admin/bookings/${numId}`)
      .then((r) => {
        setRaw(r.data);
        hydratedBookingIdRef.current = null;
        setForm(bookingToForm(r.data));
        prevRouteIdRef.current = r.data.routeId != null ? String(r.data.routeId) : "";
      })
      .catch((e: { response?: { data?: { message?: string } } }) => {
        alert(e.response?.data?.message || "Không tải được đơn");
        navigate(backHref);
      })
      .finally(() => setLoading(false));
  }, [id, isNew, backHref, navigate]);

  /** Sau khi có tuyến: tách địa chỉ DB → quận/xã/đường (tránh form trống dropdown). */
  useEffect(() => {
    if (isNew || !raw || !routes.length) return;
    const bookingId = Number(raw.id);
    if (!Number.isFinite(bookingId) || hydratedBookingIdRef.current === bookingId) return;
    const route = routes.find((r) => String(r.id) === String(raw.routeId)) ?? null;
    setForm((f) =>
      hydrateAdminBookingAddresses(f, route, {
        pickupAddress: raw.pickupAddress as string | undefined,
        dropoffAddress: raw.dropoffAddress as string | undefined,
      })
    );
    hydratedBookingIdRef.current = bookingId;
  }, [raw, routes, isNew]);

  useEffect(() => {
    if (!form.type) {
      setPriceHint(null);
      return;
    }
    if (ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId) {
      setPriceHint(null);
      return;
    }
    api
      .post("/price/estimate", {
        type: form.type,
        routeId: form.routeId ? Number(form.routeId) : null,
        passengerCount: usesPassengerCount(form.type) ? Number(form.passengerCount || 1) : 0,
        weightKg: Number(form.weightKg || 0),
        vehicleType: form.vehicleType || null,
      })
      .then((r) => setPriceHint(r.data))
      .catch(() => setPriceHint(null));
  }, [form.type, form.routeId, form.passengerCount, form.weightKg, form.vehicleType]);

  useEffect(() => {
    const rid = form.routeId || "";
    if (prevRouteIdRef.current === null) {
      prevRouteIdRef.current = rid;
      return;
    }
    if (prevRouteIdRef.current === rid) return;
    prevRouteIdRef.current = rid;
    setForm((f) => ({ ...f, ...emptyAdminAddressFields() }));
    setAddressErrors({});
  }, [form.routeId]);

  /** Đơn mới: tự điền tổng tiền + hoa hồng từ bảng giá khi đủ thông tin tính giá. */
  useEffect(() => {
    if (!isNew || !priceHint) return;
    setForm((f) => ({
      ...f,
      finalTotal: Number(priceHint.estimatedTotal || 0),
      commissionAmount: Number(priceHint.commissionAmount || 0),
    }));
  }, [priceHint, isNew]);

  /** Cùng logic validate ngày giờ như BookingPage (khách đặt xe). */
  const validateScheduledAtForNew = (): boolean => {
    const resolved = resolveBookingScheduledAt(form.scheduledAtLocal);
    if (!parseLocalDateTimeParts(resolved)) {
      setScheduledAtError("Vui lòng chọn thời gian xuất phát.");
      return false;
    }
    if (isLocalDateBeforeToday(resolved)) {
      setScheduledAtError("Không thể chọn ngày trong quá khứ.");
      return false;
    }
    if (resolved !== form.scheduledAtLocal) {
      setForm((f) => ({ ...f, scheduledAtLocal: resolved }));
    }
    setScheduledAtError("");
    return true;
  };

  const runConfirm = async () => {
    if (isNew || !form.id) return alert("Lưu đơn trước khi xác nhận");
    if (!confirm("Xác nhận đơn này? Đơn sẽ chuyển sang chờ điều phối.")) return;
    setConfirming(true);
    try {
      const r = await api.post(`/admin/bookings/${form.id}/confirm`, { outcome: "CONFIRMED" });
      hydratedBookingIdRef.current = null;
      setRaw(r.data);
      const route = routes.find((rt) => String(rt.id) === String(r.data.routeId)) ?? null;
      setForm(hydrateAdminBookingAddresses(bookingToForm(r.data), route, r.data));
      hydratedBookingIdRef.current = Number(r.data.id);
      navigate("/admin/dispatch");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || "Không xác nhận được");
    } finally {
      setConfirming(false);
    }
  };

  const validateAddresses = (): boolean => {
    const errors = validateAdminBookingAddresses(form, selectedRoute, isGoods);
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const runCancel = async () => {
    if (!form.id) return;
    const ok = await cancelAdminBooking(form.id, (url, body) => api.post(url, body));
    if (ok) navigate(backHref);
  };

  const saveBooking = async () => {
    if (isNew && !validateScheduledAtForNew()) return;
    if (!validateAddresses()) return;
    setSaving(true);
    try {
      const formToSave = isNew
        ? { ...form, scheduledAtLocal: resolveBookingScheduledAt(form.scheduledAtLocal) }
        : form;
      const payload = buildAdminBookingPayload(formToSave, routes, { omitCommission: true });
      if (isNew) {
        const r = await api.post("/admin/bookings", payload);
        alert(`Đã tạo đơn ${r.data.code}`);
        navigate(`/admin/don-hang/${r.data.id}`);
      } else {
        const r = await api.patch(`/admin/bookings/${form.id}`, payload);
        setRaw(r.data);
        const route = routes.find((rt) => String(rt.id) === String(r.data.routeId)) ?? null;
        hydratedBookingIdRef.current = null;
        const next = hydrateAdminBookingAddresses(bookingToForm(r.data), route, r.data);
        setForm(next);
        hydratedBookingIdRef.current = Number(r.data.id);
        alert("Đã lưu đơn");
      }
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } };
      alert(err.message || err.response?.data?.message || "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  const recalcFromRules = async () => {
    if (isNew) return;
    setSaving(true);
    try {
      const r = await api.patch(`/admin/bookings/${form.id}`, {
        type: form.type,
        routeId: form.routeId ? Number(form.routeId) : null,
        passengerCount: usesPassengerCount(form.type) ? Number(form.passengerCount || 1) : 0,
        recalcFromRules: true,
      });
      setRaw(r.data);
      const route = routes.find((rt) => String(rt.id) === String(r.data.routeId)) ?? null;
      hydratedBookingIdRef.current = null;
      setForm(hydrateAdminBookingAddresses(bookingToForm(r.data), route, r.data));
      hydratedBookingIdRef.current = Number(r.data.id);
      alert("Đã tính lại từ bảng giá");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || "Không tính lại được");
    } finally {
      setSaving(false);
    }
  };

  const tripInfo = (raw?.tripBookings as { trip?: { code?: string; status?: string; driver?: { name?: string; phone?: string } } }[])?.[0]?.trip;

  if (loading) {
    return <div className="card text-sm font-semibold text-ink-500">Đang tải đơn...</div>;
  }

  return (
    <div className="space-y-5 pb-28 md:pb-8">
      <Link to={backHref} className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline">
        <ArrowLeft size={18} />
        Quay lại danh sách
      </Link>

      <div className="card overflow-hidden !p-0">
        <div className="bg-gradient-to-br from-brand-700 to-brand-900 px-5 py-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/15 p-3">
                <Ticket size={28} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-100">
                  {isNew ? "Tạo đơn mới" : "Chi tiết đơn"}
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
                  {isNew ? "Đơn mới" : form.code}
                </h1>
                {!isNew && (
                  <p className="mt-1 text-sm text-brand-100">{serviceTypeLabel[form.type] || form.type}</p>
                )}
              </div>
            </div>
            {!isNew && (
              <div className="text-right">
                <span className={`badge ${statusBadgeClass(form.status)} !bg-white/95`}>{bookingStatus(form.status)}</span>
                <p className="mt-3 text-2xl font-extrabold text-cta-300">{formatMoney(form.finalTotal)}</p>
                {raw?.paymentStatus != null && (
                  <p className="mt-1 text-xs text-brand-100">{bookingPaymentStatus(String(raw.paymentStatus))}</p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {!isNew && raw && (
        <section className="card">
          <h2 className="text-base font-extrabold text-ink-900">Thông tin đơn (đọc nhanh)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Khách <b>{form.customerName}</b> · {form.customerPhone}
          </p>
          <div className="mt-4">
            <AdminBookingSummary
              booking={{
                ...raw,
                type: form.type,
                status: form.status,
                scheduledAtLocal: form.scheduledAtLocal,
                pickupAddress: form.pickupAddress || (raw.pickupAddress as string),
                dropoffAddress: form.dropoffAddress || (raw.dropoffAddress as string),
                passengerCount: form.passengerCount,
                weightKg: form.weightKg,
                vehicleType: form.vehicleType,
                direction: form.direction,
                finalTotal: form.finalTotal,
                commissionAmount: form.commissionAmount,
                paymentReceiver: form.paymentReceiver,
                cargoDescription: form.cargoDescription,
                marketDescription: form.marketDescription,
                note: form.note,
              }}
            />
          </div>
        </section>
      )}

      {!isNew && tripInfo && (
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/dispatch" className="btn-secondary py-2 text-sm">
            Mở điều phối
          </Link>
          {tripInfo.code && (
            <Link to="/admin/dieu-phoi" className="btn-secondary py-2 text-sm">
              Xem chuyến xe
            </Link>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Section title="Loại dịch vụ & tuyến" icon={<RouteIcon size={18} />}>
          <Field label="Loại dịch vụ" required className="sm:col-span-2">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {SERVICE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Tuyến${ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) ? "" : " (tuỳ chọn)"}`} className="sm:col-span-2">
            <select
              className="input"
              value={form.routeId}
              onChange={(e) => setForm({ ...form, routeId: e.target.value })}
            >
              <option value="">— Chọn tuyến —</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chiều / ghi chú tuyến" className="sm:col-span-2">
            <input className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} />
          </Field>
        </Section>

        <Section title="Thông tin khách" icon={<User size={18} />}>
          <Field label="Họ tên khách" required>
            <input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          </Field>
          <Field label="SĐT (10 số)" required>
            <input
              className="input"
              {...phoneInputProps}
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: sanitizePhoneInput(e.target.value) })}
            />
          </Field>
        </Section>

        <Section title="Hành trình" icon={<MapPinned size={18} />}>
          <Field label={isNew ? "Thời gian xuất phát dự kiến" : "Ngày giờ đi"} required className="sm:col-span-2">
            <GregorianDateTimeInput
              className="mt-0"
              minFromNow={isNew}
              invalid={!!scheduledAtError}
              aria-describedby={scheduledAtError ? "admin-scheduledAt-err" : undefined}
              value={form.scheduledAtLocal}
              onChange={(value) => {
                setScheduledAtError("");
                setForm({
                  ...form,
                  scheduledAtLocal: isNew ? resolveBookingScheduledAt(value) : value,
                });
              }}
            />
            <FieldError id="admin-scheduledAt-err" message={scheduledAtError} />
            {isNew && <p className="mt-1 text-xs text-slate-600">{suggestedBookingDepartureHint()}</p>}
          </Field>
          <AdminBookingAddressFields
            form={form}
            setForm={setForm}
            selectedRoute={selectedRoute}
            isGoods={isGoods}
            fieldErrors={addressErrors}
            onClearError={(key) =>
              setAddressErrors((prev) => {
                if (!prev[key]) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
              })
            }
            needsRoute={needsRoute}
          />
        </Section>

        <Section title="Chi tiết dịch vụ" icon={<Truck size={18} />}>
          {usesPassengerCount(form.type) && (
            <Field label="Số khách">
              <input
                className="input"
                type="number"
                min={1}
                value={form.passengerCount}
                onChange={(e) => setForm({ ...form, passengerCount: Number(e.target.value) })}
              />
            </Field>
          )}
          {form.type === "CARGO" && (
            <>
              <Field label="Khối lượng (kg)">
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
                />
              </Field>
              <Field label="Mô tả hàng" className="sm:col-span-2">
                <textarea className="input" rows={2} value={form.cargoDescription} onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })} />
              </Field>
            </>
          )}
          {(form.type === "PRIVATE_RIDE" ||
            form.type === "CONTRACT" ||
            form.type === "WEDDING" ||
            form.type === "TOUR" ||
            form.type === "HOSPITAL" ||
            form.type === "AIRPORT") && (
            <Field label="Loại xe">
              <input className="input" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} />
            </Field>
          )}
          {form.type === "MARKET" && (
            <Field label="Đồ cần mua" className="sm:col-span-2">
              <textarea className="input" rows={2} value={form.marketDescription} onChange={(e) => setForm({ ...form, marketDescription: e.target.value })} />
            </Field>
          )}
          <Field label="Ghi chú nội bộ" className="sm:col-span-2">
            <textarea className="input" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </Section>

        <Section title="Trạng thái & thanh toán" icon={<Banknote size={18} />}>
          <Field label="Trạng thái đơn">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(BOOKING_STATUS_VI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ai thu tiền">
            <select className="input" value={form.paymentReceiver} onChange={(e) => setForm({ ...form, paymentReceiver: e.target.value })}>
              {Object.entries(PAYMENT_RECEIVER_VI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tổng tiền (VNĐ)">
            <input
              className="input"
              type="number"
              min={0}
              value={form.finalTotal}
              onChange={(e) => setForm({ ...form, finalTotal: Number(e.target.value) })}
            />
            {isNew && !priceHint && ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId && (
              <p className="mt-1 text-xs text-amber-700">Chọn tuyến để hệ thống tính giá và hoa hồng.</p>
            )}
          </Field>
          <Field label={isNew ? "Hoa hồng (tự tính từ bảng giá)" : "Hoa hồng (VNĐ)"}>
            {isNew ? (
              <div className="input flex items-center justify-between bg-slate-50 text-ink-900">
                <span className="font-extrabold text-brand-800">{formatMoney(form.commissionAmount)}</span>
                <span className="text-xs font-medium text-slate-500">Không cần nhập tay</span>
              </div>
            ) : (
              <div className="input flex items-center justify-between bg-slate-50 text-ink-900">
                <span className="font-extrabold text-brand-800">{formatMoney(form.commissionAmount)}</span>
                <span className="text-xs text-slate-500">Bấm «Tính lại giá» để cập nhật</span>
              </div>
            )}
          </Field>
          {priceHint?.note && (
            <p className="sm:col-span-2 text-xs text-slate-600">{String(priceHint.note)}</p>
          )}
        </Section>

        {!isNew && (canAdminConfirmBooking(form.status) || isAdminBookingConfirmed(form.status) || canAdminCancelBooking(form.status)) && (
          <section className="card">
            <h2 className="text-base font-extrabold text-ink-900">Xác nhận & hủy đơn</h2>
            <p className="mt-1 text-sm text-slate-600">
              Xác nhận sau khi liên hệ khách — đơn chuyển <b>chờ điều phối</b> và mở trang điều phối.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canAdminConfirmBooking(form.status) && (
                <button type="button" className="btn-primary py-2 text-sm" disabled={confirming || saving} onClick={runConfirm}>
                  Xác nhận
                </button>
              )}
              {isAdminBookingConfirmed(form.status) && (
                <span className="inline-flex items-center rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
                  Đã xác nhận
                </span>
              )}
              {isAdminBookingConfirmed(form.status) && (
                <Link to="/admin/dispatch" className="btn-secondary py-2 text-sm">
                  Điều phối
                </Link>
              )}
              {canAdminCancelBooking(form.status) && (
                <button
                  type="button"
                  className="btn-secondary border-red-200 py-2 text-sm text-red-700 hover:bg-red-50"
                  disabled={confirming || saving}
                  onClick={runCancel}
                >
                  Hủy đơn
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Sticky actions — mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2 md:max-w-none">
          <button type="button" className="btn-primary flex-1 py-3 md:flex-none md:py-2" disabled={saving} onClick={saveBooking}>
            {isNew ? "Tạo đơn" : "Lưu thay đổi"}
          </button>
          {!isNew && (
            <button type="button" className="btn-secondary flex-1 py-3 md:flex-none md:py-2" disabled={saving} onClick={recalcFromRules}>
              Tính lại giá
            </button>
          )}
          {!isNew && (
            <Link to="/admin/dispatch" className="btn-secondary flex-1 py-3 text-center md:flex-none md:py-2">
              Điều phối
            </Link>
          )}
          {isNew && (
            <Link to={backHref} className="btn-secondary flex-1 py-3 text-center md:flex-none md:py-2">
              Hủy
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
