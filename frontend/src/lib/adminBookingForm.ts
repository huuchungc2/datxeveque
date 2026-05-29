import { minBookingDepartureLocal, toDatetimeLocalValue } from "./datetime";
import { ROUTE_REQUIRED_SERVICE_TYPES } from "../routes/bookableServices";
import { usesPassengerCount } from "./bookingSeats";
import { normalizeVnPhone, PHONE_INVALID_MESSAGE } from "./phone";
import { composeAdminBookingAddresses, emptyAdminAddressFields } from "./adminBookingAddresses";
import type { RouteLike } from "./routeAddress";

export type AdminBookingFormState = {
  id: number | null;
  code: string;
  type: string;
  routeId: string;
  customerName: string;
  customerPhone: string;
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
  direction: string;
  scheduledAtLocal: string;
  passengerCount: number;
  weightKg: number;
  vehicleType: string;
  cargoDescription: string;
  marketDescription: string;
  note: string;
  status: string;
  paymentReceiver: string;
  finalTotal: number;
  commissionAmount: number;
};

export function emptyBookingForm(): AdminBookingFormState {
  return {
    id: null,
    code: "",
    type: "SHARED_RIDE",
    routeId: "",
    customerName: "",
    customerPhone: "",
    pickupAddress: "",
    dropoffAddress: "",
    ...emptyAdminAddressFields(),
    direction: "",
    scheduledAtLocal: minBookingDepartureLocal(),
    passengerCount: 1,
    weightKg: 1,
    vehicleType: "Xe 7 chỗ",
    cargoDescription: "",
    marketDescription: "",
    note: "",
    status: "WAITING_DISPATCH",
    paymentReceiver: "DRIVER",
    finalTotal: 0,
    commissionAmount: 0,
  };
}

export function bookingToForm(b: Record<string, unknown>): AdminBookingFormState {
  const base = emptyBookingForm();
  return {
    ...base,
    id: (b.id as number) ?? null,
    code: (b.code as string) || "",
    type: (b.type as string) || base.type,
    routeId: b.routeId != null ? String(b.routeId) : "",
    customerName: (b.customerName as string) || "",
    customerPhone: (b.customerPhone as string) || "",
    pickupAddress: (b.pickupAddress as string) || "",
    dropoffAddress: (b.dropoffAddress as string) || "",
    ...emptyAdminAddressFields(),
    pickupStreet: (b.pickupAddress as string) || "",
    dropoffStreet: (b.dropoffAddress as string) || "",
    direction: (b.direction as string) || "",
    scheduledAtLocal:
      (b.scheduledAtLocal as string) || toDatetimeLocalValue(b.scheduledAt as string | undefined),
    passengerCount: usesPassengerCount(b.type as string) ? Number(b.passengerCount ?? 1) : 0,
    weightKg: Number(b.weightKg ?? 1),
    vehicleType: (b.vehicleType as string) || "",
    cargoDescription: (b.cargoDescription as string) || "",
    marketDescription: (b.marketDescription as string) || "",
    note: (b.note as string) || "",
    status: (b.status as string) || base.status,
    paymentReceiver: (b.paymentReceiver as string) || "DRIVER",
    finalTotal: Number(b.finalTotal ?? 0),
    commissionAmount: Number(b.commissionAmount ?? 0),
  };
}

export function buildAdminBookingPayload(
  form: AdminBookingFormState,
  routes: ({ id: number; name?: string; direction?: string } & RouteLike)[],
  options?: { omitCommission?: boolean }
) {
  const phone = normalizeVnPhone(form.customerPhone);
  if (!phone) throw new Error(PHONE_INVALID_MESSAGE);
  if (!form.customerName.trim()) throw new Error("Vui lòng nhập họ tên khách");
  if (!form.scheduledAtLocal) throw new Error("Vui lòng chọn ngày giờ đi");
  if (ROUTE_REQUIRED_SERVICE_TYPES.has(form.type) && !form.routeId) {
    throw new Error("Vui lòng chọn tuyến");
  }
  const selectedRoute = routes.find((r) => String(r.id) === String(form.routeId));
  const addresses = composeAdminBookingAddresses(form, selectedRoute);
  const payload: Record<string, unknown> = {
    customerName: form.customerName.trim(),
    customerPhone: phone,
    type: form.type,
    routeId: form.routeId ? Number(form.routeId) : null,
    direction: form.direction || selectedRoute?.direction || selectedRoute?.name || null,
    pickupAddress: addresses.pickupAddress || null,
    dropoffAddress: addresses.dropoffAddress || null,
    scheduledAt: form.scheduledAtLocal,
    passengerCount: usesPassengerCount(form.type) ? Number(form.passengerCount || 1) : 0,
    weightKg: Number(form.weightKg || 0),
    vehicleType: form.vehicleType || null,
    cargoDescription: form.cargoDescription || null,
    marketDescription: form.marketDescription || null,
    note: form.note || null,
    status: form.status,
    paymentReceiver: form.paymentReceiver,
    finalTotal: Number(form.finalTotal),
  };
  if (!options?.omitCommission) {
    payload.commissionAmount = Number(form.commissionAmount);
  }
  return payload;
}
