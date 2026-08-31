import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';

export type TrainerSectionScreenProps = {
  title: string;
  subtitle: string;
  stateTitle: string;
  stateDescription: string;
};

export function TrainerSectionScreen({
  stateDescription,
  stateTitle,
  subtitle,
  title,
}: TrainerSectionScreenProps) {
  return (
    <Screen scroll>
      <ScreenHeader subtitle={subtitle} title={title} />
      <StatePanel description={stateDescription} title={stateTitle} tone="empty" />
    </Screen>
  );
}
