export function toNumberOrUndefined(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parsePageQuery(query: Record<string, unknown>, defaults?: { page?: number; limit?: number }) {
  const page = Math.max(1, toNumberOrUndefined(query.page) ?? defaults?.page ?? 1);
  const limitRaw = toNumberOrUndefined(query.limit) ?? toNumberOrUndefined(query.pageSize) ?? defaults?.limit ?? 20;
  const limit = Math.min(100, Math.max(5, limitRaw));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
