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
  placeholder = "— Chọn hoặc gõ tìm —",
  searchPlaceholder = "Chạm ô rồi gõ tên để lọc nhanh",
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
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  const closeWithoutPick = () => {
    setOpen(false);
    setQuery("");
  };

  const openForTyping = () => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const displayValue = open ? query : selected?.label ?? "";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="done"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          className={`input h-12 w-full touch-manipulation rounded-xl pr-10 !text-base ${inputInvalidClass(invalid)}`}
          onFocus={openForTyping}
          onClick={openForTyping}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              closeWithoutPick();
              inputRef.current?.blur();
            }
            if (e.key === "Enter" && open && filtered.length >= 1) {
              e.preventDefault();
              pick(filtered[0].value);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!rootRef.current?.contains(document.activeElement)) {
                closeWithoutPick();
              }
            }, 180);
          }}
        />
        <ChevronDown
          size={18}
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </div>

      {!disabled && (
        <p className="mt-1 text-xs text-slate-500">{searchPlaceholder}</p>
      )}

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[120] mt-1 max-h-56 w-full overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{emptyLabel}</li>
          ) : (
            filtered.map((o) => (
              <li key={o.value} role="option" aria-selected={o.value === value}>
                <button
                  type="button"
                  className={`w-full px-3 py-3 text-left text-base hover:bg-brand-50 active:bg-brand-100 ${
                    o.value === value ? "bg-brand-50 font-bold text-brand-800" : "text-ink-900"
                  }`}
                  onPointerDown={(e) => e.preventDefault()}
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
