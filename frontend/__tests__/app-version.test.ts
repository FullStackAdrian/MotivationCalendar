import { compareVersions, isNewerVersion, normalizeVersion } from '@/domain/app-version';

describe('app-version domain', () => {
  it('normalizes versions to numeric triplets', () => {
    expect(normalizeVersion('1.0.0')).toEqual([1, 0, 0]);
    expect(normalizeVersion('  2.10.3  ')).toEqual([2, 10, 3]);
    expect(normalizeVersion('1.2')).toEqual([1, 2, 0]);
    expect(normalizeVersion('1.2.3-beta.1')).toEqual([1, 2, 3]);
  });

  it('compares versions numerically (10 > 9, no orden lexico)', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.10', '1.0.9')).toBe(1);
    expect(compareVersions('1.0.9', '1.0.10')).toBe(-1);
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
    expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
  });

  it('detects when the published version is newer than the installed one', () => {
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true);
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(false);
    expect(isNewerVersion('', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.1', '')).toBe(false);
  });
});
