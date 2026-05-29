/**
 * Nhãn tiếng Việt cho mã enum / khóa kỹ thuật — dùng thống nhất toàn UI.
 * Không hiển thị trực tiếp PENDING, SHARED_RIDE, … cho người dùng; dùng bookingStatus() v.v.
 * Gợi ý điều phối (orderTypeLabel) map ở backend dispatchSuggestions TYPE_LABELS.
 * Xem thêm: frontend/GHI_CHU_LOGIC.md
 */

export function viLabel(map: Record<string, string>, key?: string | null, fallback = "—"): string {
  if (!key) return fallback;
  return map[key] ?? fallback;
}

export const BOOKING_STATUS_VI: Record<string, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  QUOTED: "Đã báo giá",
  WAITING_DEPOSIT: "Chờ cọc",
  DEPOSITED: "Đã cọc",
  WAITING_DISPATCH: "Chờ điều phối",
  ASSIGNED: "Đã gán chuyến",
  DRIVER_ACCEPTED: "Tài xế đã nhận",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Khách không đi",
};

export const TRIP_STATUS_VI: Record<string, string> = {
  COLLECTING: "Đang gom khách",
  READY: "Sẵn sàng chạy",
  IN_PROGRESS: "Đang chạy",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const SETTLEMENT_STATUS_VI: Record<string, string> = {
  PENDING: "Chờ đối soát",
  PARTIAL: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  RECONCILED: "Đã đối soát",
  WAIVED: "Đã miễn",
  DISPUTED: "Đang tranh chấp",
};

export const USER_ROLE_VI: Record<string, string> = {
  ADMIN: "Quản trị",
  DISPATCHER: "Điều phối",
  ACCOUNTANT: "Kế toán",
  DRIVER: "Tài xế",
  CUSTOMER: "Khách hàng",
};

export const USER_STATUS_VI: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
};

export const PAYMENT_RECEIVER_VI: Record<string, string> = {
  DRIVER: "Khách trả tài xế",
  ADMIN: "Khách trả văn phòng",
};

export const DRIVER_RIDE_STATUS_VI: Record<string, string> = {
  WAITING_PICKUP: "Chờ đón",
  PICKING_UP: "Đang đón",
  PICKED_UP: "Đã đón",
  DROPPING_OFF: "Đang trả",
  DROPPED_OFF: "Đã trả",
  CUSTOMER_CANCELLED: "Khách hủy",
  UNREACHABLE: "Không liên lạc được",
  NO_SHOW: "Khách không ra",
  WAITING_ADMIN_REVIEW: "Chờ admin xử lý",
  WAITING_REDISPATCH: "Chờ điều phối lại",
  CANCELLED_BY_ADMIN: "Admin đã hủy",
};

export const DRIVER_CARGO_STATUS_VI: Record<string, string> = {
  WAITING_PICKUP: "Chờ lấy hàng",
  PICKING_UP: "Đang lấy hàng",
  PICKED_UP: "Đã lấy hàng",
  DELIVERING: "Đang giao hàng",
  DELIVERED: "Đã giao",
  FAILED_PICKUP: "Không lấy được",
  FAILED_DELIVERY: "Không giao được",
  PARCEL_CANCELLED: "Hàng hủy",
  WAITING_ADMIN_REVIEW: "Chờ admin xử lý",
};

/** Kết quả xác nhận đơn (admin) — SPEC §2.2 */
export const BOOKING_CONFIRM_OUTCOME_VI: Record<string, string> = {
  CONFIRMED: "Đã xác nhận",
  NO_CONTACT: "Không liên hệ được",
  CUSTOMER_CANCEL: "Khách hủy",
  WRONG_INFO: "Sai thông tin",
};

export const BOOKING_PAYMENT_STATUS_VI: Record<string, string> = {
  UNPAID: "Chưa thu",
  CASH_COLLECTED: "Đã thu tiền mặt",
  TRANSFERRED: "Khách đã chuyển khoản",
  ADMIN_COLLECTED: "Văn phòng đã thu",
  WAIVED: "Miễn thu",
};

export const POST_STATUS_VI: Record<string, string> = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã xuất bản",
};

export const PRICING_TYPE_VI: Record<string, string> = {
  PER_PERSON: "Theo người",
  PER_TRIP: "Theo chuyến",
  PER_KG: "Theo kg",
};

