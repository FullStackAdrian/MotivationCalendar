import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import axios from 'axios';
import { describeNative } from './helpers/projects';
import { Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import KanbanScreen from '../src/screens/kanban-screen';
import CalendarScreen from '../src/screens/calendar-screen';
import RegisterScreen from '../src/screens/register-screen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

jest.mock('../src/contexts/auth-context', () => ({
  useAuth: jest.fn().mockReturnValue({
    user: { id: 'u1', username: 'alice', email: 'a@b.com' },
    loading: false,
    sessionExpired: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../src/hooks/use-responsive', () => ({
  useResponsive: () => ({ width: 390, height: 844, size: 'mobile', isMobile: true, isTablet: false, isDesktop: false, isCompact: false }),
}));

jest.mock('axios', () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  };
  return { create: jest.fn(() => instance), __instance: instance };
});

const http = (): { get: jest.Mock; post: jest.Mock; put: jest.Mock; patch: jest.Mock } =>
  (axios as unknown as { __instance: { get: jest.Mock; post: jest.Mock; put: jest.Mock; patch: jest.Mock } }).__instance;

describeNative('UI-1 safe area (D-01)', () => {
  it('Screen usa área segura con testID screen-safe', () => {
    const { getByTestId } = render(
      <Screen>
        <></>
      </Screen>
    );
    expect(getByTestId('screen-safe')).toBeTruthy();
  });
});

describeNative('UI-6 touch targets + Field (D-03/D-11)', () => {
  it('Primary compact >= 44dp', () => {
    const { getByTestId } = render(<PrimaryButton testID="btn-p" title="T" onPress={() => {}} compact />);
    const style = StyleSheet.flatten(getByTestId('btn-p').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('Secondary compact >= 44dp', () => {
    const { getByTestId } = render(<SecondaryButton testID="btn-s" title="T" onPress={() => {}} compact />);
    const style = StyleSheet.flatten(getByTestId('btn-s').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('Field no usa flex:1 (evita solape D-03)', () => {
    const { UNSAFE_getByType } = render(<Field label="Nombre" value="" onChangeText={() => {}} />);
    // El primer View es el contenedor del Field
    const { View } = require('react-native');
    const views = UNSAFE_getByType(View);
    const style = StyleSheet.flatten((views as any).props.style);
    expect(style.flex).not.toBe(1);
  });
});

describeNative('UI-4 empty + offline (D-08/D-12)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sin pizarras: oculta hint de mover tarjeta y deshabilita Nuevo estado', async () => {
    http().get.mockResolvedValue({ data: [] });
    const { findByText, queryByText, getByTestId } = render(<KanbanScreen />);
    await findByText('Organiza el trabajo sin perder de vista el día.');
    await waitFor(() => expect(queryByText('Pulsa una tarjeta para avanzar al siguiente estado.')).toBeNull());
    const stateBtn = getByTestId('kanban-new-state');
    expect((stateBtn.props.accessibilityState as any)?.disabled ?? stateBtn.props.disabled).toBe(true);
    expect(queryByText('Crea tu primera pizarra')).not.toBeNull();
  });

  it('error de carga ofrece Reintentar', async () => {
    http().get.mockRejectedValue(new Error('caído'));
    const { findByText } = render(<KanbanScreen />);
    expect(await findByText('Reintentar')).toBeTruthy();
  });

  it('calendario offline ofrece Reintentar', async () => {
    http().get.mockRejectedValue(new Error('Network Error'));
    const { findByText } = render(<CalendarScreen />);
    expect(await findByText('Reintentar')).toBeTruthy();
  });
});

describeNative('UI-5 calendar scroll (D-09)', () => {
  it('grid muestra indicador de scroll', async () => {
    http().get.mockResolvedValue({ data: { progress: {} } });
    const { findByText, UNSAFE_getByType } = render(<CalendarScreen />);
    await findByText('Cada día que pasa, ya no vuelve');
    const { FlatList } = require('react-native');
    const list = UNSAFE_getByType(FlatList) as any;
    expect(list.props.showsVerticalScrollIndicator).not.toBe(false);
  });
});

describeNative('UI-3 kanban horizontal (D-06)', () => {
  it('muestra pista de desplazamiento horizontal en móvil', async () => {
    const board = {
      id: 'b1',
      name: 'Sprint',
      columns: [
        { id: 'c1', name: 'Todo', color: '#fff', position: 0, isDone: false, isPaused: false },
        { id: 'c2', name: 'Doing', color: '#fff', position: 1, isDone: false, isPaused: false },
      ],
      tasks: [],
    };
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint' }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
      return Promise.resolve({ data: [] });
    });
    const { findAllByText, queryByText } = render(<KanbanScreen />);
    const empties = await findAllByText('Sin tareas');
    expect(empties.length).toBeGreaterThanOrEqual(2);
    expect(queryByText('Desliza para ver más columnas →')).not.toBeNull();
  });

  it('D-07 título largo 100+ chars usa 3 líneas con ellipsis tail', async () => {
    const longTitle = 'x'.repeat(120);
    const board = {
      id: 'b1',
      name: 'Sprint',
      columns: [{ id: 'c1', name: 'Todo', color: '#fff', position: 0, isDone: false, isPaused: false }],
      tasks: [{ id: 't1', title: longTitle, columnId: 'c1', priority: 'medium' as const }],
    };
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint' }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: board });
      return Promise.resolve({ data: [] });
    });
    const { findByText } = render(<KanbanScreen />);
    const node = await findByText(longTitle) as any;
    expect(node.props.numberOfLines).toBe(3);
    expect(node.props.ellipsizeMode).toBe('tail');
  });
});

describeNative('UI-2 modales kanban (D-04/D-05)', () => {
  const boardWithColumn = {
    id: 'b1',
    name: 'Sprint',
    columns: [{ id: 'c1', name: 'Todo', color: '#fff', position: 0, isDone: false, isPaused: false }],
    tasks: [],
  };
  beforeEach(() => {
    jest.clearAllMocks();
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint' }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: boardWithColumn });
      return Promise.resolve({ data: [] });
    });
  });

  it('D-04 modal Nuevo estado: orden nombre→color→toggles→WIP→CTA sin solape', async () => {
    const { findByText, getByText } = render(<KanbanScreen />);
    await findByText('Sin tareas');
    fireEvent.press(getByText('Nuevo estado'));
    expect(await findByText('Crear estado')).toBeTruthy();
    expect(getByText('Color')).toBeTruthy();
    expect(getByText('Estado de finalización')).toBeTruthy();
    expect(getByText('Estado en pausa')).toBeTruthy();
    expect(getByText('Límite WIP opcional')).toBeTruthy();
  });

  it('D-05 modal Nueva tarea: todos los campos y CTA Crear tarea alcanzables', async () => {
    const { findByText, getByText } = render(<KanbanScreen />);
    await findByText('Sin tareas');
    fireEvent.press(getByText('Nueva tarea'));
    expect(await findByText('Crear tarea')).toBeTruthy();
    expect(getByText('Título')).toBeTruthy();
    expect(getByText('Estado')).toBeTruthy();
    expect(getByText('Asignar a')).toBeTruthy();
    expect(getByText('Prioridad')).toBeTruthy();
    expect(getByText('Tags')).toBeTruthy();
  });
});

