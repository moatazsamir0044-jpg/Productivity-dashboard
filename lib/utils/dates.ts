// Date helpers for day-based scheduling. All dates are ISO YYYY-MM-DD strings
// in UTC, matching how the rest of the app derives "today"
// (new Date().toISOString().slice(0, 10)).

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Monday of the week containing the given date.
export function startOfWeekISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysISO(iso, diff);
}

// The 7 days (Mon–Sun) of the week containing the given date.
export function weekDaysISO(iso: string): string[] {
  const monday = startOfWeekISO(iso);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// "Mon 6 Jul" — compact label for week columns and schedule selects.
export function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${DAY_LABELS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_LABELS[d.getUTCMonth()]}`;
}
