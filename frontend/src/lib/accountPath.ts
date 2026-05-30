const ADMIN_ROLES = ["ADMIN", "DISPATCHER", "ACCOUNTANT"];

export function isAdminStaff(role: string) {
  return ADMIN_ROLES.includes(role);
}

export function dashboardPath(role: string) {
  if (role === "DRIVER") return "/tai-xe/chuyen";
  if (role === "CUSTOMER") return "/khach";
  if (isAdminStaff(role)) return "/admin";
  return "/";
}

export function accountPath(role: string) {
  if (role === "DRIVER") return "/tai-xe/tai-khoan";
  if (role === "CUSTOMER") return "/khach/tai-khoan";
  if (isAdminStaff(role)) return "/admin/tai-khoan";
  return "/dang-nhap";
}
