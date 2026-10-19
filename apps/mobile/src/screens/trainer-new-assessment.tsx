import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { createAssessment } from '../application/assessments/assessment-data';
import {
  type AssessmentPhotoInput,
  type TrainerAssessmentFormValues,
  buildCreateAssessmentInput,
  calculateBmi,
  emptyTrainerAssessmentMeasurements,
} from '../application/assessments/assessment-form';
import { toSupportedContentType } from '../application/assessments/new-assessment';
import { AssessmentHeading } from '../components/assessments/assessment-heading';
import { TrainerAssessmentPhotos } from '../components/assessments/trainer-assessment-photos';
import { TrainerScreen } from '../components/trainer/trainer-screen';
import { Button } from '../components/ui/v2/button';
import { Field } from '../components/ui/v2/field';
import { KeyboardScrollView } from '../components/ui/v2/keyboard-scroll-view';
import { Message } from '../components/ui/v2/message';
import { StatePanel } from '../components/ui/v2/state-panel';
import { Text } from '../components/ui/v2/text';
import { formatDateInput, parseDateInput, todayIsoDate } from '../lib/date';
import { spacing } from '../lib/design-system/tokens';
import { queryClient } from '../lib/query-client';
import { uploadAssessmentPhoto } from '../lib/uploads';
import { useApiClient } from '../lib/use-api';

const MAX_PHOTOS = 3;

