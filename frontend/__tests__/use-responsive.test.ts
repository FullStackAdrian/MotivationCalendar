import { renderHook } from '@testing-library/react-native';
import { useResponsive } from '@/hooks/use-responsive';
import { describeNative } from './helpers/projects';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1024, height: 800, scale: 2, fontScale: 1 })),
}));

function setDimensions(width: number, height = 800): void {
  const mock = jest.requireMock('react-native/Libraries/Utilities/useWindowDimensions').default as jest.Mock;
  mock.mockReturnValue({ width, height, scale: 2, fontScale: 1 });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describeNative('useResponsive', () => {
  it('classifies widths into mobile, tablet and desktop', () => {
    setDimensions(360);
    expect(renderHook(() => useResponsive()).result.current).toMatchObject({ size: 'mobile', isMobile: true, isTablet: false, isDesktop: false });
    setDimensions(600);
    expect(renderHook(() => useResponsive()).result.current).toMatchObject({ size: 'tablet', isMobile: false, isTablet: true, isDesktop: false });
    setDimensions(1024);
    expect(renderHook(() => useResponsive()).result.current).toMatchObject({ size: 'desktop', isMobile: false, isTablet: false, isDesktop: true });
  });

  it('respects the exact breakpoint edges (sm 360, md 480, lg 768)', () => {
    setDimensions(480);
    expect(renderHook(() => useResponsive()).result.current.size).toBe('mobile');
    setDimensions(481);
    expect(renderHook(() => useResponsive()).result.current.size).toBe('tablet');
    setDimensions(768);
    expect(renderHook(() => useResponsive()).result.current.size).toBe('tablet');
    setDimensions(769);
    expect(renderHook(() => useResponsive()).result.current.size).toBe('desktop');
  });

  it('flags compact layouts at or below the sm breakpoint', () => {
    setDimensions(360, 640);
    const compact = renderHook(() => useResponsive()).result.current;
    expect(compact.isCompact).toBe(true);
    expect(compact).toMatchObject({ width: 360, height: 640 });
    setDimensions(361);
    expect(renderHook(() => useResponsive()).result.current.isCompact).toBe(false);
  });
});
