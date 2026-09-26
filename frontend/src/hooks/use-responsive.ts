import { useWindowDimensions } from 'react-native';
import { theme } from '@/theme';

export type ResponsiveSize = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  width: number;
  height: number;
  size: ResponsiveSize;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isCompact: boolean;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isMobile = width <= theme.breakpoints.md;
  const isTablet = width > theme.breakpoints.md && width <= theme.breakpoints.lg;
  const isDesktop = width > theme.breakpoints.lg;
  const size: ResponsiveSize = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
  const isCompact = width <= theme.breakpoints.sm;
  return { width, height, size, isMobile, isTablet, isDesktop, isCompact };
}
