import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates required payload before client and upload side effects', async () => {
    mocks.configureServerClient.mockResolvedValue({ getConfig: () => ({}) });
    mocks.uploadFileWithPresignedUrl.mockResolvedValue('https://cdn.test/photo.jpg');

    const formData = new FormData();
    formData.set('date', '');
    formData.set('photoFront', new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }));

    await expect(createAssessmentAction('student-1', null, formData)).resolves.toEqual({
      error: 'Informe a data.',
    });

    expect(mocks.configureServerClient).not.toHaveBeenCalled();
    expect(mocks.uploadFileWithPresignedUrl).not.toHaveBeenCalled();
    expect(mocks.postStudentsByStudentIdAssessments).not.toHaveBeenCalled();
  });

  it('envia as fotos de progresso e salva todas as URLs na avaliação', async () => {
    mocks.configureServerClient.mockResolvedValue({ getConfig: () => ({}) });
    mocks.uploadFileWithPresignedUrl
      .mockResolvedValueOnce('https://cdn.test/front.jpg')
      .mockResolvedValueOnce('https://cdn.test/back.jpg')
      .mockResolvedValueOnce('https://cdn.test/side.jpg');
    mocks.postStudentsByStudentIdAssessments.mockResolvedValue({
      data: { id: 'assessment-1' },
      error: undefined,
    });

    const formData = new FormData();
    formData.set('date', '2026-07-17');
    formData.set('photoFront', new File(['front'], 'front.jpg', { type: 'image/jpeg' }));
    formData.set('photoBack', new File(['back'], 'back.jpg', { type: 'image/jpeg' }));
    formData.set('photoSide', new File(['side'], 'side.jpg', { type: 'image/jpeg' }));

    await createAssessmentAction('student-1', null, formData);

    expect(mocks.uploadFileWithPresignedUrl).toHaveBeenCalledTimes(3);
    expect(mocks.postStudentsByStudentIdAssessments).toHaveBeenCalledWith({
      client: { getConfig: expect.any(Function) },
      path: { studentId: 'student-1' },
      body: expect.objectContaining({
        photos: [
          'https://cdn.test/front.jpg',
          'https://cdn.test/back.jpg',
          'https://cdn.test/side.jpg',
        ],
      }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/students/student-1');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/students/student-1/assessments');
    expect(mocks.redirect).toHaveBeenCalledWith('/students/student-1/assessments');
  });
});
