import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

function clampValue(n: number, min: number, max?: number) {
  if (!Number.isFinite(n)) return min;
  const rounded = Math.max(min, Math.round(n));
  return max != null ? Math.min(max, rounded) : rounded;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  id,
  "aria-label": ariaLabel = "Số lượng",
  className = "",
}: Props) {
  const safe = clampValue(value, min, max);

  const set = (next: number) => onChange(clampValue(next, min, max));

  return (
    <div
      className={`inline-flex h-12 max-w-full items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <button
        type="button"
        aria-label="Giảm số lượng"
        disabled={safe <= min}
        onClick={() => set(safe - 1)}
        className="grid w-12 shrink-0 place-items-center text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={18} strokeWidth={2.5} />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        {...(max != null ? { max } : {})}
        step={1}
        aria-label={ariaLabel}
        value={safe}
        onChange={(e) => {
          const n = e.target.value === "" ? min : Number(e.target.value);
          set(n);
        }}
        onBlur={() => {
          if (value !== safe) onChange(safe);
        }}
        className="w-16 min-w-0 flex-1 border-x border-slate-200 bg-white px-1 text-center text-base font-extrabold text-ink-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Tăng số lượng"
        disabled={max != null && safe >= max}
        onClick={() => set(safe + 1)}
        className="grid w-12 shrink-0 place-items-center text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
