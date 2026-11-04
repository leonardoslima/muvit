import type { QueryClient } from '@tanstack/react-query';

export async function invalidateWorkoutEvolution(
  client: Pick<QueryClient, 'invalidateQueries'>,
  ownerAuthUserId: string,
): Promise<void> {
  try {
    await client.invalidateQueries({ queryKey: ['workout-evolution', ownerAuthUserId] });
  } catch {
    // Uma falha de atualização do cache não desfaz uma operação já confirmada.
  }
}
