import { Upload, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, type ImageProps, type LayoutChangeEvent, Pressable, View } from 'react-native';
import { colors, controlSizes, radii, spacing } from '../../lib/design-system/tokens';
import { Text } from '../ui/v2/text';

export type AssessmentPhotoGridProps = {
  photos: readonly { uri: string }[];
  disabled?: boolean;
  onOpen?: (index: number) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  maxPhotos?: number;
  addLabel?: string;
  emptyHint?: string;
  description?: string;
  testID?: string;
  appearance?: 'student' | 'trainer';
};

const FALLBACK_ASPECT_RATIO = 1 / 2;
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
  addLabel = 'Adicionar foto',
  emptyHint,
  description,
  testID = 'assessment-photo-grid',
  appearance = 'student',
}: AssessmentPhotoGridProps): React.JSX.Element {
  const [columnWidth, setColumnWidth] = useState<number>();
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const columnStyle = { width: columnWidth ?? FALLBACK_COLUMN_WIDTH };
  const uploadStyle =
    columnWidth === undefined
      ? { ...columnStyle, aspectRatio: FALLBACK_ASPECT_RATIO }
      : { ...columnStyle, minHeight: columnWidth / FALLBACK_ASPECT_RATIO };
  const canAddPhoto = onAdd !== undefined && (maxPhotos === undefined || photos.length < maxPhotos);

  function handleGridLayout(event: LayoutChangeEvent): void {
    const width = event.nativeEvent.layout.width;
    const availableWidth = width - PHOTO_GRID_GAP;
    if (!Number.isFinite(width) || availableWidth <= 0) return;

    const nextColumnWidth = availableWidth / 2;
    setColumnWidth((current) => (current === nextColumnWidth ? current : nextColumnWidth));
  }

  function handleImageLoad(
    key: string,
    event: Parameters<NonNullable<ImageProps['onLoad']>>[0],
  ): void {
    const { width, height } = event.nativeEvent.source;
    if (
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      return;
    }

    setAspectRatios((current) => ({ ...current, [key]: width / height }));
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
          const aspectRatio = aspectRatios[key] ?? FALLBACK_ASPECT_RATIO;

          return (
            <View className="gap-2" key={key} style={columnStyle}>
              <View className="relative">
                <Image
                  accessible={onOpen === undefined}
                  accessibilityLabel={`Prévia da foto ${index + 1}`}
                  onLoad={(event) => handleImageLoad(key, event)}
                  resizeMode="cover"
                  source={{ uri: photo.uri }}
                  style={{ aspectRatio, borderRadius: radii.field, width: '100%' }}
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

        {canAddPhoto ? (
          <Pressable
            accessible
            accessibilityLabel={addLabel}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            aria-disabled={disabled}
            className="items-center justify-center gap-2 rounded-v2-field border border-dashed border-v2-border bg-v2-surface px-3 py-4"
            disabled={disabled}
            onPress={addPhoto}
            style={uploadStyle}
          >
            {appearance === 'trainer' ? (
              <Upload color={disabled ? colors.secondary : colors.brand} size={22} />
            ) : (
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.primary }}
              >
                <Upload color={colors.brand} size={22} />
              </View>
            )}
            <Text className="text-center text-v2-brand" variant="button">
              {addLabel}
            </Text>
            {emptyHint ? (
              <Text className="text-center text-v2-secondary" variant="support">
                {emptyHint}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      {description ? (
        <Text className="text-v2-secondary" variant="support">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
