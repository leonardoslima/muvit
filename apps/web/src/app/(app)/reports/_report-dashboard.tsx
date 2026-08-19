import type { GetStudentReportResponse } from '@/lib/api/types.gen';
import { BeforeAfter } from './_before-after';
import { PhysicalEvolution } from './_physical-evolution';
import { ReportSummary } from './_report-summary';
import { WorkoutPerformance } from './_workout-performance';

export function ReportDashboard({ report }: { report: GetStudentReportResponse }) {
  return (
    <div className="flex flex-col gap-8">
      <PhysicalEvolution data={report.physicalEvolution} />
      <BeforeAfter data={report.beforeAfter} studentName={report.student.name} />
      <WorkoutPerformance report={report} />
      <ReportSummary summary={report.summary} />
    </div>
  );
}
