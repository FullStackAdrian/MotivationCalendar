import { useEffect } from 'react';
import { Keyboard, Platform, TextInput, UIManager, type ScrollView } from 'react-native';
import type { RefObject } from 'react';

type ScrollTarget = Pick<ScrollView, 'scrollTo' | 'getInnerViewNode'>;
type ScrollRef = RefObject<ScrollTarget | null>;

/** Punto de scroll extra sobre el campo enfocado para que no quede pegado al teclado. */
export const FOCUSED_FIELD_TOP_OFFSET = 24;

function currentlyFocusedHandle(): number | null {
  const state = TextInput.State as unknown as {
    currentlyFocusedField?: () => number | null;
    currentlyFocusedInput?: () => number | null;
  };
  if (typeof state.currentlyFocusedField === 'function') return state.currentlyFocusedField();
  if (typeof state.currentlyFocusedInput === 'function') return state.currentlyFocusedInput();
  return null;
}

const nextFrame = (callback: () => void): void => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
    return;
  }
  callback();
};

/**
 * Al abrirse el teclado nativo, desplaza el ScrollView para que el campo
 * enfocado quede visible por encima del teclado. Sin teclado (web) no hace nada.
 */
export function useScrollToFocusedInput(scrollRef: ScrollRef, topOffset = FOCUSED_FIELD_TOP_OFFSET): void {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      nextFrame(() => {
        const field = currentlyFocusedHandle();
        const scroll = scrollRef.current;
        const measureLayout = (UIManager as unknown as { measureLayout?: unknown }).measureLayout;
        if (field == null || scroll == null || typeof measureLayout !== 'function') return;
        const inner = scroll.getInnerViewNode();
        if (inner == null) return;
        try {
          (measureLayout as (
            node: number,
            ancestor: number,
            onFail: () => void,
            onSuccess: (x: number, y: number, width: number, height: number) => void
          ) => void).call(
            UIManager,
            field,
            inner as number,
            () => undefined,
            (_x, y) => {
              scroll.scrollTo({ y: Math.max(0, y - topOffset), animated: true });
            }
          );
        } catch {
          // Medición no disponible (p. ej. vista desmontada): no bloquear el teclado.
        }
      });
    });
    return () => subscription.remove();
  }, [scrollRef, topOffset]);
}
