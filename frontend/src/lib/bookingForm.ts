/** Phân loại form đặt xe công khai. */

export function isGoodsLikeService(type?: string | null): boolean {
  return type === "CARGO" || type === "MARKET";
}
