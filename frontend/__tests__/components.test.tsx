import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppHeader, Badge, Field, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { Icon } from '@/components/icon';
import { describeNative } from './helpers/projects';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'android', select: (options: Record<string, unknown>) => options.android },
}));

function platformOS(): { OS: string } {
  return jest.requireMock('react-native/Libraries/Utilities/Platform').default as { OS: string };
}

describeNative('buttons', () => {
  it('renders titles with icons on either side', () => {
    const first = render(<PrimaryButton title="Kanban" onPress={() => {}} iconName="albums-outline" iconSide="left" compact />);
    expect(first.getByText('Kanban')).toBeTruthy();
    first.unmount();
    const second = render(<SecondaryButton title="Salir" onPress={() => {}} iconName="log-out-outline" iconSide="right" />);
    expect(second.getByText('Salir')).toBeTruthy();
  });

  it('fires onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<PrimaryButton title="Entrar" onPress={onPress} />);
    fireEvent.press(getByText('Entrar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SecondaryButton title="Guardar" onPress={onPress} disabled />);
    fireEvent.press(getByText('Guardar'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describeNative('form and layout primitives', () => {
  it('renders fields with label', () => {
    const { getByText, getByDisplayValue } = render(<Field label="Email" value="" onChangeText={() => {}} />);
    expect(getByText('Email')).toBeTruthy();
    expect(getByDisplayValue('')).toBeTruthy();
  });

  it('forwards text changes', () => {
    const onChangeText = jest.fn();
    const { getByDisplayValue } = render(<Field label="Email" value="" onChangeText={onChangeText} />);
    fireEvent.changeText(getByDisplayValue(''), 'a@b.com');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });

  it('renders badges, headers and dense screens', () => {
    const { getByText, queryByText } = render(
      <Screen dense>
        <AppHeader title="Calendario" subtitle="2026" />
        <Badge label="3" />
      </Screen>
    );
    expect(getByText('Calendario')).toBeTruthy();
    expect(getByText('2026')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(queryByText('inexistente')).toBeNull();
    expect(queryByText('Solo título')).toBeNull();
  });
});

describeNative('Icon', () => {
  it('renders without crashing for a known icon', () => {
    expect(() => render(<Icon name="add" />)).not.toThrow();
    expect(() => render(<Icon name="add" size={24} color="#fff" />)).not.toThrow();
  });

  it('renders inline SVG markup on the web', () => {
    const platform = platformOS();
    const previous = platform.OS;
    platform.OS = 'web';
    try {
      const { UNSAFE_root } = render(<Icon name="add" />);
      expect(UNSAFE_root).toBeTruthy();
    } finally {
      platform.OS = previous;
    }
  });
});
