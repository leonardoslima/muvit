import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createExerciseAction } from './actions';

const mocks = vi.hoisted(() => ({
  configureServerClient: vi.fn(),
  postExercises: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({ configureServerClient: mocks.configureServerClient }));
vi.mock('@/lib/api/sdk.gen', () => ({ postExercises: mocks.postExercises }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('createExerciseAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configureServerClient.mockResolvedValue({});
    mocks.postExercises.mockResolvedValue({
      data: {
        id: 'exercise-1',
        trainerId: 'trainer-1',
        name: 'Agachamento búlgaro',
        muscleGroup: 'legs',
        equipment: 'Halteres',
        videoUrl: 'https://videos.example/agachamento',
        instructions: 'Mantenha o tronco firme.',
        createdAt: '2026-08-07T12:00:00.000Z',
      },
      error: undefined,
      request: new Request('https://api.test'),
      response: new Response(null, { status: 201 }),
    });
  });

  it('encaminha a URL de vídeo opcional preenchida', async () => {
    const formData = new FormData();
    formData.set('name', 'Agachamento búlgaro');
    formData.set('muscleGroup', 'legs');
    formData.set('equipment', 'Halteres');
    formData.set('instructions', 'Mantenha o tronco firme.');
    formData.set('videoUrl', 'https://videos.example/agachamento');

    await expect(createExerciseAction(null, formData)).resolves.toBeNull();
    expect(mocks.postExercises).toHaveBeenCalledWith({
      client: {},
      body: {
        name: 'Agachamento búlgaro',
        muscleGroup: 'legs',
        equipment: 'Halteres',
        instructions: 'Mantenha o tronco firme.',
        videoUrl: 'https://videos.example/agachamento',
      },
    });
  });
});
