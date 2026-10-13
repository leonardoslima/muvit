import { Stack } from 'expo-router';
import { QueueDrain } from '../../src/components/queue-drain';

export default function StudentLayout() {
  return (
    <>
      <QueueDrain />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
