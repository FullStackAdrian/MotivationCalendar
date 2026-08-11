import { theme } from '@/theme';

describe('legacy visual theme parity', () => {
  it('keeps the core MotivationCalendar palette', () => {
    expect(theme.colors.background).toBe('#F5F2EC');
    expect(theme.colors.surface).toBe('#EDE9E0');
    expect(theme.colors.ink).toBe('#1A1814');
    expect(theme.colors.inkMid).toBe('#7A7570');
    expect(theme.colors.inkFaint).toBe('#C2BDB5');
    expect(theme.colors.done).toBe('#2E5E18');
    expect(theme.colors.partial).toBe('#8A5A0A');
    expect(theme.colors.miss).toBe('#862222');
  });
});
