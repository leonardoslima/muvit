import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkoutsLayout from './layout';

describe('WorkoutsLayout', () => {
  it('compõe a rota em uma superfície full-height', () => {
    render(<WorkoutsLayout>Construtor de treinos</WorkoutsLayout>);

    expect(screen.getByText('Construtor de treinos')).toHaveAttribute(
      'data-app-content',
      'full-height',
    );
  });
});
