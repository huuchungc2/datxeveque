import { getVisiblePageNumbers } from "../../lib/paginationUi";

type Meta = { page: number; pageSize: number; total: number; totalPages: number };

export function ColumnPager({
  meta,
  disabled,
  onPage,
}: {
  meta?: Meta | null;
  disabled?: boolean;
  onPage: (page: number) => void;
}) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1 border-t border-slate-100 bg-slate-50/80 px-2 py-2" aria-label="Phân trang cột">
      <button
        type="button"
        className="btn-secondary min-h-[44px] min-w-[2.75rem] px-2 py-2 text-xs sm:min-h-0 sm:py-1"
        disabled={disabled || meta.page <= 1}
        onClick={() => onPage(meta.page - 1)}
      >
        ‹
      </button>
      {getVisiblePageNumbers(meta.page, meta.totalPages).map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-1 text-xs text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`min-h-[44px] min-w-[2.75rem] rounded-lg px-2 py-2 text-xs font-bold sm:min-h-0 sm:py-1 ${
              p === meta.page ? "bg-brand-700 text-white" : "btn-secondary"
            }`}
            disabled={disabled}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="btn-secondary min-h-[44px] min-w-[2.75rem] px-2 py-2 text-xs sm:min-h-0 sm:py-1"
        disabled={disabled || meta.page >= meta.totalPages}
        onClick={() => onPage(meta.page + 1)}
      >
        ›
      </button>
      <span className="w-full text-center text-[10px] font-medium text-slate-500">
        {meta.total} mục · trang {meta.page}/{meta.totalPages}
      </span>
    </nav>
  );
}
