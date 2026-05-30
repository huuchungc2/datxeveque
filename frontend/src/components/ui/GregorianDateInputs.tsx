import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  minBookingDepartureParts,
  nowDepartureParts,
  parseLocalDateTimeParts,
  suggestedBookingDepartureHint,
} from "../../lib/datetime";

const pad = (n: number) => String(n).padStart(2, "0");
const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

type DateParts = { year: number; month: number; day: number };
type DateTimeParts = DateParts & { hour: number; minute: number };

function todayParts(): DateParts {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function parseDateValue(value?: string): DateParts | null {
  const p = parseLocalDateTimeParts(value);
  if (!p) return null;
  return { year: p.year, month: p.month, day: p.day };
}

function parseDateTimeValue(value?: string): DateTimeParts | null {
  const p = parseLocalDateTimeParts(value);
  if (!p) return null;
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function clampDay(parts: DateParts) {
  return Math.min(parts.day, daysInMonth(parts.year, parts.month));
}

function toDateValue(parts: DateParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(clampDay(parts))}`;
}

function toDateTimeValue(parts: DateTimeParts) {
  return `${toDateValue(parts)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const total = daysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function addMonth(parts: DateParts, delta: number): DateParts {
  const date = new Date(parts.year, parts.month - 1 + delta, 1);
  const next = { year: date.getFullYear(), month: date.getMonth() + 1, day: parts.day };
  return { ...next, day: clampDay(next) };
}

function sameDay(a: DateParts, b: DateParts) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function isBeforeDay(a: DateParts, b: DateParts) {
  const ta = new Date(a.year, a.month - 1, a.day).getTime();
  const tb = new Date(b.year, b.month - 1, b.day).getTime();
  return ta < tb;
}

function isBeforeMonthView(view: DateParts, minDay: DateParts) {
  if (view.year < minDay.year) return true;
  if (view.year > minDay.year) return false;
  return view.month < minDay.month;
}

function partsToMs(parts: DateTimeParts) {
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute).getTime();
}

function clampDateTimeParts(parts: DateTimeParts, min: DateTimeParts): DateTimeParts {
  if (partsToMs(parts) < partsToMs(min)) return { ...min };
  return parts;
}

function useFloatingPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>
) {
  const [style, setStyle] = useState<CSSProperties>({});

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popW = Math.min(vw - 16, 416);
    const popH = popupRef.current?.offsetHeight ?? 420;
    let top = rect.bottom + gap;
    if (top + popH > vh - 8 && rect.top - gap - popH > 16) {
      top = rect.top - gap - popH;
    }
    top = Math.max(8, Math.min(top, vh - popH - 8));
    let left = rect.left;
    if (left + popW > vw - 8) left = vw - popW - 8;
    left = Math.max(8, left);
    setStyle({
      position: "fixed",
      top,
      left,
      width: popW,
      zIndex: 10000,
      maxHeight: `min(85vh, ${vh - 16}px)`,
      overflowY: "auto",
    });
  }, [anchorRef, popupRef]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return style;
}

type CalendarPopupProps = {
  popupId: string;
  viewParts: DateTimeParts;
  selectedParts: DateParts | null;
  timeParts: DateTimeParts;
  onViewChange: (patch: Partial<DateParts>) => void;
  onSelectDay: (day: number) => void;
  onTimeChange: (patch: Partial<DateTimeParts>) => void;
  onClose: () => void;
  showTime?: boolean;
  minFromNow?: boolean;
  anchorRef: RefObject<HTMLElement | null>;
};

