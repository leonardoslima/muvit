import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { Text } from '../ui/v2/text';

export type TrainerMetricCardProps = {
  label: string;
  value: number;
  description?: string;
};

export function TrainerMetricCard({ description, label, value }: TrainerMetricCardProps) {
  const [width, setWidth] = useState<number>();
  const handleLayout = (event: LayoutChangeEvent): void => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      className="min-w-[128px] flex-1 gap-2 rounded-v2-card bg-v2-subtle p-4"
      onLayout={handleLayout}
    >
      <Text
        className={`font-v2-bold text-v2-brand ${width !== undefined && width < 160 ? 'text-[26px] leading-[32px]' : 'text-[30px] leading-[36px]'}`}
      >
        {value}
      </Text>
      <Text className="text-v2-secondary" variant="label">
        {label}
      </Text>
      {description ? <Text className="text-v2-secondary">{description}</Text> : null}
    </View>
  );
}
