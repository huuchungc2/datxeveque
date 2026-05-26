import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { formatDisplayDate, formatDisplayDateTime } from '../../lib/datetime';

const pad = (n: number) => String(n).padStart(2, '0');
const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

type DateParts = { year: number; month: number; day: number };
type DateTimeParts = DateParts & { hour: number; minute: number };

function parseDateValue(value?: string): DateParts {
  const now = new Date();
  const [y, m, d] = (value || '').split('-').map((x) => Number(x));
  return {
    year: Number.isFinite(y) && y > 0 ? y : now.getFullYear(),
    month: Number.isFinite(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1,
    day: Number.isFinite(d) && d >= 1 && d <= 31 ? d : now.getDate(),
  };
}

function parseDateTimeValue(value?: string): DateTimeParts {
  const [datePart, timePart] = (value || '').split('T');
  const date = parseDateValue(datePart);
  const [h, min] = (timePart || '').split(':').map((x) => Number(x));
  return {
    ...date,
    hour: Number.isFinite(h) && h >= 0 && h <= 23 ? h : 6,
    minute: Number.isFinite(min) && min >= 0 && min <= 59 ? min : 0,
  };
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
  const startOffset = (first.getDay() + 6) % 7; // Monday first
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

function buildDate(parts: DateParts) {
  return new Date(parts.year, parts.month - 1, parts.day);
}

function sameDay(a: DateParts, b: DateParts) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

type CalendarPopupProps = {
  parts: DateTimeParts;
  onChange: (patch: Partial<DateTimeParts>) => void;
  onClose?: () => void;
  showTime?: boolean;
};

function CalendarPopup({ parts, onChange, onClose, showTime = true }: CalendarPopupProps) {
  const todayRaw = new Date();
  const today = { year: todayRaw.getFullYear(), month: todayRaw.getMonth() + 1, day: todayRaw.getDate() };
  const cells = useMemo(() => monthMatrix(parts.year, parts.month), [parts.year, parts.month]);
  const monthLabel = `Tháng ${pad(parts.month)} / ${parts.year}`;

  const moveMonth = (delta: number) => {
    const next = addMonth(parts, delta);
    onChange({ year: next.year, month: next.month, day: next.day });
  };

  return (
    <div className="absolute left-0 top-[calc(100%+.65rem)] z-[80] w-[min(92vw,25rem)] rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl md:w-[26rem]">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100" onClick={() => moveMonth(-1)} aria-label="Tháng trước">
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <p className="text-lg font-extrabold text-ink-900">{monthLabel}</p>
          <p className="text-xs font-semibold text-brand-700">Lịch dương Việt Nam</p>
        </div>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100" onClick={() => moveMonth(1)} aria-label="Tháng sau">
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-xs font-extrabold uppercase tracking-wide text-slate-400">
        {weekDays.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5 text-center">
        {cells.map((day, idx) => {
          if (!day) return <span key={`empty-${idx}`} className="h-10" />;
          const current = { year: parts.year, month: parts.month, day };
          const selected = sameDay(parts, current);
          const isToday = sameDay(today, current);
          return (
            <button
              key={day}
              type="button"
              className={`grid h-10 place-items-center rounded-2xl text-sm font-bold transition ${
                selected
                  ? 'bg-brand-600 text-white shadow-card'
                  : isToday
                    ? 'bg-orange-50 text-cta-600 ring-1 ring-orange-100'
                    : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => onChange({ day })}
            >
              {day}
            </button>
          );
        })}
      </div>

      {showTime && (
        <div className="mt-4 rounded-3xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <b className="inline-flex items-center gap-2 text-sm"><Clock size={17} className="text-brand-700" /> Thời gian</b>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-ink-900 shadow-card">{pad(parts.hour)}:{pad(parts.minute)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select className="input !rounded-2xl !bg-white" aria-label="Giờ đi" value={parts.hour} onChange={(e) => onChange({ hour: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{pad(h)} giờ</option>)}
            </select>
            <select className="input !rounded-2xl !bg-white" aria-label="Phút đi" value={parts.minute} onChange={(e) => onChange({ minute: Number(e.target.value) })}>
              {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => <option key={m} value={m}>{pad(m)} phút</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
          onClick={() => {
            const d = new Date();
            onChange({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
          }}
        >
          Hôm nay
        </button>
        <button type="button" className="btn-primary !rounded-2xl !py-2" onClick={onClose}>Xong</button>
      </div>
    </div>
  );
}

type GregorianDateInputProps = {
  value?: string;
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  required?: boolean;
  className?: string;
};

export function GregorianDateInput({ value, onChange, className = '' }: GregorianDateInputProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseDateValue(value);
  const parts: DateTimeParts = { ...parsed, hour: 6, minute: 0 };

  const update = (patch: Partial<DateTimeParts>) => {
    const next = { ...parts, ...patch };
    onChange(toDateValue(next));
  };

  return (
    <div className={`relative ${className}`}>
      <button type="button" className="input flex items-center justify-between text-left" onClick={() => setOpen((v) => !v)}>
        <span className="font-extrabold text-ink-900">{formatDisplayDate(toDateValue(parts))}</span>
        <CalendarDays size={19} className="text-brand-700" />
      </button>
      <span className="mt-1 block text-xs font-semibold text-brand-700">Dương lịch: {formatDisplayDate(toDateValue(parts))}</span>
      {open && <CalendarPopup parts={parts} onChange={update} onClose={() => setOpen(false)} showTime={false} />}
    </div>
  );
}

type GregorianDateTimeInputProps = {
  value?: string;
  onChange: (value: string) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
};

export function GregorianDateTimeInput({ value, onChange, className = '' }: GregorianDateTimeInputProps) {
  const [open, setOpen] = useState(false);
  const parts = parseDateTimeValue(value);

  const update = (patch: Partial<DateTimeParts>) => {
    const next = { ...parts, ...patch };
    onChange(toDateTimeValue(next));
  };

  return (
    <div className={`relative ${className}`}>
      <button type="button" className="input flex items-center justify-between text-left" onClick={() => setOpen((v) => !v)}>
        <span className="font-extrabold text-ink-900">{formatDisplayDateTime(toDateTimeValue(parts))}</span>
        <CalendarDays size={19} className="text-brand-700" />
      </button>
      <span className="mt-1 block text-xs font-semibold text-brand-700">Dương lịch: {formatDisplayDateTime(toDateTimeValue(parts))}</span>
      {open && <CalendarPopup parts={parts} onChange={update} onClose={() => setOpen(false)} showTime />}
    </div>
  );
}
