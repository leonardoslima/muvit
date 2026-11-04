import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateNotificationPreferencesAction } from './actions';

const mocks = vi.hoisted(() => ({
  configureServerClient: vi.fn(),
  updateTrainerNotificationPreferences: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({ configureServerClient: mocks.configureServerClient }));
vi.mock('@/lib/api/sdk.gen', () => ({
  updateTrainerNotificationPreferences: mocks.updateTrainerNotificationPreferences,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

function formDataWithBlankInactivity(): FormData {
  const formData = new FormData();
  formData.set('inactivityEnabled', 'on');
  formData.set('inactivityAfterDays', '');
  formData.set('inactivityChannel', 'both');
  formData.set('workoutPlanExpiringDaysBefore', '7');
  formData.set('workoutPlanExpiringChannel', 'email');
  formData.set('pendingAssessmentStaleAfterDays', '60');
  formData.set('pendingAssessmentChannel', 'push');
  formData.set('newStudentRegistrationChannel', 'both');
  return formData;
}

describe('updateNotificationPreferencesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configureServerClient.mockResolvedValue({ name: 'client' });
    mocks.updateTrainerNotificationPreferences.mockResolvedValue({ data: {}, error: undefined });
  });

  it('devolve erro do campo vazio sem chamar a API', async () => {
    await expect(
      updateNotificationPreferencesAction(null, formDataWithBlankInactivity()),
    ).resolves.toEqual({
      error: 'Revise os campos destacados.',
      fieldErrors: { inactivityAfterDays: 'Informe os dias de inatividade.' },
    });
    expect(mocks.configureServerClient).not.toHaveBeenCalled();
    expect(mocks.updateTrainerNotificationPreferences).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
