import DatePicker, { registerLocale } from 'react-datepicker';
import { id } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('id', id);

export function parseDateKey(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function parseMonthKey(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1);
}

export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const baseInput =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800';

interface FieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** Render calendar in a portal (needed inside scrollable modals). */
  usePortal?: boolean;
}

export function DateField({ value, onChange, className, placeholder, usePortal }: FieldProps) {
  return (
    <DatePicker
      selected={parseDateKey(value)}
      onChange={(d: Date | null) => {
        if (d) onChange(toDateKey(d));
      }}
      locale="id"
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      className={className || baseInput}
      wrapperClassName="w-full"
      withPortal={!!usePortal}
      showPopperArrow={false}
    />
  );
}

export function MonthField({ value, onChange, className, placeholder, usePortal }: FieldProps) {
  return (
    <DatePicker
      selected={parseMonthKey(value)}
      onChange={(d: Date | null) => {
        if (d) onChange(toMonthKey(d));
      }}
      locale="id"
      dateFormat="MM/yyyy"
      showMonthYearPicker
      placeholderText={placeholder}
      className={className || baseInput}
      wrapperClassName="w-full"
      withPortal={!!usePortal}
      showPopperArrow={false}
    />
  );
}
