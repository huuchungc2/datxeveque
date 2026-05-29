import { specialtyServicePages } from "./serviceRoutes";

export type ServiceNavItem = {
  readonly path: string;
  readonly type: string;
  readonly title: string;
  readonly menuLabel: string;
};

/** Hành khách: xe ghép, bao xe, thuê xe hợp đồng */
export const passengerBookableServices = [
  { path: "/dat-xe", type: "SHARED_RIDE", title: "Đặt xe ghép về quê", menuLabel: "Xe ghép" },
  { path: "/bao-xe", type: "PRIVATE_RIDE", title: "Bao xe về quê", menuLabel: "Bao xe" },
  { path: "/thue-xe-hop-dong", type: "CONTRACT", title: "Thuê xe hợp đồng", menuLabel: "Xe hợp đồng" },
] as const satisfies readonly ServiceNavItem[];

/** Hàng hóa: gửi hàng, đi chợ quê */
export const cargoBookableServices = [
  { path: "/gui-hang", type: "CARGO", title: "Gửi hàng về quê", menuLabel: "Gửi hàng" },
  { path: "/di-cho-que", type: "MARKET", title: "Đi chợ quê giùm", menuLabel: "Đi chợ quê" },
] as const satisfies readonly ServiceNavItem[];

/** Tất cả form đặt trực tiếp trên web (route + booking) */
export const coreBookableServices = [
  ...passengerBookableServices,
  ...cargoBookableServices,
] as const;

/** Menu Hành khách: về quê + thuê xe đặc biệt */
export const passengerNavServices: readonly ServiceNavItem[] = [
  ...passengerBookableServices,
  ...specialtyServicePages,
];

/** Menu Hàng hóa */
export const cargoNavServices: readonly ServiceNavItem[] = [...cargoBookableServices];

export const allBookingServiceOptions = [
  ...coreBookableServices.map((s) => ({ value: s.type, label: s.menuLabel })),
  ...specialtyServicePages.map((s) => ({ value: s.type, label: s.menuLabel })),
];

/** Dịch vụ về quê: cần chọn tuyến mới tính giá tạm tính chuẩn */
export const ROUTE_REQUIRED_SERVICE_TYPES = new Set([
  "SHARED_RIDE",
  "PRIVATE_RIDE",
  "CARGO",
  "MARKET",
]);

/** Mọi mục menu → route đặt xe (về quê + hợp đồng/đặc biệt). */
export const allNavServices: readonly ServiceNavItem[] = [
  ...coreBookableServices,
  ...specialtyServicePages,
];

export function findServiceByPath(pathname: string): ServiceNavItem | undefined {
  const path = pathname.replace(/\/+$/, "") || "/";
  return allNavServices.find((s) => s.path === path);
}

export function pathForServiceType(type: string): string {
  return allNavServices.find((s) => s.type === type)?.path ?? "/dat-xe";
}
