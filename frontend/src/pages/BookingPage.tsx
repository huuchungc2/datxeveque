import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, MapPin, 
  ReceiptText, Route as RouteIcon, ShieldCheck, Users, Box 
} from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { api, formatMoney, unwrapList } from "../lib/api";
import {
  formatDisplayDateTime,
  minBookingDepartureLocal,
  parseLocalDateTimeParts,
  resolveBookingScheduledAt,
} from "../lib/datetime";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE, phoneInputProps, sanitizePhoneInput } from "../lib/phone";
import { findServiceByPath, ROUTE_REQUIRED_SERVICE_TYPES } from "../routes/bookableServices";
import { isGoodsLikeService } from "../lib/bookingForm";
import {
  buildStructuredRouteAddress,
  ROUTE_ENDPOINT_DROPOFF,
  ROUTE_ENDPOINT_PICKUP,
  routeAddressPresets,
} from "../lib/routeAddress";
import type { RouteAddressValue } from "../components/RouteAddressField";
import { usesPassengerCount } from "../lib/bookingSeats";
import { RouteAddressField } from "../components/RouteAddressField";
import { serviceTypeLabel } from "../lib/serviceTypes";
import { customerBookingStatus, customerBookingTypeLabel } from "../lib/vi";
import { useSiteSettings } from "../lib/useSiteSettings";
import { BookingSuccessActions } from "../components/BookingCustomerDetail";
import { FieldError } from "../components/ui/FieldError";
import { GregorianDateTimeInput } from "../components/ui/GregorianDateInputs";
import { QuantityStepper } from "../components/ui/QuantityStepper";
import { focusFormField, inputInvalidClass } from "../lib/formFieldFocus";
import { SEOHead } from "../components/SEOHead";
import { getBrandAssets } from "../lib/useSiteSettings";

function canEstimatePrice(form: { type?: string; routeId?: string | number }) {
  if (!form.type) return false;
  if (ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId) return false;
  return true;
}

function priceHint(form: { type?: string; routeId?: string | number }) {
  if (!form.type) return "Chọn loại dịch vụ để xem giá tạm tính";
  if (ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId) return "Chọn tuyến để xem giá tạm tính";
  return "";
}

type Props = { type?: string; title?: string; defaultRouteId?: number };

type BookingFormState = {
  type: string;
  routeId: number | string;
  customerName: string;
  customerPhone: string;
  scheduledAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupEndpointKey: string;
  pickupDistrictId: string;
  pickupWardId: string;
  pickupStreet: string;
  dropoffEndpointKey: string;
  dropoffDistrictId: string;
  dropoffWardId: string;
  dropoffStreet: string;
  marketDescription: string;
  passengerCount: number;
  weightKg: number;
  note: string;
  cargoDescription: string;
  cargoReceiverName: string;
  cargoReceiverPhone: string;
  parcelDropoffAddress: string;
  hasAccompanyingCargo: boolean;
  cargoNote: string;
  vehicleSizeRequirement: string;
};

function bookingDraftKey(pathname: string) {
  return `dxvq-booking-draft:${pathname}`;
}

