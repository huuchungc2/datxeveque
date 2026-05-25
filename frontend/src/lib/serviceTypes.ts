/** Loại dịch vụ / đơn — khớp enum BookingType (Prisma). */
export const SERVICE_TYPE_OPTIONS = [
  { value: "SHARED_RIDE", label: "Xe ghép" },
  { value: "PRIVATE_RIDE", label: "Bao xe" },
  { value: "CARGO", label: "Gửi hàng" },
  { value: "MARKET", label: "Đi chợ quê" },
  { value: "CONTRACT", label: "Xe hợp đồng" },
  { value: "WEDDING", label: "Xe đám cưới" },
  { value: "TOUR", label: "Xe tham quan" },
  { value: "HOSPITAL", label: "Xe bệnh viện" },
  { value: "AIRPORT", label: "Xe sân bay" },
] as const;

export const serviceTypeLabel: Record<string, string> = Object.fromEntries(
  SERVICE_TYPE_OPTIONS.map((o) => [o.value, o.label])
);
