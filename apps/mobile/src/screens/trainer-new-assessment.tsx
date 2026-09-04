import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { createAssessment } from '../application/assessments/assessment-data';
import {
  type AssessmentPhotoInput,
  type TrainerAssessmentFormValues,
  buildCreateAssessmentInput,
  calculateBmi,
  emptyTrainerAssessmentMeasurements,
} from '../application/assessments/assessment-form';
import { toSupportedContentType } from '../application/assessments/new-assessment';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Field } from '../components/ui/field';
import { InlineMessage } from '../components/ui/inline-message';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { StatePanel } from '../components/ui/state-panel';
import { todayIsoDate } from '../lib/date';
import { queryClient } from '../lib/query-client';
import { colors, radii, sharedStyles, spacing, typography } from '../lib/styles';
import { uploadAssessmentPhoto } from '../lib/uploads';
import { useApiClient } from '../lib/use-api';

const MAX_PHOTOS = 3;

export function TrainerNewAssessmentScreen() {
  const api = useApiClient();
  const params = useLocalSearchParams<{ studentId?: string | string[] }>();
  const studentId = firstParam(params.studentId);

  const [values, setValues] = useState<TrainerAssessmentFormValues>({
    date: todayIsoDate(),
    weightKg: '',
    heightCm: '',
    bodyFatPct: '',
    measurements: emptyTrainerAssessmentMeasurements(),
    notes: '',
  });
  const [photos, setPhotos] = useState<AssessmentPhotoInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success || !studentId) return;

    const timeout = setTimeout(() => {
      router.replace(`/trainer/students/${studentId}/assessments`);
    }, 150);

    return () => clearTimeout(timeout);
  }, [studentId, success]);

  function setField(
    key: 'date' | 'weightKg' | 'heightCm' | 'bodyFatPct' | 'notes',
    value: string,
  ): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setMeasurement(
    key: keyof TrainerAssessmentFormValues['measurements'],
    value: string,
  ): void {
    setValues((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        [key]: value,
      },
    }));
  }

  async function pickPhoto(): Promise<void> {
    if (photos.length >= MAX_PHOTOS || submitting || success) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets?.[0];
    const contentType = toSupportedContentType(asset?.mimeType);

    if (!asset?.uri || !contentType) {
      setError('Selecione uma imagem JPEG ou PNG.');
      return;
    }

    setError(undefined);
    setPhotos((current) => {
      if (current.length >= MAX_PHOTOS) return current;
      return [...current, { uri: asset.uri, contentType }];
    });
  }

  function removePhoto(index: number): void {
    setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function submit(): Promise<void> {
    if (!studentId || submitting || success) return;

    setError(undefined);
    setSuccess(false);

    const validation = buildCreateAssessmentInput(values, []);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setSubmitting(true);

    try {
      let photoUrls: string[] = [];

      if (photos.length > 0) {
        try {
          photoUrls = await Promise.all(
            photos.map((photo) => uploadAssessmentPhoto({ api, photo })),
          );
        } catch {
          setError('Não foi possível enviar as fotos da avaliação.');
          return;
        }
      }

      const finalInput = buildCreateAssessmentInput(values, photoUrls);
      if (!finalInput.ok) {
        setError(finalInput.message);
        return;
      }

      await createAssessment(api, { kind: 'student', studentId }, finalInput.body);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['trainer', 'assessments', studentId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['trainer', 'summary'],
        }),
      ]);

      setSuccess(true);
    } catch {
      setError('Não foi possível salvar a avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  function returnToAssessments(): void {
    if (!studentId) {
      router.replace('/trainer/students');
      return;
    }

    router.replace(`/trainer/students/${studentId}/assessments`);
  }

  if (!studentId) {
    return (
      <Screen style={styles.centeredState}>
        <StatePanel
          description="Não foi possível identificar o aluno solicitado."
          title="Aluno inválido"
          tone="error"
        />
        <View style={styles.invalidAction}>
          <AppButton
            label="Voltar para avaliações"
            onPress={returnToAssessments}
            variant="secondary"
          />
        </View>
      </Screen>
    );
  }

  const bmi = calculateBmi(values.weightKg, values.heightCm);
  const photoButtonLabel = photos.length === 0 ? 'Adicionar foto' : 'Adicionar outra foto';

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <AppButton label="Voltar para avaliações" onPress={returnToAssessments} variant="secondary" />
      <ScreenHeader
        subtitle="Registre medidas e fotos para acompanhar a evolução deste aluno."
        title="Nova avaliação"
      />

      <Card>
        <Text style={styles.sectionTitle}>Métricas principais</Text>
        <Field
          label="Data da avaliação"
          onChangeText={(value) => setField('date', value)}
          placeholder="AAAA-MM-DD"
          value={values.date}
        />
        <Field
          keyboardType="decimal-pad"
          label="Peso"
          onChangeText={(value) => setField('weightKg', value)}
          unit="kg"
          value={values.weightKg}
        />
        <Field
          keyboardType="decimal-pad"
          label="Altura"
          onChangeText={(value) => setField('heightCm', value)}
          unit="cm"
          value={values.heightCm}
        />
        <Field
          keyboardType="decimal-pad"
          label="Gordura corporal"
          onChangeText={(value) => setField('bodyFatPct', value)}
          unit="%"
          value={values.bodyFatPct}
        />
        <View style={styles.derivedMetric}>
          <Text style={sharedStyles.label}>IMC</Text>
          <Text style={sharedStyles.subtitle}>
            {bmi === null
              ? 'Informe peso e altura'
              : bmi.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
          </Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Medidas de circunferência</Text>
        <Field
          keyboardType="decimal-pad"
          label="Peito"
          onChangeText={(value) => setMeasurement('chest', value)}
          unit="cm"
          value={values.measurements.chest}
        />
        <Field
          keyboardType="decimal-pad"
          label="Cintura"
          onChangeText={(value) => setMeasurement('waist', value)}
          unit="cm"
          value={values.measurements.waist}
        />
        <Field
          keyboardType="decimal-pad"
          label="Quadril"
          onChangeText={(value) => setMeasurement('hip', value)}
          unit="cm"
          value={values.measurements.hip}
        />
        <Field
          keyboardType="decimal-pad"
          label="Braço direito"
          onChangeText={(value) => setMeasurement('armRight', value)}
          unit="cm"
          value={values.measurements.armRight}
        />
        <Field
          keyboardType="decimal-pad"
          label="Braço esquerdo"
          onChangeText={(value) => setMeasurement('armLeft', value)}
          unit="cm"
          value={values.measurements.armLeft}
        />
        <Field
          keyboardType="decimal-pad"
          label="Coxa direita"
          onChangeText={(value) => setMeasurement('thighRight', value)}
          unit="cm"
          value={values.measurements.thighRight}
        />
        <Field
          keyboardType="decimal-pad"
          label="Coxa esquerda"
          onChangeText={(value) => setMeasurement('thighLeft', value)}
          unit="cm"
          value={values.measurements.thighLeft}
        />
        <Field
          keyboardType="decimal-pad"
          label="Panturrilha direita"
          onChangeText={(value) => setMeasurement('calfRight', value)}
          unit="cm"
          value={values.measurements.calfRight}
        />
        <Field
          keyboardType="decimal-pad"
          label="Panturrilha esquerda"
          onChangeText={(value) => setMeasurement('calfLeft', value)}
          unit="cm"
          value={values.measurements.calfLeft}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Fotos de progresso</Text>
        {photos.map((photo, index) => (
          <View key={`${photo.uri}-${index}`} style={styles.photoItem}>
            <Text style={styles.photoLabel}>Foto {index + 1}</Text>
            <Image
              accessibilityLabel={`Prévia da foto ${index + 1}`}
              resizeMode="cover"
              source={{ uri: photo.uri }}
              style={styles.photo}
            />
            <AppButton
              label={`Remover foto ${index + 1}`}
              onPress={() => removePhoto(index)}
              variant="secondary"
            />
          </View>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <AppButton
            disabled={submitting || success}
            label={photoButtonLabel}
            onPress={() => void pickPhoto()}
            variant="secondary"
          />
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Observações</Text>
        <Field
          label="Observações"
          multiline
          numberOfLines={4}
          onChangeText={(value) => setField('notes', value)}
          placeholder="Como foi a avaliação?"
          value={values.notes}
        />
      </Card>

      {error ? <InlineMessage message={error} tone="error" /> : null}
      {success ? <InlineMessage message="Avaliação salva!" tone="success" /> : null}

      <AppButton
        disabled={submitting || success}
        label={submitting ? 'Salvando avaliação...' : 'Salvar avaliação'}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  centeredState: {
    justifyContent: 'center',
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  derivedMetric: {
    gap: spacing.xs,
  },
  invalidAction: {
    marginTop: spacing.lg,
  },
  photo: {
    aspectRatio: 4 / 3,
    borderRadius: radii.md,
    width: '100%',
  },
  photoItem: {
    gap: spacing.sm,
  },
  photoLabel: {
    color: colors.ink,
    ...typography.bodyStrong,
  },
  sectionTitle: {
    color: colors.ink,
    ...typography.cardTitle,
  },
});
