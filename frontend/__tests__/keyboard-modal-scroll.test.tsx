import { renderHook } from '@testing-library/react-native';
import { Keyboard, Platform, TextInput, UIManager } from 'react-native';
import { useScrollToFocusedInput, FOCUSED_FIELD_TOP_OFFSET } from '../src/hooks/use-scroll-to-focused-input';
import { describeNative } from './helpers/projects';

const handlers: Record<string, Array<() => void>> = { keyboardDidShow: [], keyboardDidHide: [] };
let keyboardSpy: jest.SpyInstance;
let measureMock: jest.Mock;
let rafSpy: jest.SpyInstance;
let hadMeasureLayout: boolean;
let originalMeasureLayout: unknown;

function fireKeyboardShow(): void {
  for (const handler of handlers.keyboardDidShow) handler();
}

function focusedField(handle: unknown): void {
  const state = TextInput.State as unknown as { currentlyFocusedField?: () => unknown };
  Object.defineProperty(state, 'currentlyFocusedField', { value: () => handle, configurable: true });
}

function mockMeasureLayout(): void {
  measureMock = jest.fn(((
    _node: unknown,
    _ancestor: number,
    _onFail: () => void,
    onSuccess: (x: number, y: number, width: number, height: number) => void
  ) => {
    onSuccess(10, 500, 100, 40);
  }) as never);
  hadMeasureLayout = 'measureLayout' in (UIManager as unknown as Record<string, unknown>);
  originalMeasureLayout = (UIManager as unknown as Record<string, unknown>).measureLayout;
  (UIManager as unknown as Record<string, unknown>).measureLayout = measureMock;
}

function responderRef(scrollTo = jest.fn(), scrollNative = jest.fn()): {
  ref: { current: { getScrollResponder: () => unknown; getInnerViewNode: () => number; scrollTo: jest.Mock } };
  scrollTo: jest.Mock;
  scrollNative: jest.Mock;
} {
  return {
    ref: {
      current: {
        getScrollResponder: () => ({ scrollResponderScrollNativeHandleToKeyboard: scrollNative }),
        getInnerViewNode: () => 123,
        scrollTo,
      },
    },
    scrollTo,
    scrollNative,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  handlers.keyboardDidShow = [];
  handlers.keyboardDidHide = [];
  keyboardSpy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: () => void) => {
    handlers[event]?.push(handler);
    return { remove: jest.fn() };
  }) as never);
  mockMeasureLayout();
  rafSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(((callback: () => void) => {
    callback();
    return 0;
  }) as never);
});

afterEach(() => {
  keyboardSpy.mockRestore();
  if (hadMeasureLayout) {
    (UIManager as unknown as Record<string, unknown>).measureLayout = originalMeasureLayout;
  } else {
    delete (UIManager as unknown as Record<string, unknown>).measureLayout;
  }
  rafSpy.mockRestore();
});

describeNative('KB-05 scroll al campo enfocado en modales', () => {
  const OLD_OS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: OLD_OS, configurable: true });
  });

  it('usa el responder nativo del ScrollView (Fabric) al abrirse el teclado', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    focusedField(456);
    const { ref, scrollNative, scrollTo } = responderRef();
    renderHook(() => useScrollToFocusedInput(ref as never));
    fireKeyboardShow();
    expect(scrollNative).toHaveBeenCalledWith(456, FOCUSED_FIELD_TOP_OFFSET, true);
    expect(measureMock).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('recurre a measureLayout si no hay responder nativo', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    focusedField(456);
    const scrollTo = jest.fn();
    const ref = {
      current: {
        getScrollResponder: () => null,
        getInnerViewNode: () => 123,
        scrollTo,
      },
    };
    renderHook(() => useScrollToFocusedInput(ref as never));
    fireKeyboardShow();
    expect(measureMock).toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ y: 500 - FOCUSED_FIELD_TOP_OFFSET, animated: true });
  });

  it('no desplaza si no hay campo enfocado', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    focusedField(null);
    const { ref, scrollNative } = responderRef();
    renderHook(() => useScrollToFocusedInput(ref as never));
    fireKeyboardShow();
    expect(scrollNative).not.toHaveBeenCalled();
    expect(measureMock).not.toHaveBeenCalled();
  });

  it('en web no suscribe eventos de teclado', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const ref = { current: null };
    renderHook(() => useScrollToFocusedInput(ref as never));
    expect(keyboardSpy).not.toHaveBeenCalled();
  });
});
