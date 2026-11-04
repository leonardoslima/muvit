import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkoutsLayout from './layout';
import WorkoutsLoading from './loading';

describe('WorkoutsLoading', () => {
  it('preserva a superfície full-height e representa os dois painéis do construtor', () => {
    const { container } = render(
      <WorkoutsLayout>
        <WorkoutsLoading />
      </WorkoutsLayout>,
    );

    expect(container.querySelector('[data-app-content="full-height"]')).toBeInTheDocument();
    const loading = screen.getByRole('main', { name: 'Carregando construtor de treino' });
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading).toHaveClass('min-h-0', 'flex-1', 'overflow-hidden');
    expect(withinLoading(loading, 'Detalhes do treino')).toBeInTheDocument();
    expect(withinLoading(loading, 'Editor do treino')).toBeInTheDocument();
    expect(loading.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(12);
  });
});

function withinLoading(container: HTMLElement, label: string): HTMLElement | null {
  return container.querySelector(`[aria-label="${label}"]`);
}