export function TrainerNewAssessmentScreen(): React.JSX.Element {
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
  const formDisabled = submitting || success;

  useEffect(() => {
    if (!success || !studentId) return;

    const timeout = setTimeout(() => {
      router.dismissTo(`/trainer/students/${studentId}/assessments`);
    }, 150);

    return () => clearTimeout(timeout);
  }, [studentId, success]);

  function setField(
    key: 'date' | 'weightKg' | 'heightCm' | 'bodyFatPct' | 'notes',
    value: string,
  ): void {
    if (formDisabled) return;

    setValues((current) => ({ ...current, [key]: value }));
  }

  function setMeasurement(
    key: keyof TrainerAssessmentFormValues['measurements'],
    value: string,
  ): void {
    if (formDisabled) return;

    setValues((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        [key]: value,
      },
    }));
  }

  async function pickPhoto(): Promise<void> {
    if (photos.length >= MAX_PHOTOS || formDisabled) return;

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
    if (formDisabled) return;

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
    if (formDisabled) return;

    if (!studentId) {
      router.dismissTo('/trainer/students');
      return;
    }

    router.dismissTo(`/trainer/students/${studentId}/assessments`);
  }

  const bmi = calculateBmi(values.weightKg, values.heightCm);
  const content = studentId ? (
    <KeyboardScrollView
      className="flex-1"
      contentContainerStyle={{
        gap: spacing.xxl,
        paddingTop: spacing.sm,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <AssessmentHeading
        subtitle="Registre medidas e fotos para acompanhar a evolução. Somente a data é obrigatória."
        title="Nova avaliação"
      />

      <View className="gap-4">
        <Text variant="sectionTitle">Métricas principais</Text>
        <Field
          label="Data da avaliação"
          editable={!formDisabled}
          onChangeText={(value) => setField('date', parseDateInput(value))}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          maxLength={10}
          value={formatDateInput(values.date)}
        />
        <Field
          keyboardType="decimal-pad"
          label="Peso"
          editable={!formDisabled}
          onChangeText={(value) => setField('weightKg', value)}
          placeholder="Ex.: 70,5"
          unit="kg"
          value={values.weightKg}
        />
        <Field
          keyboardType="decimal-pad"
          label="Altura"
          editable={!formDisabled}
          onChangeText={(value) => setField('heightCm', value)}
          placeholder="Ex.: 170"
          unit="cm"
          value={values.heightCm}
        />
        <Field
          keyboardType="decimal-pad"
          label="Gordura corporal"
          editable={!formDisabled}
          onChangeText={(value) => setField('bodyFatPct', value)}
          placeholder="Ex.: 20,5"
          unit="%"
          value={values.bodyFatPct}
        />
        <View className="gap-1">
          <Text variant="label">IMC</Text>
          <Text className="text-v2-secondary">
            {bmi === null
              ? 'Informe peso e altura'
              : bmi.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
          </Text>
        </View>
      </View>

      <View className="gap-4">
        <Text variant="sectionTitle">Medidas de circunferência</Text>
        <Field
          keyboardType="decimal-pad"
          label="Peito"
          editable={!formDisabled}
          onChangeText={(value) => setMeasurement('chest', value)}
          placeholder="Ex.: 95"
          unit="cm"
          value={values.measurements.chest}
        />
        <Field
          keyboardType="decimal-pad"
          label="Cintura"
          editable={!formDisabled}
          onChangeText={(value) => setMeasurement('waist', value)}
          placeholder="Ex.: 80"
          unit="cm"
          value={values.measurements.waist}
        />
        <Field
          keyboardType="decimal-pad"
          label="Quadril"
          editable={!formDisabled}
          onChangeText={(value) => setMeasurement('hip', value)}
          placeholder="Ex.: 100"
          unit="cm"
          value={values.measurements.hip}
        />
        <Field
          keyboardType="decimal-pad"
          label="Braço direito"
          editable={!formDisabled}
          onChangeText={(value) => setMeasurement('armRight', value)}
          placeholder="Ex.: 32,5"
          unit="cm"
          value={values.measurements.armRight}
        />
        <Field
          keyboardType="decimal-pad"
          label="Braço esquerdo"
          editable={!formDisabled}
          onChangeText={(value) => setMeasurement('armLeft', value)}
          placeholder="Ex.: 32,5"
          unit="cm"
          value={values.measurements.armLeft}
        />
        <Field
          keyboardType="decimal-pad"
          label="Coxa direita"
          editable={!formDisabled}
          onChangeText={(value) => setMeasurement('thighRight', value)}
          placeholder="Ex.: 55"
          unit="cm"
          value={values.measurements.thighRight}
        />
        <Field
          keyboardType="decimal-pad"
          label="Coxa esquerda"
          editable={!formDisabled}
          onChangeText={(value) => setMeasurement('thighLeft', value)}
          placeholder="Ex.: 55"
          unit="cm"
          value={values.measurements.thighLeft}
        />
        <Field
          keyboardType="decimal-pad"
          label="Panturrilha direita"
          editable={!formDisabled}
          onChangeText={(value) => setMeasurement('calfRight', value)}
          placeholder="Ex.: 36"
          unit="cm"
          value={values.measurements.calfRight}
        />
        <Field
          keyboardType="decimal-pad"
          label="Panturrilha esquerda"
          editable={!formDisabled}
          onChangeText={(value) => setMeasurement('calfLeft', value)}
          placeholder="Ex.: 36"
          unit="cm"
          value={values.measurements.calfLeft}
        />
      </View>

      <View className="gap-4">
        <Text variant="sectionTitle">Fotos</Text>
        <TrainerAssessmentPhotos
          disabled={formDisabled}
          onAdd={() => void pickPhoto()}
          onRemove={removePhoto}
          photos={photos}
        />
      </View>

      <View className="gap-4">
        <Text variant="sectionTitle">Observações</Text>
        <Field
          label="Observações"
          multiline
          numberOfLines={4}
          editable={!formDisabled}
          onChangeText={(value) => setField('notes', value)}
          placeholder="Adicione observações sobre a avaliação"
          value={values.notes}
        />
      </View>

      {error ? <Message title={error} variant="error" /> : null}
      {success ? <Message title="Avaliação salva!" variant="success" /> : null}

      <Button
        disabled={formDisabled}
        label={formDisabled ? 'Salvando avaliação...' : 'Salvar avaliação'}
        loading={formDisabled}
        onPress={() => void submit()}
      />
    </KeyboardScrollView>
  ) : (
    <StatePanel
      className="flex-1"
      description="Não foi possível identificar o aluno solicitado."
      kind="error"
      title="Aluno inválido"
    />
  );

  return (
    <TrainerScreen
      backLabel={studentId ? 'Voltar para avaliações' : 'Voltar para alunos'}
      backDisabled={formDisabled}
      contextual
      onBack={returnToAssessments}
      refreshDisabled
      title={studentId ? 'Avaliações' : 'Alunos'}
    >
      {content}
    </TrainerScreen>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