function CalendarPopup({
  popupId,
  viewParts,
  selectedParts,
  timeParts,
  onViewChange,
  onSelectDay,
  onTimeChange,
  onClose,
  showTime = true,
  minFromNow = false,
  anchorRef,
}: CalendarPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const floatStyle = useFloatingPosition(true, anchorRef, popupRef);
  const today = todayParts();
  const minDateTime = useMemo(() => (minFromNow ? nowDepartureParts() : null), [minFromNow]);
  const suggestedToday = useMemo(() => (minFromNow ? minBookingDepartureParts() : null), [minFromNow]);
  const cells = useMemo(() => monthMatrix(viewParts.year, viewParts.month), [viewParts.year, viewParts.month]);
  const monthLabel = `Tháng ${pad(viewParts.month)} / ${viewParts.year}`;
  const canGoPrevMonth = !minFromNow || !isBeforeMonthView(viewParts, today);

  const selectedIsToday = selectedParts ? sameDay(selectedParts, today) : false;
  const minHour = minFromNow && selectedIsToday && minDateTime ? minDateTime.hour : 0;
  const minMinute = minFromNow && selectedIsToday && minDateTime ? minDateTime.minute : 0;

  const hourOptions = useMemo(() => {
    const all = Array.from({ length: 24 }, (_, i) => i);
    if (!minFromNow || !selectedIsToday) return all;
    return all.filter((h) => h >= minHour);
  }, [minFromNow, selectedIsToday, minHour]);

  const minuteOptions = useMemo(() => {
    if (!minFromNow || !selectedIsToday) return MINUTE_OPTIONS;
    if (timeParts.hour > minHour) return MINUTE_OPTIONS;
    if (timeParts.hour < minHour) return MINUTE_OPTIONS;
    return MINUTE_OPTIONS.filter((m) => m >= minMinute);
  }, [minFromNow, selectedIsToday, timeParts.hour, minHour, minMinute]);

  const moveMonth = (delta: number) => {
    if (delta < 0 && !canGoPrevMonth) return;
    const next = addMonth(viewParts, delta);
    onViewChange({ year: next.year, month: next.month, day: next.day });
  };

  const pickToday = () => {
    const min = suggestedToday ?? minDateTime ?? { ...today, hour: 6, minute: 0 };
    onViewChange({ year: today.year, month: today.month, day: today.day });
    onSelectDay(today.day);
    if (showTime && minFromNow) {
      onTimeChange({ hour: min.hour, minute: min.minute });
    }
  };

  const panel = (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[9999] cursor-default bg-slate-900/25 md:bg-transparent"
        aria-label="Đóng lịch"
        onClick={onClose}
      />
      <div
        ref={popupRef}
        id={popupId}
        role="dialog"
        aria-modal="true"
        className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl"
        style={floatStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={!canGoPrevMonth}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => moveMonth(-1)}
            aria-label="Tháng trước"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="text-center">
            <p className="text-lg font-extrabold text-ink-900">{monthLabel}</p>
            <p className="text-xs font-semibold text-brand-700">Lịch dương Việt Nam</p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100"
            onClick={() => moveMonth(1)}
            aria-label="Tháng sau"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 text-center text-xs font-extrabold uppercase tracking-wide text-slate-400">
          {weekDays.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5 text-center">
          {cells.map((day, idx) => {
            if (!day) return <span key={`empty-${idx}`} className="h-10" />;
            const current = { year: viewParts.year, month: viewParts.month, day };
            const selected = selectedParts ? sameDay(selectedParts, current) : false;
            const isToday = sameDay(today, current);
            const isPast = minFromNow && isBeforeDay(current, today);
            return (
              <button
                key={`${viewParts.year}-${viewParts.month}-${day}`}
                type="button"
                disabled={isPast}
                className={`grid h-10 place-items-center rounded-2xl text-sm font-bold transition ${
                  isPast
                    ? "cursor-not-allowed text-slate-300"
                    : selected
                      ? "bg-brand-600 text-white shadow-card"
                      : isToday
                        ? "bg-orange-50 text-cta-600 ring-1 ring-orange-100"
                        : "text-slate-700 hover:bg-slate-100 active:bg-slate-200"
                }`}
                onClick={() => onSelectDay(day)}
              >
                {day}
              </button>
            );
          })}
        </div>

        {showTime && (
          <div className="mt-4 rounded-3xl bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <b className="inline-flex items-center gap-2 text-sm">
                <Clock size={17} className="text-brand-700" /> Thời gian
              </b>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-ink-900 shadow-card">
                {pad(timeParts.hour)}:{pad(timeParts.minute)}
              </span>
            </div>
            {minFromNow && selectedIsToday && (
              <p className="mt-2 text-xs font-semibold text-brand-800">{suggestedBookingDepartureHint()}</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                className="input !rounded-2xl !bg-white"
                aria-label="Giờ đi"
                value={hourOptions.includes(timeParts.hour) ? timeParts.hour : hourOptions[0]}
                onChange={(e) => onTimeChange({ hour: Number(e.target.value) })}
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {pad(h)} giờ
                  </option>
                ))}
              </select>
              <select
                className="input !rounded-2xl !bg-white"
                aria-label="Phút đi"
                value={minuteOptions.includes(timeParts.minute) ? timeParts.minute : minuteOptions[0]}
                onChange={(e) => onTimeChange({ minute: Number(e.target.value) })}
              >
                {minuteOptions.map((m) => (
                  <option key={m} value={m}>
                    {pad(m)} phút
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            onClick={pickToday}
          >
            Hôm nay
          </button>
          <button type="button" className="btn-primary !rounded-2xl !py-2" onClick={onClose}>
            Xong
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}

type DateFieldProps = {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  showTime: boolean;
  placeholder: string;
  clearable?: boolean;
  minFromNow?: boolean;
  compact?: boolean;
  triggerRef?: React.Ref<HTMLButtonElement>;
  invalid?: boolean;
  "aria-describedby"?: string;
};

function DateField({
  value,
  onChange,
  className = "",
  showTime,
  placeholder,
  clearable,
  minFromNow = false,
  compact = false,
  triggerRef,
  invalid = false,
  "aria-describedby": ariaDescribedBy,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const hasValue = Boolean(value?.trim());

  const emitChange = useCallback(
    (next: string) => {
      onChange(next);
    },
    [onChange]
  );

  const selectedParts = useMemo(() => (showTime ? parseDateTimeValue(value) : null), [value, showTime]);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);

  const defaultTime = { hour: 6, minute: 0 };
  const [viewParts, setViewParts] = useState<DateTimeParts>(() => {
    const base = selectedDate ?? todayParts();
    const t = selectedParts ?? defaultTime;
    return { ...base, hour: t.hour, minute: t.minute };
  });

  useEffect(() => {
    if (!open) return;
    const base = selectedDate ?? todayParts();
    const t = selectedParts ?? defaultTime;
    setViewParts({ ...base, hour: t.hour, minute: t.minute });
  }, [open, selectedDate, selectedParts]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const displayText = hasValue
    ? showTime
      ? formatDisplayDateTime(value)
      : formatDisplayDate(value)
    : placeholder;

  const commitDate = (day: number) => {
    let next: DateTimeParts = {
      year: viewParts.year,
      month: viewParts.month,
      day,
      hour: selectedParts?.hour ?? viewParts.hour,
      minute: selectedParts?.minute ?? viewParts.minute,
    };
    if (minFromNow) {
      const min = nowDepartureParts();
      if (isBeforeDay(next, todayParts())) return;
      if (sameDay(next, todayParts())) {
        next = clampDateTimeParts(next, min);
      }
    }
    emitChange(showTime ? toDateTimeValue(next) : toDateValue(next));
  };

  const handleTimeChange = (patch: Partial<DateTimeParts>) => {
    const base = selectedParts ?? { ...viewParts, ...selectedDate, day: viewParts.day };
    let next = { ...base, ...patch };
    if (!selectedDate) return;
    if (minFromNow) {
      const min = nowDepartureParts();
      if (sameDay(next, todayParts())) {
        next = clampDateTimeParts(next, min);
      }
    }
    emitChange(toDateTimeValue(next));
    setViewParts(next);
  };

  return (
    <div className={`relative ${className}`} ref={anchorRef}>
      <div className="flex gap-2">
        <button
          ref={triggerRef}
          type="button"
          className={`input flex min-h-[44px] flex-1 items-center justify-between gap-2 text-left touch-manipulation ${
            invalid ? "border-red-500 ring-1 ring-red-300" : ""
          }`}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? popupId : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`font-extrabold ${hasValue ? "text-ink-900" : "text-slate-400"}`}>{displayText}</span>
          <CalendarDays size={19} className="shrink-0 text-brand-700" />
        </button>
        {clearable && hasValue && (
          <button
            type="button"
            className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Xóa ngày đã chọn"
            onClick={() => onChange("")}
          >
            <X size={18} />
          </button>
        )}
      </div>
      {hasValue && !compact && (
        <span className="mt-1 block text-xs font-semibold text-brand-700">
          Dương lịch: {showTime ? formatDisplayDateTime(value) : formatDisplayDate(value)}
        </span>
      )}
      {open && (
        <CalendarPopup
          popupId={popupId}
          viewParts={viewParts}
          selectedParts={selectedDate}
          timeParts={selectedParts ?? viewParts}
          onViewChange={(patch) => setViewParts((prev) => ({ ...prev, ...patch }))}
          onSelectDay={commitDate}
          onTimeChange={handleTimeChange}
          onClose={() => setOpen(false)}
          showTime={showTime}
          minFromNow={minFromNow}
          anchorRef={anchorRef}
        />
      )}
    </div>
  );
}

type GregorianDateInputProps = {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  clearable?: boolean;
  minFromNow?: boolean;
  compact?: boolean;
};

export function GregorianDateInput({
  value,
  onChange,
  className = "",
  clearable = true,
  minFromNow = false,
  compact = false,
}: GregorianDateInputProps) {
  return (
    <DateField
      value={value}
      onChange={onChange}
      className={className}
      showTime={false}
      placeholder="Chọn ngày"
      clearable={clearable}
      minFromNow={minFromNow}
      compact={compact}
    />
  );
}

type GregorianDateTimeInputProps = {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  minFromNow?: boolean;
  compact?: boolean;
  triggerRef?: React.Ref<HTMLButtonElement>;
  invalid?: boolean;
  "aria-describedby"?: string;
};

export function GregorianDateTimeInput({
  value,
  onChange,
  className = "",
  minFromNow = false,
  compact = false,
  triggerRef,
  invalid,
  "aria-describedby": ariaDescribedBy,
}: GregorianDateTimeInputProps) {
  return (
    <DateField
      value={value}
      onChange={onChange}
      className={className}
      showTime
      placeholder="Chọn ngày giờ"
      clearable={false}
      minFromNow={minFromNow}
      compact={compact}
      triggerRef={triggerRef}
      invalid={invalid}
      aria-describedby={ariaDescribedBy}
    />
  );
}
