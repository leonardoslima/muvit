import { configureServerClient } from '@/lib/api-client';
import { getTrainerProfile } from '@/lib/api/sdk.gen';
import { ProfileForm } from './_profile-form';

export default async function ProfilePage() {
  const client = await configureServerClient();
  const response = await getTrainerProfile({ client });

  if (response.error || !response.data) {
    return (
      <p role="alert" className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive">
        Não foi possível carregar seu perfil.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Meu perfil</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Atualize os dados que aparecem para seus alunos.
        </p>
      </header>
      <ProfileForm profile={response.data} />
    </div>
  );
}