export default function BookingPage({ type: initType, title: propTitle, defaultRouteId }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useSiteSettings();
  const brand = getBrandAssets(settings);
  const menuService = findServiceByPath(location.pathname);
  const resolvedType = menuService?.type ?? initType ?? "SHARED_RIDE";
  const serviceLabel = menuService?.menuLabel ?? serviceTypeLabel[resolvedType] ?? resolvedType;

  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const pathnameRef = useRef<string | null>(null);
  const draftHydratedRef = useRef(false);

  const queryRouteId = searchParams.get("routeId");
  const queryScheduledAt = searchParams.get("scheduledAt");
  const initialRouteId = defaultRouteId || (queryRouteId ? Number(queryRouteId) : "");
  const initialScheduledAt = (() => {
    if (queryScheduledAt && !Number.isNaN(new Date(queryScheduledAt).getTime())) {
      return resolveBookingScheduledAt(queryScheduledAt);
    }
    return minBookingDepartureLocal();
  })();

  const [routes, setRoutes] = useState<any[]>([]);
  const [form, setForm] = useState({
    type: resolvedType,
    routeId: initialRouteId,
    customerName: "",
    customerPhone: "",
    scheduledAt: initialScheduledAt,
    pickupAddress: "",
    dropoffAddress: "",
    pickupEndpointKey: "",
    pickupDistrictId: "",
    pickupWardId: "",
    pickupStreet: "",
    dropoffEndpointKey: "",
    dropoffDistrictId: "",
    dropoffWardId: "",
    dropoffStreet: "",
    marketDescription: "",
    passengerCount: 1,
    weightKg: 5,
    note: "",
    cargoDescription: "",
    cargoReceiverName: "",
    cargoReceiverPhone: "",
    parcelDropoffAddress: "",
    hasAccompanyingCargo: false,
    cargoNote: "",
    vehicleSizeRequirement: "Xe 4 chỗ",
  });

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [price, setPrice] = useState<any>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingFocusKey = useRef<string | null>(null);
  const scheduledAtTriggerRef = useRef<HTMLButtonElement>(null);
  const prevRouteIdRef = useRef<number | string | null>(null);

  useEffect(() => {
    api.get("/routes").then((res) => setRoutes(unwrapList(res.data))).catch(() => {});
  }, []);

  /** ?route=slug từ trang SEO tuyến → tự chọn routeId khi API đã load. */
  useEffect(() => {
    const routeSlug = searchParams.get("route");
    if (!routeSlug || routes.length === 0) return;
    const match = routes.find((r) => r.slug === routeSlug);
    if (!match?.id) return;
    setForm((f) => (Number(f.routeId) === Number(match.id) ? f : { ...f, routeId: match.id }));
  }, [routes, searchParams]);

  /** Chỉ reset bước khi đổi route dịch vụ (/dat-xe → /gui-hang). Không reset khi Quay lại giữa các bước. */
  useEffect(() => {
    const pathChanged = pathnameRef.current !== null && pathnameRef.current !== location.pathname;
    pathnameRef.current = location.pathname;

    const qAt = searchParams.get("scheduledAt");
    const qRoute = searchParams.get("routeId");
    const qRouteSlug = searchParams.get("route");
    const hasQuery = Boolean(qAt || qRoute || qRouteSlug);

    if (pathChanged) {
      setMaxStepReached(1);
      setStep(1);
      setError("");
      setSuccessData(null);
      clearAllFieldErrors();
      prevRouteIdRef.current = null;
      draftHydratedRef.current = false;
    }

    setForm((f) => {
      const next: BookingFormState = { ...f, type: resolvedType };
      if (pathChanged || hasQuery) {
        if (qRoute) next.routeId = Number(qRoute);
        else if (defaultRouteId) next.routeId = defaultRouteId;
        if (qAt && !Number.isNaN(new Date(qAt).getTime())) {
          next.scheduledAt = resolveBookingScheduledAt(qAt);
        } else if (!parseLocalDateTimeParts(f.scheduledAt)) {
          next.scheduledAt = minBookingDepartureLocal();
        }
      }
      if (f.type === next.type && f.scheduledAt === next.scheduledAt && f.routeId === next.routeId) return f;
      return next;
    });

  }, [location.pathname, resolvedType, searchParams, defaultRouteId]);

  /** Khôi phục nháp khi F5 / mở lại tab (không ghi đè query từ trang chủ). */
  useEffect(() => {
    if (draftHydratedRef.current || successData) return;
    const qAt = searchParams.get("scheduledAt");
    const qRoute = searchParams.get("routeId");
    if (qAt || qRoute) {
      draftHydratedRef.current = true;
      return;
    }
    try {
      const raw = sessionStorage.getItem(bookingDraftKey(location.pathname));
      if (raw) {
        const draft = JSON.parse(raw) as { step?: number; form?: Partial<BookingFormState>; maxStep?: number };
        if (draft.form) {
          setForm((f) => ({ ...f, ...draft.form, type: resolvedType }));
        }
        if (draft.step && draft.step >= 1 && draft.step <= 3) {
          setStep(draft.step);
        }
        const max = draft.maxStep ?? draft.step ?? 1;
        setMaxStepReached(Math.min(3, Math.max(1, max)));
      }
    } catch {
      /* ignore corrupt draft */
    }
    draftHydratedRef.current = true;
  }, [location.pathname, resolvedType, searchParams, successData]);

  /** Lưu nháp theo từng bước (tab/refresh vẫn còn). Xóa sau khi đặt thành công. */
  useEffect(() => {
    if (successData) {
      try {
        sessionStorage.removeItem(bookingDraftKey(location.pathname));
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      sessionStorage.setItem(
        bookingDraftKey(location.pathname),
        JSON.stringify({ step, form, maxStep: maxStepReached })
      );
    } catch {
      /* quota / private mode */
    }
  }, [form, step, maxStepReached, location.pathname, successData]);

  const selectedRoute = useMemo(() => routes.find((r) => Number(r.id) === Number(form.routeId)), [routes, form.routeId]);
  const isGoods = isGoodsLikeService(form.type);
  const needsRoute = ROUTE_REQUIRED_SERVICE_TYPES.has(form.type);

  /** Chỉ xóa địa chỉ khi khách đổi tuyến — không xóa lúc danh sách tuyến load lần đầu. */
  useEffect(() => {
    if (!selectedRoute) return;
    const id = selectedRoute.id;
    const prev = prevRouteIdRef.current;
    const userChangedRoute = prev !== null && prev !== id;

    setForm((f) => {
      const next = {
        ...f,
        pickupEndpointKey: ROUTE_ENDPOINT_PICKUP,
        dropoffEndpointKey: ROUTE_ENDPOINT_DROPOFF,
      };
      if (!userChangedRoute) return next;
      return {
        ...next,
        pickupDistrictId: "",
        pickupWardId: "",
        pickupStreet: "",
        dropoffDistrictId: "",
        dropoffWardId: "",
        dropoffStreet: "",
      };
    });

    prevRouteIdRef.current = id;
  }, [selectedRoute?.id]);

  const pickupAddressValue: RouteAddressValue = useMemo(
    () => ({
      endpointKey: form.pickupEndpointKey,
      districtId: form.pickupDistrictId,
      wardId: form.pickupWardId,
      street: form.pickupStreet,
    }),
    [form.pickupEndpointKey, form.pickupDistrictId, form.pickupWardId, form.pickupStreet]
  );

  const dropoffAddressValue: RouteAddressValue = useMemo(
    () => ({
      endpointKey: form.dropoffEndpointKey,
      districtId: form.dropoffDistrictId,
      wardId: form.dropoffWardId,
      street: form.dropoffStreet,
    }),
    [form.dropoffEndpointKey, form.dropoffDistrictId, form.dropoffWardId, form.dropoffStreet]
  );

  const composedAddresses = useMemo(() => {
    const presets = routeAddressPresets(selectedRoute);
    if (!presets.length) {
      return { pickupAddress: form.pickupStreet.trim(), dropoffAddress: form.dropoffStreet.trim() };
    }
    return {
      pickupAddress: buildStructuredRouteAddress(
        selectedRoute,
        form.pickupEndpointKey,
        form.pickupDistrictId,
        form.pickupWardId,
        form.pickupStreet
      ),
      dropoffAddress: buildStructuredRouteAddress(
        selectedRoute,
        form.dropoffEndpointKey,
        form.dropoffDistrictId,
        form.dropoffWardId,
        form.dropoffStreet
      ),
    };
  }, [selectedRoute, form.pickupEndpointKey, form.pickupDistrictId, form.pickupWardId, form.pickupStreet, form.dropoffEndpointKey, form.dropoffDistrictId, form.dropoffWardId, form.dropoffStreet]);

  useEffect(() => {
    if (!canEstimatePrice(form)) {
      setPrice(null);
      return;
    }
    const delay = setTimeout(() => {
      api.post("/price/estimate", form)
        .then((r) => setPrice(r.data))
        .catch(() => setPrice(null));
    }, 300);
    return () => clearTimeout(delay);
  }, [form]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearFieldError("customerPhone");
    setForm({ ...form, customerPhone: sanitizePhoneInput(e.target.value) });
  };

  const registerFieldRef = (key: string) => (el: HTMLElement | null) => {
    fieldRefs.current[key] = el;
  };

  useEffect(() => {
    if (scheduledAtTriggerRef.current) {
      fieldRefs.current.scheduledAt = scheduledAtTriggerRef.current;
    }
  });

  useEffect(() => {
    const key = pendingFocusKey.current;
    if (!key) return;
    pendingFocusKey.current = null;
    focusFormField(fieldRefs.current[key] ?? null);
  }, [step]);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearAllFieldErrors = () => setFieldErrors({});

  const markFieldError = (key: string, message: string, deferFocus = false): false => {
    setFieldErrors({ [key]: message });
    setError("");
    if (deferFocus) {
      pendingFocusKey.current = key;
    } else {
      focusFormField(fieldRefs.current[key] ?? null);
    }
    return false;
  };

  /** Giờ đi: chỉ bắt đã chọn; không chặn quá khứ / +1h lúc xác nhận. */
  const validateScheduledAt = (deferFocus = false) => {
    if (!parseLocalDateTimeParts(form.scheduledAt)) {
      return markFieldError("scheduledAt", "Vui lòng chọn thời gian xuất phát.", deferFocus);
    }
    return true;
  };

  /** Bước 1: tuyến, giờ, số khách / hàng / đi chợ */
  const validateStep1Fields = (deferFocus = false, clearErrors = true) => {
    if (clearErrors) clearAllFieldErrors();
    if (needsRoute && !form.routeId) {
      return markFieldError("routeId", "Vui lòng chọn tuyến đường hành trình.", deferFocus);
    }
    if (!validateScheduledAt(deferFocus)) return false;
    if (form.type === "CARGO") {
      if (!form.cargoDescription.trim()) {
        return markFieldError("cargoDescription", "Vui lòng mô tả hàng gửi.", deferFocus);
      }
      if (!Number.isFinite(form.weightKg) || form.weightKg < 1) {
        return markFieldError("weightKg", "Vui lòng nhập cân nặng hợp lệ (ít nhất 1 kg).", deferFocus);
      }
    }
    if (form.type === "MARKET" && !form.marketDescription.trim()) {
      return markFieldError("marketDescription", "Vui lòng mô tả đồ cần mua.", deferFocus);
    }
    return true;
  };

  /** Bước 2: điểm đón / trả hoặc lấy / giao */
  const validateStep2Fields = (deferFocus = false, clearErrors = true) => {
    if (clearErrors) clearAllFieldErrors();
    if (needsRoute && !form.routeId) {
      return markFieldError("routeId", "Vui lòng chọn tuyến đường hành trình.", true);
    }
    if (selectedRoute && routeAddressPresets(selectedRoute).length > 0) {
      if (!form.pickupDistrictId) {
        return markFieldError("pickupDistrict", "Vui lòng chọn quận / huyện đón hoặc lấy hàng.", deferFocus);
      }
      if (!form.pickupWardId) {
        return markFieldError("pickupWard", "Vui lòng chọn phường / xã đón hoặc lấy hàng.", deferFocus);
      }
      if (!form.pickupStreet.trim()) {
        return markFieldError("pickupStreet", "Vui lòng nhập số nhà, tên đường tại điểm đón/lấy.", deferFocus);
      }
      if (!form.dropoffDistrictId) {
        return markFieldError("dropoffDistrict", "Vui lòng chọn quận / huyện trả hoặc giao hàng.", deferFocus);
      }
      if (!form.dropoffWardId) {
        return markFieldError("dropoffWard", "Vui lòng chọn phường / xã trả hoặc giao hàng.", deferFocus);
      }
      if (!form.dropoffStreet.trim()) {
        return markFieldError("dropoffStreet", "Vui lòng nhập số nhà, tên đường tại điểm trả/giao.", deferFocus);
      }
    } else {
      if (!composedAddresses.pickupAddress.trim()) {
        return markFieldError(
          "pickupStreetPlain",
          isGoods ? "Vui lòng nhập điểm lấy hàng." : "Vui lòng nhập địa chỉ đón.",
          deferFocus
        );
      }
      if (!composedAddresses.dropoffAddress.trim()) {
        return markFieldError(
          "dropoffStreetPlain",
          isGoods ? "Vui lòng nhập điểm giao hàng." : "Vui lòng nhập địa chỉ trả.",
          deferFocus
        );
      }
    }
    return true;
  };

  /** Bước 3: liên hệ, người nhận, hàng đi kèm */
  const validateStep3Fields = () => {
    clearAllFieldErrors();
    if (!form.customerName.trim()) {
      return markFieldError(
        "customerName",
        isGoods ? "Vui lòng nhập tên người đặt." : "Vui lòng nhập họ và tên người đi xe."
      );
    }
    if (!normalizeVnPhone(form.customerPhone)) {
      return markFieldError("customerPhone", PHONE_INVALID_MESSAGE);
    }
    if (form.type === "CARGO" || form.type === "MARKET") {
      if (!form.cargoReceiverName.trim()) {
        return markFieldError("cargoReceiverName", "Vui lòng nhập tên người nhận.");
      }
      if (!normalizeVnPhone(form.cargoReceiverPhone)) {
        return markFieldError("cargoReceiverPhone", "Vui lòng nhập số điện thoại người nhận hợp lệ.");
      }
    }
    if (form.hasAccompanyingCargo && usesPassengerCount(form.type) && !form.cargoDescription.trim()) {
      return markFieldError("accompanyingCargoDescription", "Vui lòng mô tả hàng đi kèm.");
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1) {
      if (!validateStep1Fields()) return;
    } else if (step === 2) {
      if (!validateStep2Fields()) {
        if (needsRoute && !form.routeId) setStep(1);
        return;
      }
    }
    clearAllFieldErrors();
    setError("");
    setStep((prev) => {
      const next = Math.min(3, prev + 1);
      setMaxStepReached((m) => Math.max(m, next));
      return next;
    });
  };

  const goToStep = (target: number) => {
    if (target < 1 || target > 3 || target > maxStepReached) return;
    setError("");
    clearAllFieldErrors();
    setStep(target);
  };

  const prevStep = () => {
    setError("");
    clearAllFieldErrors();
    setStep((prev) => Math.max(1, prev - 1));
  };

  const leaveBooking = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const handleStepBack = () => {
    if (step === 1) {
      leaveBooking();
      return;
    }
    prevStep();
  };

  const primaryStepLabel = () => {
    if (step === 1) {
      return isGoods ? "Tiếp tục — điểm lấy & giao" : "Tiếp tục chọn điểm đón";
    }
    if (step === 2) return "Nhập thông tin liên hệ";
    if (loading) return "Đang xử lý...";
    if (form.type === "CARGO") return "Gửi yêu cầu gửi hàng";
    if (form.type === "MARKET") return "Gửi yêu cầu đi chợ";
    return "Xác nhận đặt xe ngay";
  };

  const submitBooking = async () => {
    if (!validateStep3Fields()) return;
    if (!validateStep2Fields(true, false)) {
      setStep(needsRoute && !form.routeId ? 1 : 2);
      return;
    }
    if (!validateStep1Fields(true, false)) {
      setStep(1);
      return;
    }

    const p = normalizeVnPhone(form.customerPhone)!;
    const scheduledAt = resolveBookingScheduledAt(form.scheduledAt);

    setLoading(true);
    try {
      const payload = {
        ...form,
        scheduledAt,
        direction: selectedRoute?.direction || undefined,
        pickupAddress: composedAddresses.pickupAddress,
        dropoffAddress: composedAddresses.dropoffAddress,
        customerPhone: p,
        cargoReceiverPhone: isGoods ? normalizeVnPhone(form.cargoReceiverPhone) : form.cargoReceiverPhone,
        note: [form.note, form.cargoNote].filter(Boolean).join("\n").trim() || "",
      };
      const res = await api.post("/bookings", payload);
      trackEvent("submit_booking", { page_path: location.pathname });
      try {
        sessionStorage.removeItem(bookingDraftKey(location.pathname));
      } catch {
        /* ignore */
      }
      setSuccessData(res.data?.booking ?? res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Hệ thống bận, vui lòng thử lại sau hoặc gọi hotline.");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    const isCargo = form.type === "CARGO";
    const isMarket = form.type === "MARKET";
    const successTitle = isCargo ? "Gửi hàng thành công" : isMarket ? "Đặt đi chợ thành công" : "Đặt xe thành công";
    const bookedPhone = normalizeVnPhone(form.customerPhone) || form.customerPhone;
    return (
      <div className="page max-w-xl py-10 text-center">
        <SEOHead
          title={`${successTitle} | ${settings.brand_name || brand.brandName}`}
          description="Yêu cầu của bạn đã được ghi nhận. Nhân viên sẽ liên hệ xác nhận qua điện thoại/Zalo."
          canonicalPath={location.pathname}
          ogImage={brand.logoUrl}
          noIndex
        />
        <div className="panel flex flex-col items-center p-8 shadow-xl">
          <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 mb-4">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{successTitle}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Mã đơn:{" "}
            <b className="text-lg text-brand-700 font-mono tracking-wider bg-slate-100 px-2 py-0.5 rounded">
              {successData.code}
            </b>
          </p>
          <p className="mt-2 text-sm font-semibold text-brand-800">
            Trạng thái: {customerBookingStatus(successData.status)}
          </p>
          <p className="mt-3 text-sm text-slate-600 leading-6">
            Nhân viên sẽ liên hệ xác nhận qua điện thoại/Zalo số <b>{bookedPhone}</b>.
          </p>
          <div className="mt-6 w-full border-t pt-4 text-left space-y-2 text-xs text-slate-500">
            <p>• Loại đơn: <b>{customerBookingTypeLabel(form.type, form.hasAccompanyingCargo)}</b></p>
            <p>• Tuyến: <b>{selectedRoute?.name || "—"}</b></p>
            <p>• Ngày giờ: <b>{formatDisplayDateTime(form.scheduledAt, "—")}</b></p>
            <p>• Đón/lấy: <b>{composedAddresses.pickupAddress || "—"}</b></p>
            <p>• Trả/giao: <b>{form.parcelDropoffAddress || composedAddresses.dropoffAddress || "—"}</b></p>
            <p>
              • Tiền dự kiến:{" "}
              <b className="text-sm text-cta-500">
                {price && Number(price.estimatedTotal) > 0
                  ? formatMoney(price.estimatedTotal)
                  : "Giá sẽ được xác nhận khi nhân viên liên hệ"}
              </b>
            </p>
          </div>
          <BookingSuccessActions code={successData.code} phone={bookedPhone} className="mt-6" />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={
          location.pathname === "/dat-xe"
            ? "Đặt Xe Về Quê Nhanh Chóng | Gọi Xe 4 Chỗ, 7 Chỗ, Xe Ghép"
            : location.pathname === "/gui-hang"
              ? "Gửi Hàng Về Quê | Gửi Hàng Theo Tuyến Xe Nhanh Gọn"
              : location.pathname === "/di-cho-que"
                ? "Đi Chợ Quê | Đặt Mua Đặc Sản, Hàng Quê Theo Nhu Cầu"
                : `${propTitle || "Đặt xe trực tuyến"} | ${settings.brand_name || brand.brandName}`
        }
        description={
          location.pathname === "/dat-xe"
            ? "Đặt xe về quê online nhanh chóng. Chọn tuyến, loại dịch vụ, số khách, điểm đón trả và gửi yêu cầu đặt xe dễ dàng."
            : location.pathname === "/gui-hang"
              ? "Dịch vụ gửi hàng về quê theo tuyến xe, hỗ trợ nhận gửi hàng linh hoạt, phù hợp hàng cá nhân, quà quê, đồ dùng cần chuyển nhanh."
              : location.pathname === "/di-cho-que"
                ? "Dịch vụ đi chợ quê hỗ trợ đặt mua hàng quê, đặc sản, thực phẩm và giao theo tuyến xe phù hợp nhu cầu khách hàng."
                : "Gửi yêu cầu đặt xe nhanh chóng, chọn tuyến, thời gian và điểm đón trả phù hợp."
        }
        canonicalPath={location.pathname}
        ogImage={brand.logoUrl}
      />

      <div className="page max-w-2xl py-6 pb-36 md:pb-8">
        {/* PROGRESS BAR */}
        <div className="mb-8 flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          {(
            [
              { n: 1, label: "Hành trình" },
              { n: 2, label: "Đón trả" },
              { n: 3, label: "Liên hệ" },
            ] as const
          ).map(({ n, label }, idx) => (
            <span key={n} className="contents">
              {idx > 0 && <div className="mx-3 h-[2px] flex-1 bg-slate-200" />}
              <button
                type="button"
                disabled={n > maxStepReached}
                onClick={() => goToStep(n)}
                className={`flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition ${
                  step === n ? "text-brand-700" : n <= maxStepReached ? "text-slate-600 hover:text-brand-700" : ""
                } ${n <= maxStepReached ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                    step >= n ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300"
                  }`}
                >
                  {n}
                </span>
                {label}
              </button>
            </span>
          ))}
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="panel shadow-xl p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-slate-900 mb-5 flex items-center gap-2">
            <ReceiptText className="text-brand-700" size={20} />
            {propTitle || menuService?.title
              ? `Đặt vé: ${propTitle || menuService?.title}`
              : "Đăng ký thông tin hành trình"}
          </h2>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Dịch vụ đang đặt</p>
                <p className="mt-0.5 text-base font-extrabold text-brand-900">{serviceLabel}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Muốn đổi loại dịch vụ, chọn mục tương ứng trên menu <b>Hành khách</b> hoặc <b>Hàng hóa</b>.
                </p>
              </div>

              {ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tuyến đường hành trình</label>
                  <select
                    ref={registerFieldRef("routeId")}
                    value={form.routeId === "" || form.routeId == null ? "" : String(form.routeId)}
                    onChange={(e) => {
                      clearFieldError("routeId");
                      const v = e.target.value;
                      setForm({ ...form, routeId: v ? Number(v) : "" });
                    }}
                    aria-invalid={!!fieldErrors.routeId || undefined}
                    aria-describedby={fieldErrors.routeId ? "routeId-err" : undefined}
                    className={`w-full h-12 rounded-xl border bg-white px-3 text-sm font-semibold text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 ${inputInvalidClass(!!fieldErrors.routeId)}`}
                  >
                    <option value="">-- Click chọn tuyến đường của bạn --</option>
                    {routes.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <FieldError id="routeId-err" message={fieldErrors.routeId} />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Thời gian xuất phát dự kiến</label>
                <GregorianDateTimeInput
                  suggestPlus1h
                  triggerRef={scheduledAtTriggerRef}
                  invalid={!!fieldErrors.scheduledAt}
                  aria-describedby={fieldErrors.scheduledAt ? "scheduledAt-err" : undefined}
                  value={form.scheduledAt}
                  onChange={(val) => {
                    clearFieldError("scheduledAt");
                    setForm({ ...form, scheduledAt: resolveBookingScheduledAt(val) || val });
                  }}
                />
                <FieldError id="scheduledAt-err" message={fieldErrors.scheduledAt} />
              </div>

              {usesPassengerCount(form.type) ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Số lượng hành khách
                  </label>
                  <QuantityStepper
                    aria-label="Số lượng hành khách"
                    min={1}
                    value={form.passengerCount}
                    onChange={(passengerCount) => setForm({ ...form, passengerCount })}
                  />
                </div>
              ) : form.type === "CARGO" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold">
                    Cân nặng tạm tính (kg)
                    <input
                      ref={registerFieldRef("weightKg")}
                      type="number"
                      min={1}
                      aria-invalid={!!fieldErrors.weightKg || undefined}
                      aria-describedby={fieldErrors.weightKg ? "weightKg-err" : undefined}
                      className={`input mt-2 ${inputInvalidClass(!!fieldErrors.weightKg)}`}
                      value={form.weightKg}
                      onChange={(e) => {
                        clearFieldError("weightKg");
                        setForm({ ...form, weightKg: Number(e.target.value) });
                      }}
                    />
                    <FieldError id="weightKg-err" message={fieldErrors.weightKg} />
                  </label>
                  <label className="block text-sm font-bold">
                    Mô tả hàng hóa
                    <input
                      ref={registerFieldRef("cargoDescription")}
                      className={`input mt-2 ${inputInvalidClass(!!fieldErrors.cargoDescription)}`}
                      aria-invalid={!!fieldErrors.cargoDescription || undefined}
                      aria-describedby={fieldErrors.cargoDescription ? "cargoDescription-err" : undefined}
                      value={form.cargoDescription}
                      onChange={(e) => {
                        clearFieldError("cargoDescription");
                        setForm({ ...form, cargoDescription: e.target.value });
                      }}
                      placeholder="Ví dụ: Thùng xốp đồ ăn, xe máy..."
                    />
                    <FieldError id="cargoDescription-err" message={fieldErrors.cargoDescription} />
                  </label>
                </div>
              ) : form.type === "MARKET" ? (
                <label className="block text-sm font-bold text-slate-900">
                  Đồ cần mua / ghi chú chợ
                  <textarea
                    ref={registerFieldRef("marketDescription")}
                    className={`input mt-2 min-h-[5rem] p-3 ${inputInvalidClass(!!fieldErrors.marketDescription)}`}
                    rows={3}
                    aria-invalid={!!fieldErrors.marketDescription || undefined}
                    aria-describedby={fieldErrors.marketDescription ? "marketDescription-err" : undefined}
                    value={form.marketDescription}
                    onChange={(e) => {
                      clearFieldError("marketDescription");
                      setForm({ ...form, marketDescription: e.target.value });
                    }}
                    placeholder="Ví dụ: 2kg tôm khô, 1 chai mắm ruốc, rau muống…"
                  />
                  <FieldError id="marketDescription-err" message={fieldErrors.marketDescription} />
                </label>
              ) : form.type === "PRIVATE_RIDE" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Kích thước xe yêu cầu</label>
                  <select className="w-full h-12 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none" value={form.vehicleSizeRequirement} onChange={(e) => setForm({ ...form, vehicleSizeRequirement: e.target.value })}>
                    <option>Xe 4 chỗ</option>
                    <option>Xe 7 chỗ</option>
                    <option>Xe 16 chỗ</option>
                    <option>Xe 29 chỗ</option>
                  </select>
                </div>
              ) : null}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              {needsRoute && !selectedRoute ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Chưa chọn tuyến. Bấm <b>Quay lại</b> và chọn tuyến đường để nhập địa chỉ đón/trả hoặc lấy/giao hàng.
                </p>
              ) : selectedRoute && routeAddressPresets(selectedRoute).length > 0 ? (
                <>
                  <RouteAddressField
                    idPrefix="pickup"
                    fixedEndpoint={ROUTE_ENDPOINT_PICKUP}
                    label={isGoods ? "Điểm lấy hàng" : "Địa chỉ đón"}
                    route={selectedRoute}
                    value={pickupAddressValue}
                    fieldErrors={fieldErrors}
                    registerRef={registerFieldRef}
                    onClearError={clearFieldError}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        pickupEndpointKey: ROUTE_ENDPOINT_PICKUP,
                        pickupDistrictId: v.districtId,
                        pickupWardId: v.wardId,
                        pickupStreet: v.street,
                      })
                    }
                  />
                  <RouteAddressField
                    idPrefix="dropoff"
                    fixedEndpoint={ROUTE_ENDPOINT_DROPOFF}
                    label={isGoods ? "Điểm giao hàng (đến)" : "Địa điểm đến"}
                    route={selectedRoute}
                    value={dropoffAddressValue}
                    fieldErrors={fieldErrors}
                    registerRef={registerFieldRef}
                    onClearError={clearFieldError}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        dropoffEndpointKey: ROUTE_ENDPOINT_DROPOFF,
                        dropoffDistrictId: v.districtId,
                        dropoffWardId: v.wardId,
                        dropoffStreet: v.street,
                      })
                    }
                  />
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <MapPin size={14} className="text-emerald-600" />
                      {isGoods ? "Điểm lấy hàng" : "Địa chỉ đón"}
                    </label>
                    <input
                      ref={registerFieldRef("pickupStreetPlain")}
                      className={`input h-12 w-full rounded-xl ${inputInvalidClass(!!fieldErrors.pickupStreetPlain)}`}
                      aria-invalid={!!fieldErrors.pickupStreetPlain || undefined}
                      aria-describedby={fieldErrors.pickupStreetPlain ? "pickupStreetPlain-err" : undefined}
                      value={form.pickupStreet}
                      onChange={(e) => {
                        clearFieldError("pickupStreetPlain");
                        setForm({ ...form, pickupStreet: e.target.value });
                      }}
                      placeholder="Số nhà, tên đường, thôn/xóm…"
                    />
                    <FieldError id="pickupStreetPlain-err" message={fieldErrors.pickupStreetPlain} />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <MapPin size={14} className="text-red-500" />
                      {isGoods ? "Điểm giao hàng" : "Địa chỉ trả"}
                    </label>
                    <input
                      ref={registerFieldRef("dropoffStreetPlain")}
                      className={`input h-12 w-full rounded-xl ${inputInvalidClass(!!fieldErrors.dropoffStreetPlain)}`}
                      aria-invalid={!!fieldErrors.dropoffStreetPlain || undefined}
                      aria-describedby={fieldErrors.dropoffStreetPlain ? "dropoffStreetPlain-err" : undefined}
                      value={form.dropoffStreet}
                      onChange={(e) => {
                        clearFieldError("dropoffStreetPlain");
                        setForm({ ...form, dropoffStreet: e.target.value });
                      }}
                      placeholder="Số nhà, tên đường, thôn/xóm…"
                    />
                    <FieldError id="dropoffStreetPlain-err" message={fieldErrors.dropoffStreetPlain} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Hành trình đã chọn</p>
                <p className="mt-1 font-semibold text-ink-900">
                  {selectedRoute?.name || "—"}
                  <span className="mx-2 text-slate-300">·</span>
                  {formatDisplayDateTime(form.scheduledAt, "Chưa chọn giờ")}
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs font-bold text-brand-700 hover:underline"
                  onClick={() => goToStep(1)}
                >
                  Sửa tuyến / ngày giờ
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-slate-900">
                  {isGoods ? "Người đặt" : "Họ và tên người đi xe"}
                  <input
                    ref={registerFieldRef("customerName")}
                    className={`input mt-2 h-12 ${inputInvalidClass(!!fieldErrors.customerName)}`}
                    aria-invalid={!!fieldErrors.customerName || undefined}
                    aria-describedby={fieldErrors.customerName ? "customerName-err" : undefined}
                    value={form.customerName}
                    onChange={(e) => {
                      clearFieldError("customerName");
                      setForm({ ...form, customerName: e.target.value });
                    }}
                    placeholder="Nguyễn Văn A"
                  />
                  <FieldError id="customerName-err" message={fieldErrors.customerName} />
                </label>
                <label className="block text-sm font-bold text-slate-900">
                  {isGoods ? "SĐT người đặt" : "Số điện thoại"}
                  <input
                    ref={registerFieldRef("customerPhone")}
                    className={`input mt-2 h-12 ${inputInvalidClass(!!fieldErrors.customerPhone)}`}
                    aria-invalid={!!fieldErrors.customerPhone || undefined}
                    aria-describedby={fieldErrors.customerPhone ? "customerPhone-err" : undefined}
                    {...phoneInputProps}
                    value={form.customerPhone}
                    onChange={handlePhoneChange}
                    placeholder="0912xxxxxx"
                  />
                  <FieldError id="customerPhone-err" message={fieldErrors.customerPhone} />
                </label>
              </div>

              {(form.type === "CARGO" || form.type === "MARKET") && (
                <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <label className="block text-sm font-bold text-slate-900">
                    {form.type === "MARKET" ? "Người nhận hàng (ở quê)" : "Người nhận"}
                    <input
                      ref={registerFieldRef("cargoReceiverName")}
                      className={`input mt-2 h-12 ${inputInvalidClass(!!fieldErrors.cargoReceiverName)}`}
                      aria-invalid={!!fieldErrors.cargoReceiverName || undefined}
                      aria-describedby={fieldErrors.cargoReceiverName ? "cargoReceiverName-err" : undefined}
                      value={form.cargoReceiverName}
                      onChange={(e) => {
                        clearFieldError("cargoReceiverName");
                        setForm({ ...form, cargoReceiverName: e.target.value });
                      }}
                    />
                    <FieldError id="cargoReceiverName-err" message={fieldErrors.cargoReceiverName} />
                  </label>
                  <label className="block text-sm font-bold text-slate-900">
                    SĐT người nhận
                    <input
                      ref={registerFieldRef("cargoReceiverPhone")}
                      className={`input mt-2 h-12 ${inputInvalidClass(!!fieldErrors.cargoReceiverPhone)}`}
                      aria-invalid={!!fieldErrors.cargoReceiverPhone || undefined}
                      aria-describedby={fieldErrors.cargoReceiverPhone ? "cargoReceiverPhone-err" : undefined}
                      {...phoneInputProps}
                      value={form.cargoReceiverPhone}
                      onChange={(e) => {
                        clearFieldError("cargoReceiverPhone");
                        setForm({ ...form, cargoReceiverPhone: sanitizePhoneInput(e.target.value) });
                      }}
                    />
                    <FieldError id="cargoReceiverPhone-err" message={fieldErrors.cargoReceiverPhone} />
                  </label>
                </div>
              )}

              {usesPassengerCount(form.type) && (
                <label className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-brand-700"
                    checked={form.hasAccompanyingCargo}
                    onChange={(e) => setForm({ ...form, hasAccompanyingCargo: e.target.checked })}
                  />
                  <span className="text-sm">
                    <b className="text-slate-900">Tôi có gửi hàng / mang hàng theo</b>
                    <span className="block text-slate-500 mt-0.5">Hàng đi kèm không tính thêm ghế.</span>
                  </span>
                </label>
              )}

              {(form.type === "CARGO" || form.hasAccompanyingCargo) && (
                <div className="space-y-3 rounded-xl border border-slate-100 p-4">
                  <label className="block text-sm font-bold text-slate-900">
                    Mô tả hàng
                    <input
                      ref={registerFieldRef(
                        form.hasAccompanyingCargo && usesPassengerCount(form.type)
                          ? "accompanyingCargoDescription"
                          : "cargoDescription"
                      )}
                      className={`input mt-2 h-12 ${inputInvalidClass(
                        !!(fieldErrors.accompanyingCargoDescription || fieldErrors.cargoDescription)
                      )}`}
                      value={form.cargoDescription}
                      onChange={(e) => {
                        clearFieldError("accompanyingCargoDescription");
                        clearFieldError("cargoDescription");
                        setForm({ ...form, cargoDescription: e.target.value });
                      }}
                      placeholder="Loại hàng, kích thước..."
                    />
                    <FieldError
                      id="accompanyingCargoDescription-err"
                      message={fieldErrors.accompanyingCargoDescription || fieldErrors.cargoDescription}
                    />
                  </label>
                  {form.hasAccompanyingCargo && (
                    <>
                      <label className="block text-sm font-bold text-slate-900">Điểm giao hàng (nếu khác điểm trả)
                        <input className="input h-12 mt-2" value={form.parcelDropoffAddress} onChange={(e) => setForm({ ...form, parcelDropoffAddress: e.target.value })} />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-bold text-slate-900">Người nhận (nếu cần)
                          <input className="input h-12 mt-2" value={form.cargoReceiverName} onChange={(e) => setForm({ ...form, cargoReceiverName: e.target.value })} />
                        </label>
                        <label className="block text-sm font-bold text-slate-900">SĐT người nhận
                          <input className="input h-12 mt-2" {...phoneInputProps} value={form.cargoReceiverPhone} onChange={(e) => setForm({ ...form, cargoReceiverPhone: sanitizePhoneInput(e.target.value) })} />
                        </label>
                      </div>
                      <label className="block text-sm font-bold text-slate-900">Ghi chú hàng
                        <textarea className="input mt-2 p-3" rows={2} value={form.cargoNote} onChange={(e) => setForm({ ...form, cargoNote: e.target.value })} />
                      </label>
                    </>
                  )}
                </div>
              )}

              <label className="block text-sm font-bold text-slate-900">Ghi chú bổ sung (nếu có)
                <textarea className="input mt-2 p-3" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ví dụ: Xe có trẻ em, mang theo nhiều đồ cồng kềnh..." />
              </label>
            </div>
          )}

          <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={handleStepBack}
              className="flex h-12 w-1/3 items-center justify-center gap-2 rounded-xl text-sm font-bold btn-ghost"
            >
              <ArrowLeft size={16} /> Quay lại
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex h-12 w-2/3 items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-md btn-primary"
              >
                {primaryStepLabel()} <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={submitBooking}
                className="flex h-12 w-2/3 items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-lg btn-primary bg-cta-500 hover:bg-cta-600 disabled:opacity-50"
              >
                {primaryStepLabel()}
              </button>
            )}
          </div>
        </div>

        {/* REASSURANCE BANNER */}
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white p-4 flex items-start gap-3">
          <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
          <p className="text-xs text-slate-500 leading-normal">
            <b>Cam kết từ hệ thống:</b> Toàn bộ luồng đặt xe không yêu cầu khách hàng phải thanh toán trước. Bạn chỉ thanh toán tiền mặt hoặc chuyển khoản trực tiếp cho tài xế sau khi hoàn thành hành trình về quê an toàn.
          </p>
        </div>

        {/* STICKY BAR */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white p-4 px-5 flex items-center justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.06)] md:relative md:shadow-none md:border-none md:p-0 md:mt-6">
          <div className="text-left">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Giá vé tạm tính</span>
            <b className="text-xl text-cta-500 font-black">
              {canEstimatePrice(form) && price ? formatMoney(price.estimatedTotal) : "—"}
            </b>
          </div>
          <div className="text-right text-[11px] text-slate-500 font-medium max-w-[180px] leading-tight md:max-w-none">
            {priceHint(form) ? (
              <span className="text-amber-700 font-semibold">{priceHint(form)}</span>
            ) : (
              <span>Đã bao gồm phí đón trả tận nơi theo tuyến</span>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
