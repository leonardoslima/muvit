import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { AssessmentPhotoGrid } from '../components/assessments/assessment-photo-grid';
import { AssessmentPhotoViewer } from '../components/assessments/assessment-photo-viewer';
import { Screen } from '../components/ui/screen';
import { Button } from '../components/ui/v2/button';
import { Field } from '../components/ui/v2/field';
import { Header } from '../components/ui/v2/header';
import { Message } from '../components/ui/v2/message';
import { Text } from '../components/ui/v2/text';
import { spacing } from '../lib/design-system/tokens';
import { useNewAssessment } from '../lib/use-new-assessment';

export function NewAssessmentScreen(): React.JSX.Element {
  const { values, submitting, picking, success, error, setField, addPhotos, removePhoto, submit } =
    useNewAssessment();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const formActionsDisabled = submitting || success;
  const photos = values.photos.map(({ uri }) => uri);
  const photosDescription =
    values.photos.length === 0
      ? undefined
      : `${values.photos.length} ${values.photos.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}`;

  return (
    <Screen style={{ paddingVertical: 0 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            gap: spacing.xxl,
            paddingBottom: spacing.xxxl,
            paddingTop: spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            <Header
              backAction={{
                label: 'Voltar para progresso',
                onPress: () => router.back(),
                disabled: formActionsDisabled,
              }}
              title="Nova avaliação"
              variant="contextual"
            />
            <Text className="text-v2-secondary" variant="body">
              Registre suas medidas para acompanhar sua evolução.
            </Text>
          </View>

          <View className="gap-4">
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
              placeholder="Ex.: 70,5"
              unit="kg"
              value={values.weightKg}
            />
            <Field
              keyboardType="decimal-pad"
              label="Gordura corporal"
              onChangeText={(value) => setField('bodyFatPct', value)}
              placeholder="Ex.: 20,5"
              unit="%"
              value={values.bodyFatPct}
            />
            <Field
              label="Observações"
              maxLength={2000}
              multiline
              numberOfLines={4}
              onChangeText={(value) => setField('notes', value)}
              placeholder="Como você está se sentindo?"
              textAlignVertical="top"
              value={values.notes}
            />
          </View>

          <View className="gap-3">
            <Text variant="sectionTitle">Fotos</Text>
            <AssessmentPhotoGrid
              addLabel={picking ? 'Abrindo biblioteca...' : 'Adicionar fotos'}
              description={photosDescription}
              disabled={formActionsDisabled || picking}
              emptyHint="Selecione imagens JPEG ou PNG."
              onAdd={() => void addPhotos()}
              onOpen={setViewerIndex}
              onRemove={removePhoto}
              photos={values.photos}
            />
          </View>

          {error ? <Message title={error} variant="error" /> : null}
          {success ? <Message title="Avaliação salva!" variant="success" /> : null}

          <Button
            disabled={formActionsDisabled}
            label={submitting ? 'Salvando avaliação...' : 'Salvar avaliação'}
            loading={submitting}
            onPress={() => void submit()}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <AssessmentPhotoViewer
        photos={photos}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </Screen>
  );
}
