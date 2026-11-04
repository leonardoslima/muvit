import { describe, expect, it } from 'vitest';
import { buildProfileSubmission, parseProfileFormData } from './profile-form-data';

describe('parseProfileFormData', () => {
  it('normaliza o perfil antes de enviá-lo para a API', () => {
    const formData = new FormData();
    formData.set('name', '  João Pereira  ');
    formData.set('email', ' joao@example.com ');
    formData.set('phone', ' (11) 99999-0000 ');
    formData.set('bio', ' Personal trainer especializado em força. ');
    formData.set('specialties', ' Hipertrofia, Reabilitação, Hipertrofia ');
    formData.set('avatarUrl', ' https://cdn.example.com/avatar.jpg ');

    expect(parseProfileFormData(formData)).toEqual({
      name: 'João Pereira',
      email: 'joao@example.com',
      phone: '(11) 99999-0000',
      bio: 'Personal trainer especializado em força.',
      specialties: ['Hipertrofia', 'Reabilitação'],
      avatarUrl: 'https://cdn.example.com/avatar.jpg',
    });
  });

  it('preserva campos opcionais vazios como nulos para permitir sua remoção', () => {
    const formData = new FormData();
    formData.set('name', 'João Pereira');
    formData.set('email', 'joao@example.com');
    formData.set('phone', ' ');
    formData.set('bio', '');
    formData.set('specialties', '');
    formData.set('avatarUrl', '');

    expect(parseProfileFormData(formData)).toEqual({
      name: 'João Pereira',
      email: 'joao@example.com',
      phone: null,
      bio: null,
      specialties: [],
      avatarUrl: null,
    });
  });

  it('mapeia os limites do validator compartilhado para erros por campo', () => {
    const formData = new FormData();
    formData.set('name', '');
    formData.set('email', 'invalido');
    formData.set('phone', '1'.repeat(21));
    formData.set('bio', 'a'.repeat(2001));
    formData.set(
      'specialties',
      Array.from({ length: 11 }, (_, index) => `Área ${index}`).join(','),
    );
    formData.set('avatarUrl', 'arquivo-local');

    expect(buildProfileSubmission(formData)).toEqual({
      ok: false,
      state: {
        fieldErrors: {
          name: 'Informe seu nome.',
          email: 'Informe um e-mail válido.',
          phone: 'Informe um telefone com até 20 caracteres.',
          bio: 'A bio deve ter até 2000 caracteres.',
          specialties: 'Informe no máximo 10 especialidades de até 50 caracteres.',
          avatarUrl: 'Informe uma URL válida para o avatar.',
        },
      },
    });
  });
});
