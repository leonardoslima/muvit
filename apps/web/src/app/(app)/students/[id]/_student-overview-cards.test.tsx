import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActiveWorkoutCard } from './_active-workout-card';
import { LatestAssessmentCard } from './_latest-assessment-card';
import { PersonalInfoCard } from './_personal-info-card';

const student = {
  email: 'ana@example.com',
  phone: '+55 11 90000-0000',
  gender: 'female' as const,
  goals: 'Ganhar massa muscular.',
  restrictions: 'Evitar impacto alto no joelho direito.',
  isIndependent: false,
};

const workoutPlan = {
  id: 'workout-1',
  name: 'Hipertrofia A/B',
  startDate: '2026-06-01',
  endDate: null,
  status: 'active' as const,
};

const assessment = {
  id: 'assessment-1',
  date: '2026-06-20',
  weightKg: '72.5',
  heightCm: '170',
  bodyFatPct: '18.2',
  measurements: {
    waist: 68,
    hip: 96,
    armRight: 28,
    thighRight: 54,
  },
  notes: 'Evoluindo bem',
};

describe('cards da visao geral do estudante', () => {
  it('renderiza as informacoes pessoais e as restricoes', () => {
    render(<PersonalInfoCard student={student} />);

    expect(screen.getByRole('heading', { name: /Informa.*es pessoais/ })).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Evitar impacto alto no joelho direito.')).toBeInTheDocument();
  });

  it('renderiza o treino ativo e suas acoes', () => {
    render(
      <ActiveWorkoutCard
        studentId="student-1"
        activeWorkoutPlan={workoutPlan}
        loadFailed={false}
      />,
    );

    expect(screen.getByRole('heading', { name: /Treino ativo/ })).toBeInTheDocument();
    expect(screen.getByText(/Treino A/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver treino completo/i })).toHaveAttribute(
      'href',
      '/workouts/workout-1',
    );
  });

  it('renderiza a ultima avaliacao com medidas, grafico e acoes', () => {
    render(
      <LatestAssessmentCard
        studentId="student-1"
        latestAssessment={assessment}
        weightChartPoints={[{ date: '2026-06-20', label: 'jun', weight: 72.5 }]}
        loadFailed={false}
      />,
    );

    expect(screen.getByRole('heading', { name: /ltima avalia/ })).toBeInTheDocument();
    expect(screen.getByText('68 cm')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Evolu.*o de peso/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver hist.rico/ })).toHaveAttribute(
      'href',
      '/students/student-1/assessments',
    );
  });
});
