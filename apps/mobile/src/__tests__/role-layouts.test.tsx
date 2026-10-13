import { render, screen } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import StudentLayout from '../../app/(student)/_layout';
import TrainerLayout from '../../app/(trainer)/_layout';

vi.mock('expo-router', () => ({
  Stack: ({ children }: { children?: ReactNode }) =>
    React.createElement('Stack', { testID: 'stack' }, children),
}));

vi.mock('../components/queue-drain', () => ({
  QueueDrain: () => React.createElement('Text', null, 'queue-drain'),
}));

describe('boundaries estruturais de role', () => {
  it('monta o efeito privado e a Stack do aluno', () => {
    render(<StudentLayout />);

    expect(screen.getByText('queue-drain')).toBeTruthy();
    expect(screen.getByTestId('stack')).toBeTruthy();
  });

  it('monta somente a Stack no layout trainer', () => {
    render(<TrainerLayout />);

    expect(screen.getByTestId('stack')).toBeTruthy();
    expect(screen.queryByText('queue-drain')).toBeNull();
  });
});
