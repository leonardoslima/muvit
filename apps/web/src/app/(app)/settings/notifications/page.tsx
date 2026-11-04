import { configureServerClient } from '@/lib/api-client';
import { getTrainerNotificationPreferences } from '@/lib/api/sdk.gen';
import { NotificationForm } from './_notification-form';

export default async function NotificationsPage() {
  const client = await configureServerClient();
  const response = await getTrainerNotificationPreferences({ client });

  if (response.error || !response.data) {
    return (
      <p role="alert" className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive">
        Não foi possível carregar suas preferências de notificação.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Notificações</h1>
        <p className="mt-2 text-sm text-muted-foreground">Defina quais alertas deseja receber.</p>
      </header>
      <NotificationForm preferences={response.data} />
    </div>
  );
}
