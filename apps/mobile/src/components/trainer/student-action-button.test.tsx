import { fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { StudentActionButton } from './student-action-button';

describe('StudentActionButton', () => {
  it('mantém os quatro acessos compactos tocáveis e os ícones decorativos', () => {
    const actions = [
      { kind: 'history', label: 'Ver histórico', onPress: vi.fn() },
      { kind: 'assessment', label: 'Nova avaliação', onPress: vi.fn() },
      { kind: 'workouts', label: 'Ver treinos', onPress: vi.fn() },
      { kind: 'workout', label: 'Novo treino', onPress: vi.fn() },
    ] as const;

    render(
      <View>
        {actions.map((action) => (
          <StudentActionButton key={action.kind} {...action} />
        ))}
      </View>,
    );

    expect(screen.getAllByRole('button')).toHaveLength(4);
    for (const action of actions) {
      const button = screen.getByRole('button', { name: action.label });
      const icon = screen.getByTestId(`student-action-icon-${action.kind}`);

      expect(button.props.className).toContain('min-h-[52px]');
      expect(button.props.className).toContain('flex-1');
      expect(screen.getByText(action.label).props.className).toContain('text-[14px]');
      expect(screen.getByText(action.label).props.numberOfLines).toBeUndefined();
      expect(icon.props.accessibilityLabel).toBeUndefined();
      fireEvent.press(button);
      expect(action.onPress).toHaveBeenCalledOnce();
    }
  });

  it('permite labels extensos quebrarem sem truncamento', () => {
    const label = 'Consultar todo o histórico de avaliações do aluno';

    render(<StudentActionButton kind="history" label={label} onPress={() => undefined} />);

    expect(screen.getByRole('button', { name: label })).toBeTruthy();
    expect(screen.getByText(label).props.numberOfLines).toBeUndefined();
  });

  it('usa o verde profundo e texto claro nas ações de criação', () => {
    render(
      <StudentActionButton kind="assessment" label="Nova avaliação" onPress={() => undefined} />,
    );

    expect(screen.getByTestId('student-action-assessment').props.className).toContain('bg-v2-text');
    expect(screen.getByText('Nova avaliação').props.className).toContain('text-v2-sessionText');
  });
});
