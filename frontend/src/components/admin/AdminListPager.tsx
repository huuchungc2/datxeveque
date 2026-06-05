import { getVisiblePageNumbers } from "../../lib/paginationUi";

type Props = {
  page: number;
  totalPages: number;
  loading?: boolean;
  onPage: (page: number) => void;
};

export function AdminListPager({ page, totalPages, loading, onPage }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Phân trang">
      <button type="button" className="btn-secondary min-w-[2.5rem] px-3 py-2 text-sm" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)}>
        ‹
      </button>
      {getVisiblePageNumbers(page, totalPages).map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-2 text-sm text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`min-w-[2.5rem] rounded-xl px-3 py-2 text-sm font-bold transition ${p === page ? "bg-brand-700 text-white shadow-sm" : "btn-secondary"}`}
            disabled={loading}
            onClick={() => onPage(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="btn-secondary min-w-[2.5rem] px-3 py-2 text-sm"
        disabled={page >= totalPages || loading}
        onClick={() => onPage(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}
