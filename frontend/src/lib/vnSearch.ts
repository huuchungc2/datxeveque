/** Chuẩn hóa chuỗi tiếng Việt để lọc/tìm không phân biệt dấu. */
export function normVnSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchVnSearch(text: string, query: string): boolean {
  const q = normVnSearch(query);
  if (!q) return true;
  return normVnSearch(text).includes(q);
}
