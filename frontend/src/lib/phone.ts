export const PHONE_INVALID_MESSAGE = "Số điện thoại phải đủ 10 chữ số, bắt đầu bằng 0 (ví dụ 0901234567)";

const VN_PHONE_RE = /^0\d{9}$/;

export function sanitizePhoneInput(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) digits = `0${digits.slice(2)}`;
  if (digits.length > 10) digits = digits.slice(0, 10);
  return digits;
}

export function normalizeVnPhone(raw: string): string | null {
  const phone = sanitizePhoneInput(raw);
  return VN_PHONE_RE.test(phone) ? phone : null;
}

export const phoneInputProps = {
  type: "tel" as const,
  inputMode: "numeric" as const,
  autoComplete: "tel" as const,
  maxLength: 10,
  placeholder: "0901234567",
  pattern: "0[0-9]{9}",
  title: PHONE_INVALID_MESSAGE,
};