export const COMMISSION_TYPE_VI: Record<string, string> = {
  FIXED: "Cố định (VNĐ)",
  PERCENT: "Phần trăm (%)",
};

export const MEDIA_USAGE_VI: Record<string, string> = {
  general: "Ảnh chung",
  hero: "Ảnh banner",
  service: "Ảnh dịch vụ",
};

export const SETTING_KEY_VI: Record<string, string> = {
  brand_name: "Tên thương hiệu",
  slogan: "Khẩu hiệu",
  hotline_primary: "Hotline chính",
  zalo_url: "Link Zalo",
  zalo_phone: "Số Zalo",
  facebook_page_url: "Link Facebook",
  email: "Email",
  service_area: "Khu vực phục vụ",
  business_address: "Địa chỉ",
  working_hours: "Giờ làm việc",
};

/** Trạng thái đơn giản cho khách (spec module khách hàng §5) */
export const CUSTOMER_BOOKING_STATUS_VI: Record<string, string> = {
  NEW: "Chờ xác nhận",
  CONTACTED: "Đã xác nhận",
  QUOTED: "Đã xác nhận",
  WAITING_DEPOSIT: "Đã xác nhận",
  DEPOSITED: "Đã xác nhận",
  WAITING_DISPATCH: "Đang xử lý",
  ASSIGNED: "Đã có tài xế",
  DRIVER_ACCEPTED: "Đã có tài xế",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  CANCELLED_BY_ADMIN: "Đã hủy",
  NO_SHOW: "Đã hủy",
  WAITING_ADMIN_REVIEW: "Đang xử lý",
  WAITING_REDISPATCH: "Đang xử lý",
};

export const CUSTOMER_BOOKING_TYPE_VI: Record<string, string> = {
  SHARED_RIDE: "Chở khách",
  PRIVATE_RIDE: "Chở khách",
  CONTRACT: "Chở khách",
  WEDDING: "Chở khách",
  TOUR: "Chở khách",
  HOSPITAL: "Chở khách",
  AIRPORT: "Chở khách",
  CARGO: "Gửi hàng",
  MARKET: "Đi chợ quê",
};

export function customerBookingTypeLabel(type?: string | null, hasAccompanyingCargo?: boolean) {
  if (hasAccompanyingCargo && type && usesPassengerCountType(type)) return "Khách + hàng";
  return viLabel(CUSTOMER_BOOKING_TYPE_VI, type, type || "—");
}

function usesPassengerCountType(type: string) {
  return type !== "CARGO" && type !== "MARKET";
}

export const customerBookingStatus = (s?: string | null) =>
  viLabel(CUSTOMER_BOOKING_STATUS_VI, s, viLabel(BOOKING_STATUS_VI, s, s || "—"));

export const bookingStatus = (s?: string | null) => viLabel(BOOKING_STATUS_VI, s, s || "—");
export const tripStatus = (s?: string | null) => viLabel(TRIP_STATUS_VI, s, s || "—");
export const settlementStatus = (s?: string | null) => viLabel(SETTLEMENT_STATUS_VI, s, s || "—");
export const userRole = (s?: string | null) => viLabel(USER_ROLE_VI, s, s || "—");
export const userStatus = (s?: string | null) => viLabel(USER_STATUS_VI, s, s || "—");
export const paymentReceiver = (s?: string | null) => viLabel(PAYMENT_RECEIVER_VI, s, s || "—");
export const driverRideStatus = (s?: string | null) => viLabel(DRIVER_RIDE_STATUS_VI, s, s || "—");
export const driverCargoStatus = (s?: string | null) => viLabel(DRIVER_CARGO_STATUS_VI, s, s || "—");
export const bookingPaymentStatus = (s?: string | null) => viLabel(BOOKING_PAYMENT_STATUS_VI, s, s || "—");
export const bookingConfirmOutcome = (s?: string | null) => viLabel(BOOKING_CONFIRM_OUTCOME_VI, s, s || "—");
export const postStatus = (s?: string | null) => viLabel(POST_STATUS_VI, s, s || "—");
export const pricingType = (s?: string | null) => viLabel(PRICING_TYPE_VI, s, s || "—");
export const commissionType = (s?: string | null) => viLabel(COMMISSION_TYPE_VI, s, s || "—");
export const mediaUsage = (s?: string | null) => viLabel(MEDIA_USAGE_VI, s, s || "—");
export const settingKey = (s?: string | null) => viLabel(SETTING_KEY_VI, s, s || s || "—");
