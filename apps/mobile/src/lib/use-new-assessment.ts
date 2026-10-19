import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  type AssessmentFormValues,
  normalizeAssessmentPhotoSelection,
  submitAssessment,
} from '../application/assessments/new-assessment';
import {
  AssessmentPhotoPickerError,
  type AssessmentPhotoRequest,
  pickAssessmentPhotos,
} from './assessment-photo-picker';
import { todayIsoDate } from './date';
import { queryClient } from './query-client';
import { uploadAssessmentPhoto } from './uploads';
import { useApiClient } from './use-api';

export type AssessmentFormField = 'date' | 'weightKg' | 'bodyFatPct' | 'notes';

export type UseNewAssessmentResult = {
  values: AssessmentFormValues;
  submitting: boolean;
  picking: boolean;
  success: boolean;
  error: string | undefined;
  setField: (field: AssessmentFormField, value: string) => void;
  addPhotos: (source?: AssessmentPhotoRequest) => Promise<void>;
  removePhoto: (index: number) => void;
  submit: () => Promise<void>;
};

const PICKER_ERROR = 'Não foi possível abrir a biblioteca de fotos. Tente novamente.';
const INVALID_PHOTOS_ERROR = 'Selecione imagens JPEG ou PNG.';
const SUBMIT_ERROR = 'Não foi possível salvar sua avaliação.';

function initialFormValues(): AssessmentFormValues {
  return {
    date: todayIsoDate(),
    weightKg: '',
    bodyFatPct: '',
    notes: '',
    photos: [],
  };
}

export function useNewAssessment(): UseNewAssessmentResult {
  const api = useApiClient();
  const [values, setValues] = useState<AssessmentFormValues>(initialFormValues);
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>();
  const valuesRef = useRef(values);
  const mountedRef = useRef(false);
  const submittingRef = useRef(false);
  const pickerLockedRef = useRef(false);
  const pickerGenerationRef = useRef(0);
  const successRef = useRef(false);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      pickerGenerationRef.current += 1;
      if (returnTimerRef.current !== undefined) {
        clearTimeout(returnTimerRef.current);
        returnTimerRef.current = undefined;
      }
    };
  }, []);

  function updateValues(nextValues: AssessmentFormValues): void {
    valuesRef.current = nextValues;
    setValues(nextValues);
  }

  function setField(field: AssessmentFormField, value: string): void {
    const nextValues = { ...valuesRef.current, [field]: value };
    updateValues(nextValues);
  }

  async function addPhotos(source: AssessmentPhotoRequest = 'library'): Promise<void> {
    if (pickerLockedRef.current || submittingRef.current || successRef.current) return;

    pickerLockedRef.current = true;
    const pickerGeneration = pickerGenerationRef.current + 1;
    pickerGenerationRef.current = pickerGeneration;
    setPicking(true);
    setError(undefined);

    try {
      const result = await pickAssessmentPhotos(source, {
        libraryOptions: {
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: 0,
          allowsEditing: false,
          quality: 0.7,
        },
        isCurrent: () =>
          mountedRef.current &&
          pickerGenerationRef.current === pickerGeneration &&
          !submittingRef.current &&
          !successRef.current,
      });

      if (
        !result ||
        !mountedRef.current ||
        pickerGenerationRef.current !== pickerGeneration ||
        submittingRef.current ||
        successRef.current ||
        result.canceled
      ) {
        return;
      }

      const selectedPhotos = normalizeAssessmentPhotoSelection(result.assets ?? []);
      if (selectedPhotos === null) {
        setError(INVALID_PHOTOS_ERROR);
        return;
      }
      if (selectedPhotos.length === 0) return;

      updateValues({
        ...valuesRef.current,
        photos: [...valuesRef.current.photos, ...selectedPhotos],
      });
    } catch (error) {
      if (mountedRef.current && pickerGenerationRef.current === pickerGeneration) {
        setError(error instanceof AssessmentPhotoPickerError ? error.message : PICKER_ERROR);
      }
    } finally {
      pickerLockedRef.current = false;
      if (mountedRef.current) setPicking(false);
    }
  }

  function removePhoto(index: number): void {
    const currentPhotos = valuesRef.current.photos;
    if (submittingRef.current || successRef.current || index < 0 || index >= currentPhotos.length) {
      return;
    }

    updateValues({
      ...valuesRef.current,
      photos: currentPhotos.filter((_, currentIndex) => currentIndex !== index),
    });
  }

  async function submit(): Promise<void> {
    if (submittingRef.current || successRef.current) return;

    submittingRef.current = true;
    pickerGenerationRef.current += 1;
    setPicking(false);
    setSubmitting(true);
    setError(undefined);

    const currentValues = valuesRef.current;
    const snapshot: AssessmentFormValues = {
      ...currentValues,
      photos: currentValues.photos.map((photo) => ({ ...photo })),
    };

    try {
      await submitAssessment({
        api,
        values: snapshot,
        uploadPhoto: (photo) => uploadAssessmentPhoto({ api, photo }),
        invalidateAssessments: () =>
          queryClient.invalidateQueries({ queryKey: ['assessments', 'me'] }),
      });

      if (!mountedRef.current) return;

      successRef.current = true;
      setSuccess(true);
      returnTimerRef.current = setTimeout(() => {
        returnTimerRef.current = undefined;
        if (mountedRef.current) router.back();
      }, 150);
    } catch {
      if (mountedRef.current) setError(SUBMIT_ERROR);
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }

  return {
    values,
    submitting,
    picking,
    success,
    error,
    setField,
    addPhotos,
    removePhoto,
    submit,
  };
}
