import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReportsError from './error';
import ReportsLoading from './loading';

describe('estados de rota de relatórios', () => {
  it('anuncia o carregamento remoto', () => {
    render(<ReportsLoading />);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando relatório');
  });

  it('oferece recuperação acessível para uma falha inesperada', () => {
    let retried = false;
    render(
      <ReportsError
        error={new Error('detalhe interno')}
        reset={() => {
          retried = true;
        }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Ocorreu um erro ao abrir os relatórios.');
    expect(screen.queryByText('detalhe interno')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retried).toBe(true);
  });
});
