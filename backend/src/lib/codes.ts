/** Bỏ 0/O/1/I để đọc và đọc to qua điện thoại dễ hơn */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomPart(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

/** Mã dạng DX-260525-A3K9 (đơn) hoặc CX-260525-7F2M (chuyến) — ngày + 4 ký tự ngẫu nhiên */
export function generateCode(prefix: string) {
  const d = new Date();
  const yymmdd = [
    String(d.getFullYear()).slice(-2),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
  return `${prefix}-${yymmdd}-${randomPart(4)}`;
}
