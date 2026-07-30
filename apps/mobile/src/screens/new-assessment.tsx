import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  submitAssessment,
  toSupportedContentType,
} from '../application/assessments/new-assessment';

import { todayIsoDate } from '../lib/date';
import { queryClient } from '../lib/query-client';
import { sharedStyles } from '../lib/styles';
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
    setSubmitting(true);

    try {
      await submitAssessment({
        api,

        values: { date, weightKg, bodyFatPct, notes, photo },
        uploadPhoto: (selectedPhoto) => uploadAssessmentPhoto({ api, photo: selectedPhoto }),
        invalidateAssessments: () =>
          queryClient.invalidateQueries({ queryKey: ['assessments', 'me'] }),
      });
      router.back();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 32 }} style={sharedStyles.screen}>
      <Text style={sharedStyles.title}>Nova avaliacao</Text>
      <TextInput
        onChangeText={setDate}
        placeholder="AAAA-MM-DD"
        style={sharedStyles.input}
        value={date}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={setWeightKg}
        placeholder="Peso (kg)"
        style={sharedStyles.input}
        value={weightKg}
      />
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={setBodyFatPct}
        placeholder="Gordura corporal (%)"
        style={sharedStyles.input}
        value={bodyFatPct}
      />
      <TextInput
        multiline
        onChangeText={setNotes}
        placeholder="Notas"
        style={[sharedStyles.input, { minHeight: 96, paddingTop: 12 }]}
        value={notes}
      />
      <Pressable onPress={pickPhoto} style={sharedStyles.secondaryButton}>
        <Text style={sharedStyles.secondaryButtonText}>
          {photo ? 'Foto selecionada' : 'Adicionar foto'}
        </Text>
      </Pressable>
      <Pressable disabled={submitting} onPress={submit} style={sharedStyles.button}>
        <Text style={sharedStyles.buttonText}>{submitting ? 'Salvando...' : 'Salvar'}</Text>
      </Pressable>
    </ScrollView>
  );
}
