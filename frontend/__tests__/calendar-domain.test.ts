import { calculateDayOfYear, dayKeyForYearDay, getDayVisualState } from '@/domain/calendar/calendar';

describe('calendar domain', () => {
  it('calculates day of year using UTC', () => {
    expect(calculateDayOfYear('2026-01-01')).toBe(1);
    expect(calculateDayOfYear('2026-12-31')).toBe(365);
  });

  it('round-trips a day of year to its date key', () => {
    expect(dayKeyForYearDay(2026, 1)).toBe('2026-01-01');
    expect(dayKeyForYearDay(2026, 365)).toBe('2026-12-31');
  });

  it('prioritizes an explicit status over temporal state', () => {
    expect(getDayVisualState({ dayOfYear: 5, todayDayOfYear: 10, status: 'done' })).toBe('done');
    expect(getDayVisualState({ dayOfYear: 5, todayDayOfYear: 10, status: null })).toBe('past');
    expect(getDayVisualState({ dayOfYear: 10, todayDayOfYear: 10, status: null })).toBe('today');
    expect(getDayVisualState({ dayOfYear: 11, todayDayOfYear: 10, status: null })).toBe('future');
  });
});
