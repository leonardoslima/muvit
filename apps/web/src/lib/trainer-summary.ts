import { getTrainerSummary } from '@/lib/api/sdk.gen';
import type { GetTrainerSummaryResponse } from '@/lib/api/types.gen';
import type { Client } from './api/client/types.gen';

export type TrainerSummaryState =
  | { status: 'ready'; data: GetTrainerSummaryResponse }
  | { status: 'error'; message: string };

export async function loadTrainerSummary(client: Client): Promise<TrainerSummaryState> {
  try {
    const response = await getTrainerSummary({ client });

    if (response.error || !response.data) {
      return buildTrainerSummaryError();
    }

    return { status: 'ready', data: response.data };
  } catch {
    return buildTrainerSummaryError();
  }
}

function buildTrainerSummaryError(): TrainerSummaryState {
  return {
    status: 'error',
    message: 'Não foi possível carregar os indicadores.',
  };
}
