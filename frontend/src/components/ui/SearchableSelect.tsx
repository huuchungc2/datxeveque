import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { matchVnSearch } from "../../lib/vnSearch";
import { inputInvalidClass } from "../../lib/formFieldFocus";

export type SearchableSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  ariaLabel?: string;
  invalid?: boolean;
  describedBy?: string;
  registerRef?: (el: HTMLElement | null) => void;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "— Chọn —",
  searchPlaceholder = "Gõ để tìm nhanh…",
  disabled = false,
  emptyLabel = "Không tìm thấy",
  ariaLabel,
  invalid = false,
  describedBy,
  registerRef,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((o) => matchVnSearch(o.label, query));
  }, [options, query]);

  useEffect(() => {
    registerRef?.(inputRef.current);
  }, [registerRef]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  const displayValue = open ? query : selected?.label ?? "";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          placeholder={open ? searchPlaceholder : selected ? selected.label : placeholder}
          value={displayValue}
          readOnly={!open && !!selected}
          className={`input h-12 w-full rounded-xl pr-10 ${inputInvalidClass(invalid)} ${
            !open && selected ? "cursor-pointer font-semibold text-ink-900" : ""
          }`}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery("");
          }}
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
              inputRef.current?.blur();
            }
            if (e.key === "Enter" && open && filtered.length === 1) {
              e.preventDefault();
              pick(filtered[0].value);
            }
          }}
        />
        <ChevronDown
          size={18}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{emptyLabel}</li>
          ) : (
            filtered.map((o) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  className={`w-full px-3 py-2.5 text-left text-sm hover:bg-brand-50 ${
                    o.value === value ? "bg-brand-50 font-bold text-brand-800" : "text-ink-900"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
