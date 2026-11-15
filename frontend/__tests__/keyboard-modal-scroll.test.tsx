import { renderHook } from '@testing-library/react-native';
import { Keyboard, Platform, TextInput, UIManager } from 'react-native';
import { useScrollToFocusedInput, FOCUSED_FIELD_TOP_OFFSET } from '../src/hooks/use-scroll-to-focused-input';
import { describeNative } from './helpers/projects';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

const handlers: Record<string, Array<() => void>> = { keyboardDidShow: [], keyboardDidHide: [] };
let keyboardSpy: jest.SpyInstance;
let measureMock: jest.Mock;
let rafSpy: jest.SpyInstance;
let hadMeasureLayout: boolean;
let originalMeasureLayout: unknown;

function fireKeyboardShow(): void {
  for (const handler of handlers.keyboardDidShow) handler();
}

beforeEach(() => {
  jest.clearAllMocks();
  handlers.keyboardDidShow = [];
  handlers.keyboardDidHide = [];
  keyboardSpy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: () => void) => {
    handlers[event]?.push(handler);
    return { remove: jest.fn() };
  }) as never);
  measureMock = jest.fn(((
    _node: number,
    _ancestor: number,
    _onFail: () => void,
    onSuccess: (x: number, y: number, width: number, height: number) => void
  ) => {
    onSuccess(10, 500, 100, 40);
  }) as never);
  hadMeasureLayout = 'measureLayout' in (UIManager as unknown as Record<string, unknown>);
  originalMeasureLayout = (UIManager as unknown as Record<string, unknown>).measureLayout;
  (UIManager as unknown as Record<string, unknown>).measureLayout = measureMock;
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

function focusedField(handle: number | null): void {
  const state = TextInput.State as unknown as { currentlyFocusedField?: () => number | null };
  Object.defineProperty(state, 'currentlyFocusedField', { value: () => handle, configurable: true });
}

describeNative('KB-05 scroll al campo enfocado en modales', () => {
  const OLD_OS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: OLD_OS, configurable: true });
  });

  it('desplaza el ScrollView hasta el campo enfocado al abrirse el teclado', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    focusedField(456);
    const scrollTo = jest.fn();
    const ref = { current: { scrollTo, getInnerViewNode: () => 123 } };
    renderHook(() => useScrollToFocusedInput(ref));
    fireKeyboardShow();
    expect(measureMock).toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ y: 500 - FOCUSED_FIELD_TOP_OFFSET, animated: true });
  });

  it('no desplaza si no hay campo enfocado', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    focusedField(null);
    const scrollTo = jest.fn();
    const ref = { current: { scrollTo, getInnerViewNode: () => 123 } };
    renderHook(() => useScrollToFocusedInput(ref));
    fireKeyboardShow();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('en web no suscribe eventos de teclado', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const ref = { current: null };
    renderHook(() => useScrollToFocusedInput(ref));
    expect(keyboardSpy).not.toHaveBeenCalled();
  });
});
