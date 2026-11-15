import { useEffect } from 'react';
import { Keyboard, Platform, TextInput, UIManager, type ScrollView } from 'react-native';
import type { RefObject } from 'react';

type ScrollTarget = Pick<ScrollView, 'scrollTo' | 'getInnerViewNode' | 'getScrollResponder'>;
type ScrollRef = RefObject<ScrollTarget | null>;

/** Punto de scroll extra por encima del campo enfocado para que no quede pegado al teclado. */
export const FOCUSED_FIELD_TOP_OFFSET = 24;

function currentlyFocusedField(): unknown {
  const state = TextInput.State as unknown as {
    currentlyFocusedField?: () => unknown;
    currentlyFocusedInput?: () => unknown;
  };
  if (typeof state.currentlyFocusedField === 'function') {
    const field = state.currentlyFocusedField();
    if (field != null) return field;
  }
  // API moderna (Fabric): devuelve el HostInstance en vez del tag numérico.
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

function scrollResponderFor(scroll: ScrollTarget): {
  scrollResponderScrollNativeHandleToKeyboard?: (node: unknown, offset: number, preventNegative: boolean) => void;
} | null {
  if (typeof scroll.getScrollResponder !== 'function') return null;
  try {
    return scroll.getScrollResponder() as {
      scrollResponderScrollNativeHandleToKeyboard?: (node: unknown, offset: number, preventNegative: boolean) => void;
    } | null;
  } catch {
    return null;
  }
}

/**
 * Al abrirse el teclado nativo, desplaza el ScrollView para que el campo
 * enfocado quede visible por encima del teclado. Usa el responder nativo del
 * ScrollView (válido en Fabric) con fallback a UIManager.measureLayout.
 * En web no hace nada.
 */
export function useScrollToFocusedInput(scrollRef: ScrollRef, topOffset = FOCUSED_FIELD_TOP_OFFSET): void {
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      nextFrame(() => {
        const scroll = scrollRef.current;
        if (scroll == null) return;
        const field = currentlyFocusedField();
        if (field == null) return;
        const responder = scrollResponderFor(scroll);
        const measureLayout = (UIManager as unknown as { measureLayout?: unknown }).measureLayout;
        const inner = scroll.getInnerViewNode();
        try {
          if (responder?.scrollResponderScrollNativeHandleToKeyboard) {
            responder.scrollResponderScrollNativeHandleToKeyboard(field, topOffset, true);
          }
          if (inner == null || typeof measureLayout !== 'function') return;
          (measureLayout as (
            node: unknown,
            ancestor: number,
            onFail: () => void,
            onSuccess: (x: number, y: number, width: number, height: number) => void
          ) => void).call(UIManager, field, inner as number, () => undefined, (_x, y) => {
            scroll.scrollTo({ y: Math.max(0, y - topOffset), animated: true });
          });
        } catch {
          // Medición no disponible (p. ej. vista desmontada): no bloquear el teclado.
        }
      });
    });
    return () => subscription.remove();
  }, [scrollRef, topOffset]);
}
