import { useMemo, type Dispatch, type SetStateAction } from "react";
import { MapPin } from "lucide-react";
import type { AdminBookingFormState } from "../lib/adminBookingForm";
import { inputInvalidClass } from "../lib/formFieldFocus";
import {
  routeAddressPresets,
  ROUTE_ENDPOINT_DROPOFF,
  ROUTE_ENDPOINT_PICKUP,
  type RouteLike,
} from "../lib/routeAddress";
import { RouteAddressField, type RouteAddressValue } from "./RouteAddressField";
import { FieldError } from "./ui/FieldError";

type Props = {
  form: AdminBookingFormState;
  setForm: Dispatch<SetStateAction<AdminBookingFormState>>;
  selectedRoute?: RouteLike | null;
  isGoods: boolean;
  fieldErrors: Record<string, string>;
  onClearError: (key: string) => void;
  needsRoute: boolean;
};

export function AdminBookingAddressFields({
  form,
  setForm,
  selectedRoute,
  isGoods,
  fieldErrors,
  onClearError,
  needsRoute,
}: Props) {
  const hasPresets = selectedRoute && routeAddressPresets(selectedRoute).length > 0;

  const pickupValue: RouteAddressValue = useMemo(
    () => ({
      endpointKey: form.pickupEndpointKey || ROUTE_ENDPOINT_PICKUP,
      districtId: form.pickupDistrictId,
      wardId: form.pickupWardId,
      street: form.pickupStreet,
    }),
    [form.pickupEndpointKey, form.pickupDistrictId, form.pickupWardId, form.pickupStreet]
  );

  const dropoffValue: RouteAddressValue = useMemo(
    () => ({
      endpointKey: form.dropoffEndpointKey || ROUTE_ENDPOINT_DROPOFF,
      districtId: form.dropoffDistrictId,
      wardId: form.dropoffWardId,
      street: form.dropoffStreet,
    }),
    [form.dropoffEndpointKey, form.dropoffDistrictId, form.dropoffWardId, form.dropoffStreet]
  );

  if (needsRoute && !selectedRoute) {
    return (
      <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Chọn tuyến để nhập địa chỉ đón/trả (hoặc lấy/giao hàng) theo khu vực phục vụ.
      </p>
    );
  }

  if (hasPresets) {
    return (
      <>
        <div className="sm:col-span-2">
          <RouteAddressField
            idPrefix="pickup"
            fixedEndpoint={ROUTE_ENDPOINT_PICKUP}
            label={isGoods ? "Điểm lấy hàng" : "Địa chỉ đón"}
            route={selectedRoute}
            value={pickupValue}
            fieldErrors={fieldErrors}
            onClearError={onClearError}
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
        </div>
        <div className="sm:col-span-2">
          <RouteAddressField
            idPrefix="dropoff"
            fixedEndpoint={ROUTE_ENDPOINT_DROPOFF}
            label={isGoods ? "Điểm giao hàng" : "Địa điểm đến"}
            route={selectedRoute}
            value={dropoffValue}
            fieldErrors={fieldErrors}
            onClearError={onClearError}
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
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sm:col-span-2">
        <label className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          <MapPin size={14} className="text-emerald-600" />
          {isGoods ? "Điểm lấy hàng" : "Địa chỉ đón"}
        </label>
        <input
          className={`input h-12 w-full ${inputInvalidClass(!!fieldErrors.pickupStreetPlain)}`}
          value={form.pickupStreet}
          onChange={(e) => {
            onClearError("pickupStreetPlain");
            setForm({ ...form, pickupStreet: e.target.value });
          }}
        />
        <FieldError id="pickupStreetPlain-err" message={fieldErrors.pickupStreetPlain} />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          <MapPin size={14} className="text-orange-600" />
          {isGoods ? "Điểm giao hàng" : "Địa chỉ trả"}
        </label>
        <input
          className={`input h-12 w-full ${inputInvalidClass(!!fieldErrors.dropoffStreetPlain)}`}
          value={form.dropoffStreet}
          onChange={(e) => {
            onClearError("dropoffStreetPlain");
            setForm({ ...form, dropoffStreet: e.target.value });
          }}
        />
        <FieldError id="dropoffStreetPlain-err" message={fieldErrors.dropoffStreetPlain} />
      </div>
    </>
  );
}
