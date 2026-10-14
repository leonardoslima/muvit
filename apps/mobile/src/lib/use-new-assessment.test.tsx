import { act, renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNewAssessment } from './use-new-assessment';

const apiState = vi.hoisted(() => ({ request: vi.fn() }));
const pickerState = vi.hoisted(() => ({ launchImageLibraryAsync: vi.fn() }));
const queryState = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const routerState = vi.hoisted(() => ({ back: vi.fn() }));
const uploadState = vi.hoisted(() => ({ uploadAssessmentPhoto: vi.fn() }));

vi.mock('../lib/use-api', () => ({
  useApiClient: () => apiState,
}));

vi.mock('../lib/query-client', () => ({
  queryClient: queryState,
}));

vi.mock('../lib/uploads', () => ({
  uploadAssessmentPhoto: uploadState.uploadAssessmentPhoto,
}));

vi.mock('expo-image-picker', () => pickerState);

vi.mock('expo-router', () => ({
  router: routerState,
}));

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolvePromise: ((value: T) => void) | undefined;
  let rejectPromise: ((error: unknown) => void) | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve(value: T) {
      resolvePromise?.(value);
    },
    reject(error: unknown) {
      rejectPromise?.(error);
    },
  };
}

function pickerResult(uris: readonly string[]) {
  return {
    canceled: false,
    assets: uris.map((uri, index) => ({
      uri,
      mimeType: index % 2 === 0 ? 'image/jpeg' : 'image/png',
    })),
  };
}

beforeEach(() => {
  apiState.request.mockReset();
  pickerState.launchImageLibraryAsync.mockReset();
  queryState.invalidateQueries.mockReset().mockResolvedValue(undefined);
  routerState.back.mockReset();
  uploadState.uploadAssessmentPhoto.mockReset();
  apiState.request.mockResolvedValue(undefined);
});

