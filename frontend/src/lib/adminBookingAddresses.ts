import {
  buildStructuredRouteAddress,
  parseServiceAreaAddress,
  routeAddressPresets,
  ROUTE_ENDPOINT_DROPOFF,
  ROUTE_ENDPOINT_PICKUP,
  type RouteLike,
} from "./routeAddress";
import type { AdminBookingFormState } from "./adminBookingForm";

export const ADMIN_CAN_CONFIRM_STATUSES = new Set([
  "NEW",
  "CONTACTED",
  "QUOTED",
  "WAITING_DEPOSIT",
  "DEPOSITED",
]);

export function canAdminConfirmBooking(status?: string | null) {
  return !!status && ADMIN_CAN_CONFIRM_STATUSES.has(status);
}

export function isAdminBookingConfirmed(status?: string | null) {
  return (
    !!status &&
    !["NEW", "CONTACTED", "QUOTED", "WAITING_DEPOSIT", "DEPOSITED", "CANCELLED", "NO_SHOW"].includes(status)
  );
}

/** Điền quận/xã/đường từ địa chỉ đã lưu khi mở chi tiết đơn. */
export function hydrateAdminBookingAddresses(
  form: AdminBookingFormState,
  route?: RouteLike | null,
  booking?: { pickupAddress?: string | null; dropoffAddress?: string | null }
): AdminBookingFormState {
  const pickup = (booking?.pickupAddress ?? form.pickupAddress) || "";
  const dropoff = (booking?.dropoffAddress ?? form.dropoffAddress) || "";
  const presets = routeAddressPresets(route);

  if (!presets.length) {
    return {
      ...form,
      pickupAddress: pickup,
      dropoffAddress: dropoff,
      pickupStreet: pickup,
      dropoffStreet: dropoff,
    };
  }

  const parsedPickup = parseServiceAreaAddress(pickup, route, ROUTE_ENDPOINT_PICKUP);
  const parsedDropoff = parseServiceAreaAddress(dropoff, route, ROUTE_ENDPOINT_DROPOFF);

  return {
    ...form,
    pickupAddress: pickup,
    dropoffAddress: dropoff,
    pickupEndpointKey: ROUTE_ENDPOINT_PICKUP,
    dropoffEndpointKey: ROUTE_ENDPOINT_DROPOFF,
    pickupDistrictId: parsedPickup.districtId,
    pickupWardId: parsedPickup.wardId,
    pickupStreet: parsedPickup.street || pickup,
    dropoffDistrictId: parsedDropoff.districtId,
    dropoffWardId: parsedDropoff.wardId,
    dropoffStreet: parsedDropoff.street || dropoff,
  };
}

export function emptyAdminAddressFields() {
  return {
    pickupEndpointKey: ROUTE_ENDPOINT_PICKUP,
    pickupDistrictId: "",
    pickupWardId: "",
    pickupStreet: "",
    dropoffEndpointKey: ROUTE_ENDPOINT_DROPOFF,
    dropoffDistrictId: "",
    dropoffWardId: "",
    dropoffStreet: "",
  };
}

export function composeAdminBookingAddresses(
  form: AdminBookingFormState,
  route?: RouteLike | null
): { pickupAddress: string; dropoffAddress: string } {
  const presets = routeAddressPresets(route);
  if (!presets.length) {
    return {
      pickupAddress: form.pickupStreet.trim(),
      dropoffAddress: form.dropoffStreet.trim(),
    };
  }
  return {
    pickupAddress: buildStructuredRouteAddress(
      route,
      ROUTE_ENDPOINT_PICKUP,
      form.pickupDistrictId,
      form.pickupWardId,
      form.pickupStreet
    ),
    dropoffAddress: buildStructuredRouteAddress(
      route,
      ROUTE_ENDPOINT_DROPOFF,
      form.dropoffDistrictId,
      form.dropoffWardId,
      form.dropoffStreet
    ),
  };
}

/** Validate địa chỉ — cùng quy tắc BookingPage bước 2. */
export function validateAdminBookingAddresses(
  form: AdminBookingFormState,
  route?: RouteLike | null,
  isGoods = false
): Record<string, string> {
  const errors: Record<string, string> = {};
  const composed = composeAdminBookingAddresses(form, route);
  const presets = routeAddressPresets(route);

  if (presets.length > 0) {
    if (!form.pickupDistrictId) {
      errors.pickupDistrict = isGoods
        ? "Vui lòng chọn quận / huyện lấy hàng."
        : "Vui lòng chọn quận / huyện đón.";
    }
    if (!form.pickupWardId) {
      errors.pickupWard = isGoods
        ? "Vui lòng chọn phường / xã lấy hàng."
        : "Vui lòng chọn phường / xã đón.";
    }
    if (!form.pickupStreet.trim()) {
      errors.pickupStreet = "Vui lòng nhập số nhà, tên đường tại điểm đón/lấy.";
    }
    if (!form.dropoffDistrictId) {
      errors.dropoffDistrict = isGoods
        ? "Vui lòng chọn quận / huyện giao hàng."
        : "Vui lòng chọn quận / huyện trả.";
    }
    if (!form.dropoffWardId) {
      errors.dropoffWard = isGoods
        ? "Vui lòng chọn phường / xã giao hàng."
        : "Vui lòng chọn phường / xã trả.";
    }
    if (!form.dropoffStreet.trim()) {
      errors.dropoffStreet = "Vui lòng nhập số nhà, tên đường tại điểm trả/giao.";
    }
  } else {
    if (!composed.pickupAddress.trim()) {
      errors.pickupStreetPlain = isGoods ? "Vui lòng nhập điểm lấy hàng." : "Vui lòng nhập địa chỉ đón.";
    }
    if (!composed.dropoffAddress.trim()) {
      errors.dropoffStreetPlain = isGoods ? "Vui lòng nhập điểm giao hàng." : "Vui lòng nhập địa chỉ trả.";
    }
  }
  return errors;
}

export function canAdminCancelBooking(status?: string | null) {
  return status !== "CANCELLED" && status !== "COMPLETED" && status !== "NO_SHOW";
}

export async function cancelAdminBooking(
  id: number,
  apiPost: (url: string, body?: object) => Promise<{ data?: { message?: string } }>
): Promise<boolean> {
  const reason = prompt("Lý do hủy đơn (tuỳ chọn):");
  if (reason === null) return false;
  if (!confirm("Hủy đơn này? Trạng thái sẽ chuyển sang «Đã hủy».")) return false;
  try {
    const r = await apiPost(`/admin/bookings/${id}/cancel`, {
      reason: reason.trim() || undefined,
    });
    alert(r.data?.message || "Đã hủy đơn");
    return true;
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } };
    alert(err.response?.data?.message || "Không hủy được đơn");
    return false;
  }
}
