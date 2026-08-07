import type { StudentReport } from '@muvit/validators';

export function buildReportSummary(report: StudentReport): string {
  const sections = [
    report.physicalEvolution,
    report.beforeAfter,
    report.workoutAdherence,
    report.trainingFrequency,
    report.topExercises,
    report.rpeTrend,
  ];
  if (!sections.some((section) => section.hasEnoughData)) {
    return 'Ainda não há dados suficientes.';
  }

  const adherence = report.workoutAdherence;
  if (adherence.hasEnoughData) {
    return `${report.student.name} concluiu ${adherence.completed} de ${adherence.planned} treinos no período.`;
  }

  return `O relatório de ${report.student.name} apresenta dados do período.`;
}
