export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndonesian(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthYearIndonesian(): string {
  const d = new Date();
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function startOfWeekMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return end;
}

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeriodRange(period: 'daily' | 'weekly' | 'monthly'): { start: string; end: string } {
  const now = new Date();
  if (period === 'daily') {
    const today = formatDateKey(now);
    return { start: today, end: today };
  }
  if (period === 'weekly') {
    return { start: formatDateKey(startOfWeekMonday(now)), end: formatDateKey(endOfWeekSunday(now)) };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: formatDateKey(start), end: formatDateKey(end) };
}

export function isDateInRange(dateString: string, start: string, end: string): boolean {
  return dateString >= start && dateString <= end;
}

export function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Expand a YYYY-MM key into the inclusive start/end date range of that month. */
export function getMonthRange(monthKey: string): { startDate: string; endDate: string } {
  const [year, month] = monthKey.split('-').map(Number);
  return {
    startDate: formatDateKey(new Date(year, month - 1, 1)),
    endDate: formatDateKey(new Date(year, month, 0)),
  };
}

export interface MonthlyFlow {
  key: string; // YYYY-MM
  label: string; // short month label, e.g. "Jan"
  fullLabel: string; // e.g. "Januari 2026"
  income: number;
  expense: number;
}

/** Aggregate real cashflow (excluding opening-balance carry-overs) per month. */
export function getMonthlyCashflow(
  transactions: { transaction_date: string; transaction_type: string; amount: number; is_opening?: boolean }[],
  months: number
): MonthlyFlow[] {
  const now = new Date();
  const result: MonthlyFlow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({
      key,
      label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d).replace('.', ''),
      fullLabel: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d),
      income: 0,
      expense: 0,
    });
  }
  const byKey = new Map(result.map((m) => [m.key, m]));
  for (const tx of transactions) {
    if (tx.is_opening) continue;
    const entry = byKey.get(tx.transaction_date.slice(0, 7));
    if (!entry) continue;
    if (tx.transaction_type === 'income') entry.income += tx.amount;
    else entry.expense += tx.amount;
  }
  return result;
}

/** Total expense per category for a given month (YYYY-MM), excluding carry-overs. */
export function getCategorySpending(
  transactions: { category_id: string; transaction_type: string; amount: number; transaction_date: string; is_opening?: boolean }[],
  yearMonth: string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.is_opening || tx.transaction_type !== 'expense') continue;
    if (!tx.transaction_date.startsWith(yearMonth)) continue;
    map.set(tx.category_id, (map.get(tx.category_id) || 0) + tx.amount);
  }
  return map;
}

/** Compact IDR for chart labels, e.g. 1500000 -> "1,5 jt". */
export function formatIDRShort(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(amount / 1_000_000_000)} M`;
  }
  if (abs >= 1_000_000) {
    return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(amount / 1_000_000)} jt`;
  }
  if (abs >= 1_000) {
    return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(amount / 1_000)} rb`;
  }
  return `${amount}`;
}
