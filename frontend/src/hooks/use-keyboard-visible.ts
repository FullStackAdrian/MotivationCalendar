import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Indica si el teclado nativo está visible.
 * En web siempre es falso (no hay eventos de teclado RN): el hero se mantiene.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}
