import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStudentAction } from './actions';

const mocks = vi.hoisted(() => ({
  configureServerClient: vi.fn(),
  postStudents: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({ configureServerClient: mocks.configureServerClient }));
vi.mock('@/lib/api/sdk.gen', () => ({ postStudents: mocks.postStudents }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

describe('createStudentAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persiste uma vez e devolve o ID para o passo de sucesso', async () => {
    mocks.configureServerClient.mockResolvedValue({});
    mocks.postStudents.mockResolvedValue({ data: { id: 'student-42' }, error: undefined });
    const formData = new FormData();
    formData.set('name', 'Maria Costa');
    formData.set('goals', 'Hipertrofia');

    await expect(createStudentAction(null, formData)).resolves.toEqual({
      studentId: 'student-42',
    });

    expect(mocks.postStudents).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/students');
  });

  it('não acessa a API quando os dados básicos são inválidos', async () => {
    const formData = new FormData();
    formData.set('name', '');

    await expect(createStudentAction(null, formData)).resolves.toEqual({
      fieldErrors: { name: 'Informe o nome.' },
    });
    expect(mocks.configureServerClient).not.toHaveBeenCalled();
    expect(mocks.postStudents).not.toHaveBeenCalled();
  });
});
