import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  it('renders title, optional subtitle and action slot', () => {
    render(
      <TopBar title="Alunos" subtitle="ativos" actions={<button type="button">Novo</button>} />,
    );

    expect(screen.getByRole('heading', { name: 'Alunos' })).toBeInTheDocument();
    expect(screen.getByText('ativos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument();
  });

  it('omits optional subtitle and actions', () => {
    render(<TopBar title="Dashboard" />);

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByText('ativos')).not.toBeInTheDocument();
  });
});
