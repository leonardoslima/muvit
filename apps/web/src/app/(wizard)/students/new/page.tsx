import { StudentWizard } from '@/app/(app)/students/new/_student-wizard';
import { createStudentAction } from '@/app/(app)/students/new/actions';

export default function NewStudentPage() {
  return <StudentWizard action={createStudentAction} />;
}
