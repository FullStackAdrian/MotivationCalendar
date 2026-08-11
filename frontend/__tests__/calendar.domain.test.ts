import { calculateDayOfYear, getDayVisualState } from '@/domain/calendar/calendar';

describe('calendar domain', () => {
  it('calculates the 2026 day of year without timezone drift', () => {
    expect(calculateDayOfYear('2026-01-01')).toBe(1);
    expect(calculateDayOfYear('2026-12-31')).toBe(365);
  });

  it('maps progress to the same visual semantics as the legacy calendar', () => {
    expect(getDayVisualState({ dayOfYear: 10, todayDayOfYear: 20, status: null })).toBe('past');
    expect(getDayVisualState({ dayOfYear: 20, todayDayOfYear: 20, status: null })).toBe('today');
    expect(getDayVisualState({ dayOfYear: 21, todayDayOfYear: 20, status: null })).toBe('future');
    expect(getDayVisualState({ dayOfYear: 10, todayDayOfYear: 20, status: 'done' })).toBe('done');
    expect(getDayVisualState({ dayOfYear: 10, todayDayOfYear: 20, status: 'partial' })).toBe('partial');
    expect(getDayVisualState({ dayOfYear: 10, todayDayOfYear: 20, status: 'miss' })).toBe('miss');
  });
});
