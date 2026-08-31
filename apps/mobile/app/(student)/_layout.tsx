import { Stack } from 'expo-router';
import { PushTokenRegistration } from '../../src/components/push-token-registration';
import { QueueDrain } from '../../src/components/queue-drain';

export default function StudentLayout() {
  return (
    <>
      <QueueDrain />
      <PushTokenRegistration />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
