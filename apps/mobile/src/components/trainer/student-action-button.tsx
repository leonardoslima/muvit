import { ClipboardList, Dumbbell, Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { colors } from '../../lib/design-system/tokens';
import { Button } from '../ui/v2/button';

export type StudentActionKind = 'history' | 'assessment' | 'workouts' | 'workout';

export type StudentActionButtonProps = {
  label: string;
  kind: StudentActionKind;
  onPress: () => void;
};

export function StudentActionButton({ label, kind, onPress }: StudentActionButtonProps) {
  const creation = kind === 'assessment' || kind === 'workout';
  const Icon = kind === 'history' ? ClipboardList : kind === 'workouts' ? Dumbbell : Plus;

  return (
    <Button
      className={`min-w-[130px] flex-1 px-3 ${creation ? 'bg-v2-text border-v2-text' : ''}`}
      compact
      label={label}
      labelClassName="text-[14px] leading-[19.6px]"
      leading={
        <View
          accessible={false}
          className={`h-6 w-6 items-center justify-center rounded-full ${creation ? 'bg-v2-primary' : 'bg-v2-subtle'}`}
          testID={`student-action-icon-${kind}`}
        >
          <Icon accessible={false} color={creation ? colors.text : colors.brand} size={16} />
        </View>
      }
      onPress={onPress}
      testID={`student-action-${kind}`}
      variant={creation ? 'immersive' : 'secondary'}
    />
  );
}
