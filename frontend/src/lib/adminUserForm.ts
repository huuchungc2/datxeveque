import type { RunDirection } from "./runDirection";

export const USER_FORM_ROLES = ["ADMIN", "DISPATCHER", "ACCOUNTANT", "DRIVER", "CUSTOMER"] as const;

export const DRIVER_STATUS_OPTIONS = ["Rảnh", "Bận", "Đang chạy chuyến", "Nghỉ hôm nay"];

export const emptyUserForm = () => ({
  name: "",
  phone: "",
  email: "",
  password: "",
  role: "DISPATCHER" as string,
  status: "ACTIVE",
  zaloPhone: "",
  driverStatus: "Rảnh",
  runDirection: "" as "" | RunDirection,
  location: "",
  direction: "",
  seatsFree: 0,
  note: "",
  vehicleType: "",
  licensePlate: "",
  vehicleSeats: 7,
});

export function userToForm(u: any) {
  const base = emptyUserForm();
  return {
    ...base,
    id: u.id,
    name: u.name ?? "",
    phone: u.phone ?? "",
    email: u.email ?? "",
    password: "",
    role: u.role ?? base.role,
    status: u.status ?? base.status,
    zaloPhone: u.driver?.zaloPhone ?? u.customer?.zaloPhone ?? "",
    driverStatus: u.driver?.status ?? base.driverStatus,
    runDirection: (
      u.driver?.runDirection === "SG_TO_PROVINCE" || u.driver?.runDirection === "PROVINCE_TO_SG"
        ? u.driver.runDirection
        : ""
    ) as "" | RunDirection,
    location: u.driver?.location ?? "",
    direction: u.driver?.direction ?? "",
    seatsFree: Number(u.driver?.seatsFree ?? 0),
    note: u.driver?.note ?? u.customer?.note ?? "",
    vehicleType: u.driver?.vehicles?.[0]?.vehicleType ?? "",
    licensePlate: u.driver?.vehicles?.[0]?.licensePlate ?? "",
    vehicleSeats: Number(u.driver?.vehicles?.[0]?.seats ?? 7),
  };
}
