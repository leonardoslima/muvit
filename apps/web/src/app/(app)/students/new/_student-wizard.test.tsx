import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentWizard } from './_student-wizard';

describe('StudentWizard', () => {
  function reachGoalsStep() {
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Costa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  }

  it('anuncia as etapas e mantém os dados ao voltar pelo teclado', () => {
    render(<StudentWizard action={vi.fn()} />);

    expect(screen.getByRole('navigation', { name: 'Progresso do cadastro' })).toHaveTextContent(
      'Etapa 1 de 3',
    );
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Costa' } });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Continuar' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.getByLabelText('Nome completo')).toHaveValue('Maria Costa');
  });

  it('expõe o erro por campo, anuncia e move o foco', () => {
    render(<StudentWizard action={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const name = screen.getByLabelText('Nome completo');
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome.');
  });

  it('foca o e-mail quando o nome é válido e o e-mail é o primeiro erro real', () => {
    render(<StudentWizard action={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Costa' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'email inválido' } });

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('move o foco para a frequência quando ela é o campo inválido', () => {
    render(<StudentWizard action={vi.fn()} />);
    reachGoalsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Hipertrofia' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar aluno' }));

    expect(screen.getByRole('button', { name: '2 dias' })).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Informe os dias de treino por semana.');
  });

  it('cria o aluno uma única vez na segunda etapa e oferece os próximos links exatos', async () => {
    const action = vi.fn().mockResolvedValue({ studentId: 'student-42' });
    render(<StudentWizard action={action} />);

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Costa' } });
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'maria@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hipertrofia' }));
    fireEvent.click(screen.getByRole('button', { name: '4 dias' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar aluno' }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Aluno cadastrado com sucesso')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar treino agora' })).toHaveAttribute(
      'href',
      '/workouts?studentId=student-42',
    );
    expect(screen.getByRole('link', { name: 'Registrar avaliação' })).toHaveAttribute(
      'href',
      '/students/student-42/assessments/new',
    );
    expect(screen.getByRole('link', { name: 'Ver perfil do aluno' })).toHaveAttribute(
      'href',
      '/students/student-42',
    );
  });

  it('rejeição inesperada vira erro recuperável e permite tentar novamente', async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ studentId: 'student-42' });
    render(<StudentWizard action={action} />);
    reachGoalsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Hipertrofia' }));
    fireEvent.click(screen.getByRole('button', { name: '4 dias' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar aluno' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível cadastrar o aluno.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Aluno cadastrado com sucesso')).toBeInTheDocument();
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('ignora segundo submit enquanto a criação está em andamento', async () => {
    let resolveAction: (value: { studentId: string }) => void = () => {};
    const action = vi.fn().mockImplementation(
      () =>
        new Promise<{ studentId: string }>((resolve) => {
          resolveAction = resolve;
        }),
    );
    render(<StudentWizard action={action} />);
    reachGoalsStep();
    fireEvent.click(screen.getByRole('button', { name: 'Hipertrofia' }));
    fireEvent.click(screen.getByRole('button', { name: '4 dias' }));
    const form = screen.getByRole('button', { name: 'Cadastrar aluno' }).closest('form');

    if (!form) throw new Error('Formulário não encontrado.');
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => resolveAction({ studentId: 'student-42' }));
    expect(await screen.findByText('Aluno cadastrado com sucesso')).toBeInTheDocument();
  });

  it('reproduz a top bar e o card central do Pencil com adaptação responsiva', () => {
    const { container } = render(<StudentWizard action={vi.fn()} />);

    expect(container.querySelector('[data-wizard-topbar]')).toHaveClass('h-18');
    expect(
      screen.getByRole('heading', { name: 'Informações básicas' }).closest('[data-slot="card"]'),
    ).toHaveClass('w-full', 'max-w-150');
    expect(container.firstElementChild).toHaveClass('min-h-dvh');
  });

  it('mantém a segunda etapa quando a API rejeita a criação', async () => {
    const action = vi.fn().mockResolvedValue({ error: 'Limite de alunos ativos atingido.' });
    render(<StudentWizard action={action} />);

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Costa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hipertrofia' }));
    fireEvent.click(screen.getByRole('button', { name: '4 dias' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar aluno' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Limite de alunos ativos atingido.');
    expect(screen.getByRole('heading', { name: 'Objetivos e restrições' })).toBeInTheDocument();
  });

  it('retorna ao campo básico rejeitado pela API e move o foco', async () => {
    const action = vi.fn().mockResolvedValue({ fieldErrors: { name: 'Informe o nome.' } });
    render(<StudentWizard action={action} />);

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Costa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hipertrofia' }));
    fireEvent.click(screen.getByRole('button', { name: '4 dias' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar aluno' }));

    const name = await screen.findByLabelText('Nome completo');
    await waitFor(() => expect(name).toHaveFocus());
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });
});
