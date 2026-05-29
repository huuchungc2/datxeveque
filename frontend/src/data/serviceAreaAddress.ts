/**
 * Danh mục quận/huyện → phường/xã phục vụ đặt xe (Sài Gòn, Đức Linh, Tánh Linh).
 * Khớp tên đầu tuyến `from_name` / `to_name` trong DB.
 */

export type AreaWard = { id: string; name: string };
export type AreaDistrict = { id: string; name: string; wards: AreaWard[] };
export type AreaRegion = {
  id: string;
  label: string;
  /** Quận/huyện */
  districts: AreaDistrict[];
};

const wards = (...names: string[]): AreaWard[] =>
  names.map((name) => ({ id: name.toLowerCase().replace(/\s+/g, "-"), name }));

/** TP.HCM — các quận thường đón/trả khách tuyến về quê (có thể bổ sung thêm). */
const HCM_DISTRICTS: AreaDistrict[] = [
  { id: "binh-tan", name: "Quận Bình Tân", wards: wards("An Lạc", "Bình Trị Đông", "Bình Trị Đông B", "Tân Tạo", "Vĩnh Lộc", "An Lạc A") },
  { id: "tan-binh", name: "Quận Tân Bình", wards: wards("Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7") },
  { id: "tan-phu", name: "Quận Tân Phú", wards: wards("Tân Sơn Nhì", "Tây Thạnh", "Sơn Kỳ", "Tân Quý", "Phú Thạnh", "Phú Trung", "Hiệp Tân", "Tân Thành") },
  { id: "go-vap", name: "Quận Gò Vấp", wards: wards("Phường 1", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7", "Phường 11", "Phường 12") },
  { id: "quan-12", name: "Quận 12", wards: wards("Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Thạnh Xuân", "Thới An", "Hiệp Thành") },
  { id: "quan-6", name: "Quận 6", wards: wards("Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7") },
  { id: "quan-8", name: "Quận 8", wards: wards("Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7") },
  { id: "binh-thanh", name: "Quận Bình Thạnh", wards: wards("Phường 1", "Phường 2", "Phường 3", "Phường 5", "Phường 6", "Phường 7", "Phường 11", "Phường 12") },
  { id: "phu-nhuan", name: "Quận Phú Nhuận", wards: wards("Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 7", "Phường 8") },
  { id: "quan-3", name: "Quận 3", wards: wards("Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7") },
  { id: "quan-10", name: "Quận 10", wards: wards("Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7") },
  { id: "quan-11", name: "Quận 11", wards: wards("Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường 6", "Phường 7") },
  { id: "hoc-mon", name: "Huyện Hóc Môn", wards: wards("Hóc Môn", "Tân Hiệp", "Tân Thới Nhì", "Tân Xuân", "Trung Chánh", "Xuân Thới Sơn") },
  { id: "binh-chanh", name: "Huyện Bình Chánh", wards: wards("An Phú Tây", "Bình Hưng", "Bình Lợi", "Phạm Văn Hai", "Tân Nhựt", "Vĩnh Lộc A", "Vĩnh Lộc B") },
  { id: "nha-be", name: "Huyện Nhà Bè", wards: wards("Hiệp Phước", "Nhà Bè", "Phú Xuân", "Phước Kiển", "Phước Lộc") },
  { id: "thu-duc", name: "TP. Thủ Đức", wards: wards("Linh Chiểu", "Linh Đông", "Linh Tây", "Linh Trung", "Linh Xuân", "Hiệp Bình Chánh", "Hiệp Bình Phước", "Tam Bình") },
];

const DUC_LINH_WARDS = wards(
  "Thị trấn Đức Linh",
  "Võ Xu",
  "Mỹ Thanh",
  "Bình Hà",
  "Đa Kai",
  "Đông Hà",
  "Đức Tài",
  "Đức Thuận",
  "La Ngâu",
  "Nghĩa Điền",
  "Nghĩa Hòa",
  "Nghĩa Hưng",
  "Nghĩa Phước",
  "Nghĩa Thành",
  "Nghĩa Trung",
  "Sùng Nhơn",
  "Tân Hà",
  "Tân Nghĩa",
  "Tân Thắng",
  "Thái Nghiệp",
  "Vũ Hoà",
  "Đuối Đa"
);

const TANH_LINH_WARDS = wards(
  "Thị trấn Tánh Linh",
  "Bắc Ruộng",
  "Đồng Kho",
  "Gia Huynh",
  "Hàm Liêm",
  "Hàm Thắng",
  "Hàm Thuận",
  "Lạc Tánh",
  "Lạc Tánh 1",
  "Lạc Tánh 2",
  "Minh Hải",
  "Nghĩa Bình",
  "Nghĩa Hành",
  "Nghĩa Hòa",
  "Nghĩa Thuận",
  "Phú Lạc",
  "Phước Hội",
  "Phước Tân",
  "Phước Thiện",
  "Tân Hưng",
  "Tân Phước",
  "Tân Thành",
  "Thanh An",
  "Trí Hải"
);

export const SERVICE_AREA_REGIONS: AreaRegion[] = [
  { id: "hcm", label: "Sài Gòn (TP.HCM)", districts: HCM_DISTRICTS },
  {
    id: "duc-linh",
    label: "Đức Linh (Bình Thuận)",
    districts: [{ id: "huyen-duc-linh", name: "Huyện Đức Linh", wards: DUC_LINH_WARDS }],
  },
  {
    id: "tanh-linh",
    label: "Tánh Linh (Bình Thuận)",
    districts: [{ id: "huyen-tanh-linh", name: "Huyện Tánh Linh", wards: TANH_LINH_WARDS }],
  },
];

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ánh xạ tên đầu tuyến (from_name / to_name) → vùng địa chỉ. */
export function regionForRouteEndpoint(endpointName?: string | null): AreaRegion | null {
  const t = norm(endpointName || "");
  if (!t) return null;
  if (/sai gon|ho chi minh|hcm|tp\.?hcm/.test(t)) return SERVICE_AREA_REGIONS.find((r) => r.id === "hcm") ?? null;
  if (/tanh linh/.test(t)) return SERVICE_AREA_REGIONS.find((r) => r.id === "tanh-linh") ?? null;
  if (/duc linh|binh thuan/.test(t)) return SERVICE_AREA_REGIONS.find((r) => r.id === "duc-linh") ?? null;
  return null;
}

export function findDistrict(region: AreaRegion | null, districtId: string): AreaDistrict | null {
  if (!region || !districtId) return null;
  return region.districts.find((d) => d.id === districtId) ?? null;
}

export function findWard(district: AreaDistrict | null, wardId: string): AreaWard | null {
  if (!district || !wardId) return null;
  return district.wards.find((w) => w.id === wardId) ?? null;
}

export function composeServiceAreaAddress(parts: {
  regionLabel: string;
  districtName: string;
  wardName: string;
  street: string;
}): string {
  const street = parts.street.trim();
  const base = [parts.regionLabel, parts.districtName, parts.wardName].filter(Boolean).join(", ");
  if (!street) return base;
  if (!base) return street;
  return `${base} — ${street}`;
}
