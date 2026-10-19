import { Upload, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, type LayoutChangeEvent, Pressable, View } from 'react-native';
import { colors, controlSizes, radii, spacing } from '../../lib/design-system/tokens';
import { Button } from '../ui/v2/button';
import { Text } from '../ui/v2/text';

export type AssessmentPhotoGridProps = {
  photos: readonly { uri: string }[];
  disabled?: boolean;
  onOpen?: (index: number) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  maxPhotos?: number;
  columnInset?: number;
  addLabel?: string;
  emptyHint?: string;
  description?: string;
  testID?: string;
};

const PHOTO_ASPECT_RATIO = 1;
const PHOTO_GRID_GAP = spacing.md;
const FALLBACK_COLUMN_WIDTH = '47%' as const;

function photoKey(uri: string, position: number): string {
  return `${uri}-${position}`;
}

export function AssessmentPhotoGrid({
  photos,
  disabled = false,
  onOpen,
  onAdd,
  onRemove,
  maxPhotos,
  columnInset = 0,
  addLabel = 'Adicionar foto',
  emptyHint,
  description,
  testID = 'assessment-photo-grid',
}: AssessmentPhotoGridProps): React.JSX.Element {
  const [columnWidth, setColumnWidth] = useState<number>();
  const columnStyle = { width: columnWidth ?? FALLBACK_COLUMN_WIDTH };
  const canAddPhoto = onAdd !== undefined && (maxPhotos === undefined || photos.length < maxPhotos);

  function handleGridLayout(event: LayoutChangeEvent): void {
    const width = event.nativeEvent.layout.width;
    const availableWidth = width - PHOTO_GRID_GAP;
    if (!Number.isFinite(width) || availableWidth <= 0) return;

    const nextColumnWidth = Math.max(0, availableWidth / 2 - columnInset);
    setColumnWidth((current) => (current === nextColumnWidth ? current : nextColumnWidth));
  }

  function openPhoto(index: number): void {
    if (disabled) return;
    onOpen?.(index);
  }

  function addPhoto(): void {
    if (disabled || !canAddPhoto) return;
    onAdd?.();
  }

  function removePhoto(index: number): void {
    if (disabled) return;
    onRemove?.(index);
  }

  return (
    <View className="gap-3">
      <View
        className="flex-row flex-wrap"
        onLayout={handleGridLayout}
        style={{ gap: PHOTO_GRID_GAP }}
        testID={testID}
      >
        {photos.map((photo, index) => {
          const key = photoKey(photo.uri, index);

          return (
            <View className="gap-2" key={key} style={columnStyle}>
              <View className="relative">
                <Image
                  accessible={onOpen === undefined}
                  accessibilityLabel={`Prévia da foto ${index + 1}`}
                  resizeMode="contain"
                  source={{ uri: photo.uri }}
                  style={{
                    aspectRatio: PHOTO_ASPECT_RATIO,
                    backgroundColor: colors.subtle,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radii.field,
                    width: '100%',
                  }}
                />
                {onOpen ? (
                  <Pressable
                    accessible
                    accessibilityLabel={`Abrir foto ${index + 1}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    aria-disabled={disabled}
                    disabled={disabled}
                    onPress={() => openPhoto(index)}
                    style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
                  />
                ) : null}
                {onRemove ? (
                  <Pressable
                    accessible
                    accessibilityLabel={`Remover foto ${index + 1}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    aria-disabled={disabled}
                    className="absolute right-0 top-0 h-12 w-12 items-center justify-center"
                    disabled={disabled}
                    onPress={() => removePhoto(index)}
                    style={{ height: controlSizes.touch, width: controlSizes.touch }}
                  >
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: disabled ? colors.disabled : colors.brand }}
                    >
                      <X color={disabled ? colors.brand : colors.surface} size={16} />
                    </View>
                  </Pressable>
                ) : null}
              </View>
              <Text variant="caption">Foto {index + 1}</Text>
            </View>
          );
        })}
      </View>
      {canAddPhoto ? (
        <View className="gap-2">
          <Button
            compact
            variant="secondary"
            disabled={disabled}
            label={addLabel}
            leading={<Upload color={colors.brand} size={22} />}
            onPress={addPhoto}
          />
          {emptyHint ? (
            <Text className="text-v2-secondary" variant="support">
              {emptyHint}
            </Text>
          ) : null}
        </View>
      ) : null}
      {description ? (
        <Text className="text-v2-secondary" variant="support">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
