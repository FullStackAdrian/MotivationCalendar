export type CalendarStatus = 'done' | 'partial' | 'miss' | null;

const MS_PER_DAY = 86_400_000;

export function calculateDayOfYear(dayKey: string): number {
  const [year, month, day] = dayKey.split('-').map(Number);
  const current = Date.UTC(year, month - 1, day);
  const start = Date.UTC(year, 0, 1);
  return Math.floor((current - start) / MS_PER_DAY) + 1;
}

export function getDayVisualState(input: {
  dayOfYear: number;
  todayDayOfYear: number;
  status: CalendarStatus;
}): 'past' | 'today' | 'future' | 'done' | 'partial' | 'miss' {
  if (input.status) return input.status;
  if (input.dayOfYear < input.todayDayOfYear) return 'past';
  if (input.dayOfYear === input.todayDayOfYear) return 'today';
  return 'future';
}

export function dayKeyForYearDay(year: number, dayOfYear: number): string {
  const date = new Date(Date.UTC(year, 0, dayOfYear));
  return date.toISOString().slice(0, 10);
}
