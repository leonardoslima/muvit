import { describe, expect, it, vi } from 'vitest';
import { createAssessmentAction } from './actions';

const mocks = vi.hoisted(() => ({
  configureServerClient: vi.fn(),
  postStudentsByStudentIdAssessments: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  uploadFileWithPresignedUrl: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  configureServerClient: mocks.configureServerClient,
}));

vi.mock('@/lib/api/sdk.gen', () => ({
  postStudentsByStudentIdAssessments: mocks.postStudentsByStudentIdAssessments,
}));

vi.mock('@/lib/uploads', () => ({
  uploadFileWithPresignedUrl: mocks.uploadFileWithPresignedUrl,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

describe('createAssessmentAction', () => {
  it('validates required payload before client and upload side effects', async () => {
    mocks.configureServerClient.mockResolvedValue({ getConfig: () => ({}) });
    mocks.uploadFileWithPresignedUrl.mockResolvedValue('https://cdn.test/photo.jpg');

    const formData = new FormData();
    formData.set('date', '');
    formData.set('photo', new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));

    await expect(createAssessmentAction('student-1', null, formData)).resolves.toEqual({
      error: 'Informe a data.',
    });

    expect(mocks.configureServerClient).not.toHaveBeenCalled();
    expect(mocks.uploadFileWithPresignedUrl).not.toHaveBeenCalled();
    expect(mocks.postStudentsByStudentIdAssessments).not.toHaveBeenCalled();
  });
});