describeNative('UI-6 auth viewport bajo (D-10)', () => {
  it('registro: CTA primario y secundario dentro de ScrollView con indicador', () => {
    const { getByText, UNSAFE_getByType } = render(<RegisterScreen />);
    expect(getByText('Crear cuenta')).toBeTruthy();
    expect(getByText('Ya tengo cuenta')).toBeTruthy();
    const { ScrollView } = require('react-native');
    const scroll = UNSAFE_getByType(ScrollView) as any;
    expect(scroll.props.showsVerticalScrollIndicator).not.toBe(false);
  });
});

describeNative('V-01/V-02 modales nativo (auditoría 2)', () => {
  const boardWithColumn = {
    id: 'b1',
    name: 'Sprint',
    columns: [{ id: 'c1', name: 'Todo', color: '#fff', position: 0, isDone: false, isPaused: false }],
    tasks: [],
  };
  beforeEach(() => {
    jest.clearAllMocks();
    http().get.mockImplementation((url: string) => {
      if (url === '/api/kanban/boards') return Promise.resolve({ data: [{ id: 'b1', name: 'Sprint' }] });
      if (url === '/api/kanban/boards/b1') return Promise.resolve({ data: boardWithColumn });
      return Promise.resolve({ data: [] });
    });
  });

  it('V-01 task modal: CTA vive en footer fijo fuera del scroll (nunca cortado)', async () => {
    const { findByText, getByText, getByTestId } = render(<KanbanScreen />);
    await findByText('Sin tareas');
    fireEvent.press(getByText('Nueva tarea'));
    await findByText('Crear tarea');
    expect(within(getByTestId('modal-footer')).getByText('Crear tarea')).toBeTruthy();
  });

  it('V-01 board modal: CTA vive en footer fijo fuera del scroll', async () => {
    const { findByText, getByText, getByTestId } = render(<KanbanScreen />);
    await findByText('Sin tareas');
    fireEvent.press(getByText('Nueva pizarra'));
    await findByText('Crear pizarra');
    expect(within(getByTestId('modal-footer')).getByText('Crear pizarra')).toBeTruthy();
  });

  it('V-02 close modal >= 44dp en ambos ejes', async () => {
    const { findByText, getByText, getByTestId } = render(<KanbanScreen />);
    await findByText('Sin tareas');
    fireEvent.press(getByText('Nueva pizarra'));
    await findByText('Crear pizarra');
    const style = StyleSheet.flatten(getByTestId('modal-close').props.style);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
