import { describe, expect, it } from 'vitest';
import { trainerProfileSchema, updateTrainerProfileSchema } from './trainers.js';

describe('contratos de treinador', () => {
  it('normaliza os campos textuais e preserva o perfil público', () => {
    expect(
      trainerProfileSchema.parse({
        id: '10000000-0000-4000-8000-000000000001',
        name: '  João Pereira  ',
        email: 'joao@example.com',
        phone: null,
        bio: null,
        specialties: ['  Hipertrofia  '],
        avatarUrl: null,
        plan: 'pro',
        onboardedAt: null,
        createdAt: '2026-08-07T12:00:00.000Z',
        updatedAt: '2026-08-07T12:00:00.000Z',
      }),
    ).toMatchObject({ name: 'João Pereira', specialties: ['Hipertrofia'] });
  });

  it('exige pelo menos uma alteração válida no perfil', () => {
    expect(updateTrainerProfileSchema.safeParse({}).success).toBe(false);
    expect(
      updateTrainerProfileSchema.parse({
        name: 'João Pereira',
        email: 'joao@example.com',
        phone: '+55 11 99999-9999',
        bio: 'Treinador especializado em força.',
        specialties: ['Hipertrofia'],
      }),
    ).toMatchObject({ email: 'joao@example.com' });
  });
});
