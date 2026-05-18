import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from '../lib/auth-store';
import { todayIsoDate } from '../lib/date';
import { queryClient } from '../lib/query-client';
import { sharedStyles } from '../lib/styles';
import { useApiClient } from '../lib/use-api';

type AssessmentPayload = {
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  photos?: string[];
  notes?: string;
};

export function NewAssessmentScreen() {
  const api = useApiClient();
  const userId = useAuth((state) => state.userId);
  const [date, setDate] = useState(todayIsoDate());
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      base64: true,
      quality: 0.7,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) {
      setPhoto(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    }
  }

  async function submit() {
    if (!userId) return;
    setSubmitting(true);
    const payload: AssessmentPayload = {
      date,
      weightKg: toOptionalNumber(weightKg),
      bodyFatPct: toOptionalNumber(bodyFatPct),
      photos: photo ? [photo] : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await api.request(`/students/${userId}/assessments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await queryClient.invalidateQueries({ queryKey: ['assessments', userId] });
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

function toOptionalNumber(value: string): number | undefined {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}
