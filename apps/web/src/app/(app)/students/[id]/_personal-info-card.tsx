import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit3, Mail, Phone, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export type PersonalInfoStudent = {
  email: string | null;
  phone: string | null;
  gender: 'male' | 'female' | 'other' | null;
  goals: string | null;
  restrictions: string | null;
  isIndependent: boolean;
};

function formatStudentGender(gender: PersonalInfoStudent['gender']): string {
  if (gender === 'male') return 'Masculino';
  if (gender === 'female') return 'Feminino';
  if (gender === 'other') return 'Outro';
  return 'Não informado';
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-sm leading-relaxed text-foreground">{value}</span>
    </div>
  );
}

export function PersonalInfoCard({ student }: { student: PersonalInfoStudent }) {
  const studentType = student.isIndependent ? 'Independente' : 'Personal';

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <CardHeader className="flex-row items-center justify-between border-b border-border px-5 py-4">
        <CardTitle>{'Informações pessoais'}</CardTitle>
        <Edit3 className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="gap-4 px-5 py-5">
        <InfoRow
          icon={<Mail className="size-4" />}
          label="Email"
          value={student.email ?? 'Não informado'}
        />
        <InfoRow
          icon={<Phone className="size-4" />}
          label="Telefone / WhatsApp"
          value={student.phone ?? 'Não informado'}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow label="Tipo" value={studentType} />
          <InfoRow label="Gênero" value={formatStudentGender(student.gender)} />
        </div>
        <InfoRow label="Objetivos" value={student.goals ?? 'Nenhum objetivo registrado.'} />
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {'Restrições físicas'}
          </span>
          <div className="flex gap-2 rounded-lg border border-warning bg-warning-bg px-3.5 py-2.5 text-[#7A5C00]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-sm leading-relaxed">
              {student.restrictions ?? 'Nenhuma restrição registrada.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