describe('useNewAssessment', () => {
  it('adiciona uma segunda seleção em ordem e usa o picker sem teto e sem crop', async () => {
    const firstUris = Array.from({ length: 8 }, (_, index) => `file:///photo-${index + 1}.jpg`);
    pickerState.launchImageLibraryAsync
      .mockResolvedValueOnce(pickerResult(firstUris))
      .mockResolvedValueOnce(pickerResult(['file:///photo-9.png']));
    const { result } = renderHook(() => useNewAssessment());

    await act(async () => {
      await result.current.addPhotos();
    });
    await act(async () => {
      await result.current.addPhotos();
    });

    expect(pickerState.launchImageLibraryAsync).toHaveBeenNthCalledWith(1, {
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      allowsEditing: false,
      quality: 0.7,
    });
    expect(result.current.values.photos.map(({ uri }) => uri)).toEqual([
      ...firstUris,
      'file:///photo-9.png',
    ]);
    expect(result.current.error).toBeUndefined();
    expect(result.current.picking).toBe(false);
  });

  it('preserva fotos quando a biblioteca é cancelada', async () => {
    pickerState.launchImageLibraryAsync
      .mockResolvedValueOnce(pickerResult(['file:///kept.jpg']))
      .mockResolvedValueOnce({ canceled: true, assets: [] });
    const { result } = renderHook(() => useNewAssessment());

    await act(async () => {
      await result.current.addPhotos();
    });
    await act(async () => {
      await result.current.addPhotos();
    });

    expect(result.current.values.photos.map(({ uri }) => uri)).toEqual(['file:///kept.jpg']);
  });

  it('rejeita um lote inválido inteiro sem substituir as fotos anteriores', async () => {
    pickerState.launchImageLibraryAsync
      .mockResolvedValueOnce(pickerResult(['file:///kept.jpg']))
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          { uri: 'file:///valid.png', mimeType: 'image/png' },
          { uri: 'file:///unsupported.gif', mimeType: 'image/gif' },
        ],
      });
    const { result } = renderHook(() => useNewAssessment());

    await act(async () => {
      await result.current.addPhotos();
      await result.current.addPhotos();
    });

    expect(result.current.values.photos.map(({ uri }) => uri)).toEqual(['file:///kept.jpg']);
    expect(result.current.error).toBe('Selecione imagens JPEG ou PNG.');
  });

  it('libera o bloqueio e apresenta erro quando o picker rejeita', async () => {
    pickerState.launchImageLibraryAsync
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce(pickerResult(['file:///retry.jpg']));
    const { result } = renderHook(() => useNewAssessment());

    await act(async () => {
      await result.current.addPhotos();
    });

    expect(result.current.picking).toBe(false);
    expect(result.current.error).toBe(
      'Não foi possível abrir a biblioteca de fotos. Tente novamente.',
    );

    await act(async () => {
      await result.current.addPhotos();
    });

    expect(result.current.values.photos.map(({ uri }) => uri)).toEqual(['file:///retry.jpg']);
    expect(pickerState.launchImageLibraryAsync).toHaveBeenCalledTimes(2);
  });

  it('ignora uma chamada concorrente ao picker e remove fotos renumerando até a seleção vazia', async () => {
    const pendingPicker = deferred<ReturnType<typeof pickerResult>>();
    pickerState.launchImageLibraryAsync.mockReturnValueOnce(pendingPicker.promise);
    const { result } = renderHook(() => useNewAssessment());
    const pickerPromises: Promise<void>[] = [];

    act(() => {
      pickerPromises.push(result.current.addPhotos(), result.current.addPhotos());
    });
    expect(pickerState.launchImageLibraryAsync).toHaveBeenCalledOnce();
    expect(result.current.picking).toBe(true);

    await act(async () => {
      pendingPicker.resolve(pickerResult(['file:///one.jpg', 'file:///two.png']));
      await Promise.all(pickerPromises);
    });

    act(() => result.current.removePhoto(0));
    expect(result.current.values.photos.map(({ uri }) => uri)).toEqual(['file:///two.png']);
    act(() => result.current.removePhoto(0));
    expect(result.current.values.photos).toEqual([]);
  });

  it('descarta o resultado atrasado do picker quando o envio começa', async () => {
    const pendingPicker = deferred<ReturnType<typeof pickerResult>>();
    const pendingRequest = deferred<void>();
    pickerState.launchImageLibraryAsync.mockReturnValueOnce(pendingPicker.promise);
    apiState.request.mockReturnValueOnce(pendingRequest.promise);
    const { result } = renderHook(() => useNewAssessment());
    const operations: Promise<void>[] = [];

    act(() => {
      operations.push(result.current.addPhotos(), result.current.submit());
    });
    expect(result.current.submitting).toBe(true);
    expect(apiState.request).toHaveBeenCalledOnce();

    await act(async () => {
      pendingRequest.resolve(undefined);
      await operations[1];
      pendingPicker.resolve(pickerResult(['file:///stale.jpg']));
      await operations[0];
    });

    expect(result.current.values.photos).toEqual([]);
    expect(result.current.picking).toBe(false);
  });

  it('descarta resultado do picker depois de desmontar', async () => {
    const pendingPicker = deferred<ReturnType<typeof pickerResult>>();
    pickerState.launchImageLibraryAsync.mockReturnValueOnce(pendingPicker.promise);
    const { result, unmount } = renderHook(() => useNewAssessment());
    const pickerPromises: Promise<void>[] = [];

    act(() => {
      pickerPromises.push(result.current.addPhotos());
    });
    unmount();

    await act(async () => {
      pendingPicker.resolve(pickerResult(['file:///late.jpg']));
      await Promise.all(pickerPromises);
    });

    expect(result.current.values.photos).toEqual([]);
  });

  it('envia snapshot de valores e fotos mesmo com edição de campo enquanto o upload aguarda', async () => {
    const pendingUpload = deferred<string>();
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
      pickerResult(['file:///snapshot.jpg']),
    );
    uploadState.uploadAssessmentPhoto.mockReturnValueOnce(pendingUpload.promise);
    const { result } = renderHook(() => useNewAssessment());

    act(() => result.current.setField('weightKg', '80,5'));
    await act(async () => {
      await result.current.addPhotos();
    });

    const submitOperations: Promise<void>[] = [];
    act(() => {
      submitOperations.push(result.current.submit());
    });
    act(() => result.current.setField('weightKg', '99'));

    await act(async () => {
      pendingUpload.resolve('https://cdn.test/snapshot.jpg');
      await Promise.all(submitOperations);
    });

    expect(result.current.values.weightKg).toBe('99');
    expect(apiState.request).toHaveBeenCalledTimes(1);
    const [, request] = apiState.request.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(request.body as string)).toMatchObject({
      weightKg: 80.5,
      photos: ['https://cdn.test/snapshot.jpg'],
    });
    expect(JSON.parse(request.body as string).date).toEqual(expect.any(String));
    expect(queryState.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['assessments', 'me'],
    });
  });

  it('protege chamadas síncronas duplicadas de submit', async () => {
    const pendingRequest = deferred<void>();
    apiState.request.mockReturnValueOnce(pendingRequest.promise);
    const { result } = renderHook(() => useNewAssessment());
    const submitPromises: Promise<void>[] = [];

    act(() => {
      submitPromises.push(result.current.submit(), result.current.submit());
    });
    expect(apiState.request).toHaveBeenCalledOnce();

    await act(async () => {
      pendingRequest.resolve(undefined);
      await Promise.all(submitPromises);
    });
  });

  it('preserva campos e fotos após falha de upload e permite tentar novamente', async () => {
    pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
      pickerResult(['file:///retained.jpg']),
    );
    uploadState.uploadAssessmentPhoto
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockResolvedValueOnce('https://cdn.test/retained.jpg');
    const { result } = renderHook(() => useNewAssessment());
    act(() => result.current.setField('notes', 'Manter observação'));
    await act(async () => {
      await result.current.addPhotos();
    });

    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.error).toBe('Não foi possível salvar sua avaliação.');
    expect(result.current.values.notes).toBe('Manter observação');
    expect(result.current.values.photos.map(({ uri }) => uri)).toEqual(['file:///retained.jpg']);
    expect(result.current.submitting).toBe(false);
    expect(apiState.request).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.error).toBeUndefined();
    expect(result.current.success).toBe(true);
  });

  it.each(['post', 'invalidation'] as const)(
    'preserva campos e fotos, mostra erro e permite novo envio após falha de %s',
    async (failure) => {
      pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
        pickerResult(['file:///retained.jpg']),
      );
      uploadState.uploadAssessmentPhoto.mockResolvedValue('https://cdn.test/retained.jpg');
      if (failure === 'post') {
        apiState.request
          .mockRejectedValueOnce(new Error('post failed'))
          .mockResolvedValueOnce(undefined);
      } else {
        queryState.invalidateQueries
          .mockRejectedValueOnce(new Error('invalidation failed'))
          .mockResolvedValueOnce(undefined);
      }
      const { result } = renderHook(() => useNewAssessment());
      act(() => result.current.setField('notes', 'Manter observação'));
      await act(async () => {
        await result.current.addPhotos();
      });

      await act(async () => {
        await result.current.submit();
      });
      expect(result.current.error).toBe('Não foi possível salvar sua avaliação.');
      expect(result.current.values.notes).toBe('Manter observação');
      expect(result.current.values.photos.map(({ uri }) => uri)).toEqual(['file:///retained.jpg']);
      expect(result.current.submitting).toBe(false);

      await act(async () => {
        await result.current.submit();
      });
      expect(result.current.error).toBeUndefined();
      expect(result.current.success).toBe(true);
    },
  );

  it('mostra sucesso antes de voltar após 150 ms e cancela o timer ao desmontar', async () => {
    vi.useFakeTimers();
    try {
      pickerState.launchImageLibraryAsync.mockResolvedValueOnce(
        pickerResult(['file:///locked.jpg']),
      );
      uploadState.uploadAssessmentPhoto.mockResolvedValueOnce('https://cdn.test/locked.jpg');
      const { result, unmount } = renderHook(() => useNewAssessment());
      await act(async () => {
        await result.current.addPhotos();
      });
      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.success).toBe(true);
      expect(result.current.submitting).toBe(false);
      expect(routerState.back).not.toHaveBeenCalled();
      await act(async () => {
        await result.current.addPhotos();
        result.current.removePhoto(0);
        await result.current.submit();
      });
      expect(result.current.values.photos.map(({ uri }) => uri)).toEqual(['file:///locked.jpg']);
      expect(pickerState.launchImageLibraryAsync).toHaveBeenCalledOnce();
      expect(uploadState.uploadAssessmentPhoto).toHaveBeenCalledOnce();
      expect(apiState.request).toHaveBeenCalledOnce();
      act(() => vi.advanceTimersByTime(149));
      expect(routerState.back).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(routerState.back).toHaveBeenCalledOnce();

      routerState.back.mockClear();
      const second = renderHook(() => useNewAssessment());
      await act(async () => {
        await second.result.current.submit();
      });
      second.unmount();
      act(() => vi.advanceTimersByTime(150));
      expect(routerState.back).not.toHaveBeenCalled();
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });
});
