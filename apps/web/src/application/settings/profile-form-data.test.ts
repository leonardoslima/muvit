import { describe, expect, it } from 'vitest';
import { parseProfileFormData } from './profile-form-data';

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
});
