import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  submitAssessment,
  toSupportedContentType,
} from '../application/assessments/new-assessment';
import { AppButton } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Field } from '../components/ui/field';
import { Screen, ScreenHeader } from '../components/ui/screen';
import { todayIsoDate } from '../lib/date';
import { queryClient } from '../lib/query-client';
import { colors, sharedStyles, spacing } from '../lib/styles';
import { type AssessmentPhoto, uploadAssessmentPhoto } from '../lib/uploads';
import { useApiClient } from '../lib/use-api';

export function NewAssessmentScreen() {
  const api = useApiClient();

  const [date, setDate] = useState(todayIsoDate());
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<AssessmentPhoto>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;

    const timeout = setTimeout(() => router.back(), 150);
    return () => clearTimeout(timeout);
  }, [success]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    const asset = result.assets?.[0];
    const contentType = toSupportedContentType(asset?.mimeType);
    if (!result.canceled && asset?.uri && contentType) {
      setPhoto({ uri: asset.uri, contentType });
    }
  }

  async function submit() {
    if (submitting) return;

    setSubmitting(true);
    setError(undefined);
    setSuccess(false);

    try {
      await submitAssessment({
        api,
        values: { date, weightKg, bodyFatPct, notes, photo },
        uploadPhoto: (selectedPhoto) => uploadAssessmentPhoto({ api, photo: selectedPhoto }),
        invalidateAssessments: () =>
          queryClient.invalidateQueries({ queryKey: ['assessments', 'me'] }),
      });
      setSuccess(true);
    } catch {
      setError('Não foi possível salvar sua avaliação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <ScreenHeader
        subtitle="Registre suas medidas para acompanhar sua evolução."
        title="Nova avaliação"
      />

      <Card>
        <Field
          label="Data da avaliação"
          onChangeText={setDate}
          placeholder="AAAA-MM-DD"
          value={date}
        />
        <Field
          keyboardType="decimal-pad"
          label="Peso"
          onChangeText={setWeightKg}
          unit="kg"
          value={weightKg}
        />
        <Field
          keyboardType="decimal-pad"
          label="Gordura corporal"
          onChangeText={setBodyFatPct}
          unit="%"
          value={bodyFatPct}
        />
        <Field
          label="Observações"
          multiline
          numberOfLines={4}
          onChangeText={setNotes}
          placeholder="Como você está se sentindo?"
          value={notes}
        />
      </Card>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={sharedStyles.error}>
          {error}
        </Text>
      ) : null}
      {success ? (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          Avaliação salva!
        </Text>
      ) : null}

      <AppButton
        disabled={submitting || success}
        label={photo ? 'Foto adicionada' : 'Adicionar foto'}
        onPress={() => void pickPhoto()}
        variant="secondary"
      />
      <AppButton
        disabled={submitting || success}
        label={submitting ? 'Salvando avaliação...' : 'Salvar avaliação'}
        onPress={() => void submit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
  },
  success: {
    color: colors.primary,
    fontFamily: sharedStyles.buttonText.fontFamily,
    fontSize: 15,
  },
});
