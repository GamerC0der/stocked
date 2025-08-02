import React, { useMemo, useState } from "react";

// Simple calendar + range selector, headless and styled via tailwind from parent context
export type DateRange = { start?: Date; end?: Date };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a?: Date, b?: Date) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addMonths(d: Date, m: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function clampRange(a?: Date, b?: Date): DateRange {
  if (!a || !b) return { start: a, end: b };
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

type Props = {
  value: DateRange;
  onChange: (r: DateRange) => void;
  presets?: { label: string; days: number }[];
  className?: string;
};

export default function DateRangePicker({ value, onChange, presets, className }: Props) {
  const today = startOfDay(new Date());
  const [view, setView] = useState<Date>(value.end ?? today);

  const grid = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // make Monday=0
    const totalDays = daysInMonth(year, month);

    const days: { date: Date; inMonth: boolean }[] = [];

    // previous month fillers
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(year, month, 1 - (startWeekday - i));
      days.push({ date: d, inMonth: false });
    }
    // current month
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(year, month, d), inMonth: true });
    }
    // next month fillers to make 6 rows of 7
    while (days.length % 7 !== 0 || days.length < 42) {
      const last = days[days.length - 1].date;
      days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }
    return days;
  }, [view]);

  const { start, end } = value;
  const range = clampRange(start, end);

  function pick(day: Date) {
    if (!range.start || (range.start && range.end)) {
      onChange({ start: startOfDay(day), end: undefined });
    } else {
      onChange(clampRange(range.start, startOfDay(day)));
    }
  }

  function applyPreset(days: number) {
    const end = today;
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    onChange({ start, end });
    setView(end);
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => setView(addMonths(view, -1))}>{"<"}</button>
        <div className="text-sm text-white/90">
          {view.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>
        <button className="px-2 py-1 rounded bg-white/10 hover:bg-white/20" onClick={() => setView(addMonths(view, 1))}>{">"}</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/60 mb-1">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map(({ date, inMonth }, i) => {
          const d = startOfDay(date);
          const inRange = range.start && range.end && d >= range.start && d <= range.end;
          const isStart = isSameDay(d, range.start);
          const isEnd = isSameDay(d, range.end);
          const isToday = isSameDay(d, today);

          return (
            <button
              key={i}
              onClick={() => pick(d)}
              className={[
                "h-8 rounded text-sm transition-colors",
                inMonth ? "text-white" : "text-white/30",
                inRange ? "bg-white/20" : "hover:bg-white/10",
                (isStart || isEnd) ? "ring-1 ring-white/70" : "",
                isToday ? "border border-white/30" : ""
              ].join(" ")}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {presets && presets.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {presets.map(p => (
            <button key={p.label} className="px-2 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20" onClick={() => applyPreset(p.days)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-white/80">
        <div>
          <span className="opacity-70 mr-1">Start:</span>
          {range.start ? range.start.toLocaleDateString() : "–"}
        </div>
        <div>
          <span className="opacity-70 mr-1">End:</span>
          {range.end ? range.end.toLocaleDateString() : "–"}
        </div>
      </div>
    </div>
  );
}