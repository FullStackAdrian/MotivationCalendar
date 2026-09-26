import React from 'react';
import { Platform, StyleProp, Text, View, ViewStyle } from 'react-native';

export type IconName =
  | 'albums-outline'
  | 'log-out-outline'
  | 'chevron-back'
  | 'add'
  | 'archive-outline'
  | 'person-outline'
  | 'star-outline'
  | 'time-outline'
  | 'repeat-outline'
  | 'ellipsis-horizontal';

const PATHS: Record<IconName, string> = {
  'albums-outline': 'M12 4l8 4v8l-8 4-8-4V8l8-4zm0 6l-5.5 2.75L12 15.5l5.5-2.75L12 10zm-6.5 5.05V15l5.5 2.75v2.05L5.5 17.05zM12 17.5l5.5-2.75v2.05L12 19.55v-2.05z',
  'log-out-outline': 'M16 17l-1.41-1.41L18.17 12H8v-2h10.17l-3.58-3.59L16 5l6 6-6 6zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
  'chevron-back': 'M14.71 6.71a.996.996 0 00-1.41 0L8.71 11.3c-.39.39-.39 1.02 0 1.41l4.59 4.59a.996.996 0 101.41-1.41L10.83 12l4.88-4.88c.39-.39.38-1.03-.01-1.41z',
  'add': 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  'archive-outline': 'M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM5.5 5h13l.96 1.2H4.54L5.5 5zM5 19V8h14v11H5zm2-9h10v2H7v-2z',
  'person-outline': 'M12 5.9a2.1 2.1 0 110 4.2 2.1 2.1 0 010-4.2m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z',
  'star-outline': 'M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
  'time-outline': 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  'repeat-outline': 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
  'ellipsis-horizontal': 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 16, color = '#1A1814', style }: IconProps) {
  const path = PATHS[name];
  if (!path) return null;
  if (Platform.OS === 'web') {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
    const textProps = {
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no' as const,
      style: [{ fontSize: 0, lineHeight: 0, color: 'transparent' }, style],
      dangerouslySetInnerHTML: { __html: markup },
    };
    return <Text {...(textProps as unknown as React.ComponentProps<typeof Text>)} />;
  }
  return <View style={[{ width: size, height: size }, style]} />;
}
