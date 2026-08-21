import { Card } from '@/components/ui/card';
import type { GetStudentReportResponse } from '@/lib/api/types.gen';
import { Images } from 'lucide-react';
import Image from 'next/image';

type BeforeAfterData = GetStudentReportResponse['beforeAfter'];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`));
}

export function BeforeAfter({ data, studentName }: { data: BeforeAfterData; studentName: string }) {
  const before = data.before;
  const after = data.after;
  const comparison =
    data.hasEnoughData && before?.photoUrl && after?.photoUrl
      ? {
          before: { date: before.date, photoUrl: before.photoUrl },
          after: { date: after.date, photoUrl: after.photoUrl },
        }
      : null;

  return (
    <Card className="gap-4">
      <div className="flex items-center gap-2.5">
        <Images className="size-5 text-primary" />
        <h3 className="font-display text-base font-semibold">Comparação antes e depois</h3>
      </div>
      {!comparison ? (
        <p className="text-sm text-muted-foreground">Ainda não há duas fotos para comparação.</p>
      ) : (
        <fieldset
          aria-label={`Comparação de fotos de ${studentName}`}
          className="grid gap-5 sm:grid-cols-2"
        >
          <figure className="flex flex-col gap-2">
            <Image
              src={comparison.before.photoUrl}
              alt={`Foto inicial de ${studentName} em ${formatDate(comparison.before.date)}`}
              width={640}
              height={420}
              unoptimized
              className="aspect-[4/3] w-full rounded-lg bg-muted object-cover"
            />
            <figcaption className="text-xs text-muted-foreground">
              Início · {formatDate(comparison.before.date)}
            </figcaption>
          </figure>
          <figure className="flex flex-col gap-2">
            <Image
              src={comparison.after.photoUrl}
              alt={`Foto final de ${studentName} em ${formatDate(comparison.after.date)}`}
              width={640}
              height={420}
              unoptimized
              className="aspect-[4/3] w-full rounded-lg bg-muted object-cover"
            />
            <figcaption className="text-xs text-muted-foreground">
              Final · {formatDate(comparison.after.date)}
            </figcaption>
          </figure>
        </fieldset>
      )}
    </Card>
  );
}
