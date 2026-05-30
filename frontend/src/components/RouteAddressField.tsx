import { useEffect, useMemo } from "react";
import { findDistrict } from "../data/serviceAreaAddress";
import { inputInvalidClass } from "../lib/formFieldFocus";
import { regionForPreset, routeAddressPresets, type RouteLike } from "../lib/routeAddress";
import { FieldError } from "./ui/FieldError";
import { SearchableSelect } from "./ui/SearchableSelect";

export type RouteAddressValue = {
  endpointKey: string;
  districtId: string;
  wardId: string;
  street: string;
};

type Props = {
  label: string;
  route?: RouteLike | null;
  /** Cố định đầu tuyến: đón/lấy = from, trả/giao = to */
  fixedEndpoint: "from" | "to";
  value: RouteAddressValue;
  onChange: (value: RouteAddressValue) => void;
  placeholder?: string;
  /** Tiền tố key lỗi/ref: pickup, dropoff */
  idPrefix: string;
  fieldErrors?: Record<string, string>;
  registerRef?: (key: string, el: HTMLElement | null) => void;
  onClearError?: (key: string) => void;
};

export function RouteAddressField({
  label,
  route,
  fixedEndpoint,
  value,
  onChange,
  placeholder = "Số nhà, tên đường, thôn/xóm…",
  idPrefix,
  fieldErrors = {},
  registerRef,
  onClearError,
}: Props) {
  const presets = routeAddressPresets(route);
  const preset = presets.find((p) => p.id === fixedEndpoint);

  const districtKey = `${idPrefix}District`;
  const wardKey = `${idPrefix}Ward`;
  const streetKey = `${idPrefix}Street`;

  useEffect(() => {
    if (value.endpointKey !== fixedEndpoint) {
      onChange({ ...value, endpointKey: fixedEndpoint });
    }
  }, [fixedEndpoint, value.endpointKey, value, onChange]);

  const region = useMemo(
    () => regionForPreset(route, fixedEndpoint),
    [route, fixedEndpoint]
  );
  const district = findDistrict(region, value.districtId);
  const wards = district?.wards ?? [];

  const patch = (partial: Partial<RouteAddressValue>, errorKey?: string) => {
    onChange({ ...value, endpointKey: fixedEndpoint, ...partial });
    if (errorKey) onClearError?.(errorKey);
  };

  /** Huyện chỉ có 1 (Đức Linh, Tánh Linh): tự chọn huyện, khách chọn xã + đường như Sài Gòn. */
  useEffect(() => {
    if (!region || region.districts.length !== 1) return;
    const only = region.districts[0];
    if (value.districtId !== only.id) {
      patch({ districtId: only.id, wardId: "" });
    }
  }, [region?.id, region?.districts.length, value.districtId]);

  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {preset ? (
          <span className="ml-1 normal-case text-brand-800">· {preset.label}</span>
        ) : null}
      </p>
      {presets.length > 0 && preset && region ? (
        <div className="space-y-2">
          <div>
            <SearchableSelect
              value={value.districtId}
              onChange={(districtId) => patch({ districtId, wardId: "" }, districtKey)}
              options={region.districts.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="— Chọn quận / huyện —"
              searchPlaceholder="Gõ tên quận / huyện…"
              ariaLabel="Quận / huyện"
              invalid={!!fieldErrors[districtKey]}
              describedBy={fieldErrors[districtKey] ? `${districtKey}-err` : undefined}
              registerRef={(el) => registerRef?.(districtKey, el)}
            />
            <FieldError id={`${districtKey}-err`} message={fieldErrors[districtKey]} />
          </div>

          <div>
            <SearchableSelect
              value={value.wardId}
              onChange={(wardId) => patch({ wardId }, wardKey)}
              options={wards.map((w) => ({ value: w.id, label: w.name }))}
              placeholder="— Chọn phường / xã —"
              searchPlaceholder="Gõ tên phường / xã…"
              disabled={!value.districtId}
              emptyLabel="Không tìm thấy phường / xã"
              ariaLabel="Phường / xã"
              invalid={!!fieldErrors[wardKey]}
              describedBy={fieldErrors[wardKey] ? `${wardKey}-err` : undefined}
              registerRef={(el) => registerRef?.(wardKey, el)}
            />
            <FieldError id={`${wardKey}-err`} message={fieldErrors[wardKey]} />
          </div>

          <div>
            <input
              ref={(el) => registerRef?.(streetKey, el)}
              className={`input h-12 w-full rounded-xl ${inputInvalidClass(!!fieldErrors[streetKey])}`}
              value={value.street}
              onChange={(e) => patch({ street: e.target.value }, streetKey)}
              placeholder={placeholder}
              disabled={!value.wardId}
              aria-label="Số nhà, tên đường"
              aria-invalid={!!fieldErrors[streetKey] || undefined}
              aria-describedby={fieldErrors[streetKey] ? `${streetKey}-err` : undefined}
            />
            <FieldError id={`${streetKey}-err`} message={fieldErrors[streetKey]} />
          </div>
        </div>
      ) : preset && !region ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Chưa có danh mục quận/xã cho <b>{preset.label}</b>. Vui lòng gọi hotline để được hỗ trợ địa chỉ.
        </p>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Vui lòng quay lại bước trước và chọn tuyến đường.
        </p>
      )}
    </div>
  );
}
