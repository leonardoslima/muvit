import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { Text } from '../ui/v2/text';

export type AssessmentHeadingProps = {
  title: string;
  subtitle?: string;
};

export function AssessmentHeading({ title, subtitle }: AssessmentHeadingProps): React.JSX.Element {
  const [availableWidth, setAvailableWidth] = useState<number>();
  const titleClassName =
    availableWidth !== undefined && availableWidth <= 320
      ? 'text-[26px] leading-[31.2px]'
      : 'text-[30px] leading-[36px]';

  const handleLayout = (event: LayoutChangeEvent): void => {
    setAvailableWidth(event.nativeEvent.layout.width);
  };

  return (
    <View className="gap-1" onLayout={handleLayout} testID="assessment-heading">
      <Text accessibilityRole="header" className={titleClassName} variant="screenTitle">
        {title}
      </Text>
      {subtitle ? <Text className="text-v2-secondary">{subtitle}</Text> : null}
    </View>
  );
}
