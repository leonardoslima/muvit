import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import {
  submitAssessment,
  toSupportedContentType,
} from '../application/assessments/new-assessment';
import { AppButton } from '../components/ui/button';
import { InlineMessage } from '../components/ui/inline-message';
import { ContextualHeader, Screen } from '../components/ui/screen';
import { todayIsoDate } from '../lib/date';
import { queryClient } from '../lib/query-client';
import { colors, controlSizes, fontFamilies, radii, spacing, typography } from '../lib/styles';
import { type AssessmentPhoto, uploadAssessmentPhoto } from '../lib/uploads';
import { useApiClient } from '../lib/use-api';

const SUCCESS_FEEDBACK_DURATION_MS = 1_500;

type AssessmentFieldProps = {
  keyboardType?: TextInputProps['keyboardType'];
  label: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  value: string;
};

function AssessmentField({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: AssessmentFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

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

    const timeout = setTimeout(() => router.back(), SUCCESS_FEEDBACK_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [success]);

  const formDisabled = submitting || success;

  async function pickPhoto(): Promise<void> {
    if (formDisabled) return;

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

  async function submit(): Promise<void> {
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

  function returnToPrevious(): void {
    if (formDisabled) return;

    router.back();
  }

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.shell}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <ContextualHeader
            backDisabled={formDisabled}
            backIcon={<Ionicons color={colors.ink} name="arrow-back" size={20} />}
            backTestID="new-assessment-header-back"
            onBack={returnToPrevious}
            testID="new-assessment-header"
            title="Nova avaliação"
            titleTestID="new-assessment-header-title"
          />

          <View style={styles.form}>
            <Text style={styles.helper}>Registre suas medidas e observações.</Text>
            <AssessmentField
              label="Data da avaliação"
              onChangeText={setDate}
              placeholder="AAAA-MM-DD"
              value={date}
            />
            <View style={styles.measurementsRow} testID="assessment-measurements-row">
              <View style={styles.measurementField}>
                <AssessmentField
                  keyboardType="decimal-pad"
                  label="Peso (kg)"
                  onChangeText={setWeightKg}
                  value={weightKg}
                />
              </View>
              <View style={styles.measurementField}>
                <AssessmentField
                  keyboardType="decimal-pad"
                  label="Gordura corporal (%)"
                  onChangeText={setBodyFatPct}
                  value={bodyFatPct}
                />
              </View>
            </View>
            <View style={styles.notesField}>
              <Text style={styles.fieldLabel}>Notas</Text>
              <TextInput
                accessibilityLabel="Notas"
                multiline
                numberOfLines={4}
                onChangeText={setNotes}
                placeholder="Observações desta avaliação"
                placeholderTextColor={colors.muted}
                style={styles.notesInput}
                textAlignVertical="top"
                value={notes}
              />
            </View>
            <View
              style={[styles.photoAction, formDisabled ? styles.disabledControl : null]}
              testID="assessment-photo-action"
            >
              <Pressable
                accessible
                accessibilityLabel={photo ? 'Foto adicionada' : 'Adicionar foto'}
                accessibilityRole="button"
                accessibilityState={{ disabled: formDisabled }}
                disabled={formDisabled}
                onPress={() => void pickPhoto()}
                style={({ pressed }) => [
                  styles.photoActionPressable,
                  pressed && !formDisabled ? styles.pressedControl : null,
                ]}
              >
                <Feather color={colors.muted} name="upload" size={24} testID="add-photo-icon" />
                <Text style={styles.photoLabel}>
                  {photo ? 'Foto adicionada' : 'Adicionar foto'}
                </Text>
                <Text style={styles.photoHint}>Toque para escolher uma foto</Text>
              </Pressable>
            </View>
          </View>

          {error ? <InlineMessage message={error} tone="error" /> : null}
          {success ? <InlineMessage message="Avaliação salva!" tone="success" /> : null}
        </ScrollView>

        <View style={styles.footer} testID="new-assessment-footer">
          <AppButton
            disabled={formDisabled}
            label={submitting ? 'Salvando avaliação...' : 'Salvar'}
            onPress={() => void submit()}
            trailingIcon={
              <Ionicons
                color={colors.ink}
                name="save-outline"
                size={18}
                testID="save-assessment-icon"
              />
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  shell: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  form: {
    gap: spacing.md,
  },
  helper: {
    color: colors.muted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 16,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.ink,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 12,
    lineHeight: 15,
  },
  input: {
    ...typography.input,
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.ink,
    height: controlSizes.input,
    paddingHorizontal: 14,
  },
  notesField: {
    gap: 6,
  },
  notesInput: {
    ...typography.input,
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.ink,
    height: 100,
    minHeight: 100,
    padding: 14,
    textAlignVertical: 'top',
  },
  measurementsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  measurementField: {
    flex: 1,
  },
  photoAction: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1.5,
    gap: spacing.sm,
    height: 112,
    justifyContent: 'center',
  },
  photoActionPressable: {
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  photoLabel: {
    color: colors.ink,
    ...typography.button,
  },
  photoHint: {
    color: colors.muted,
    ...typography.caption,
  },
  footer: {
    backgroundColor: colors.background,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  disabledControl: {
    opacity: 0.5,
  },
  pressedControl: {
    opacity: 0.8,
  },
});
