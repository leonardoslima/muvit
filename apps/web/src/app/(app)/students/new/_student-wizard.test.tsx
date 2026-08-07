import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentWizard } from './_student-wizard';

describe('StudentWizard', () => {
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

  it('cria o aluno uma única vez na segunda etapa e oferece os próximos links exatos', async () => {
    const action = vi.fn().mockResolvedValue({ studentId: 'student-42' });
    render(<StudentWizard action={action} />);

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Costa' } });
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'maria@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(screen.getByLabelText('Objetivo principal'), {
      target: { value: 'Hipertrofia; nível intermediário' },
    });
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

  it('mantém a segunda etapa quando a API rejeita a criação', async () => {
    const action = vi.fn().mockResolvedValue({ error: 'Limite de alunos ativos atingido.' });
    render(<StudentWizard action={action} />);

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Costa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(screen.getByLabelText('Objetivo principal'), {
      target: { value: 'Hipertrofia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar aluno' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Limite de alunos ativos atingido.');
    expect(screen.getByRole('heading', { name: 'Objetivos e restrições' })).toBeInTheDocument();
  });

  it('retorna ao campo básico rejeitado pela API e move o foco', async () => {
    const action = vi.fn().mockResolvedValue({ fieldErrors: { name: 'Informe o nome.' } });
    render(<StudentWizard action={action} />);

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Costa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.change(screen.getByLabelText('Objetivo principal'), {
      target: { value: 'Hipertrofia' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar aluno' }));

    const name = await screen.findByLabelText('Nome completo');
    await waitFor(() => expect(name).toHaveFocus());
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });
});
