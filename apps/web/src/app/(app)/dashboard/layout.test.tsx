import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardLayout from './layout';

describe('DashboardLayout', () => {
  it('mantém o espaçamento padrão de uma rota de conteúdo', () => {
    render(<DashboardLayout>Resumo do dashboard</DashboardLayout>);

    expect(screen.getByText('Resumo do dashboard')).toHaveAttribute('data-app-content', 'padded');
  });
});
