import { describe, expect, it } from 'vitest';
import { parseSubscriptionFormData } from './subscription-form-data';

describe('parseSubscriptionFormData', () => {
  it('aceita somente planos e periodicidades disponíveis', () => {
    const formData = new FormData();
    formData.set('plan', 'team');
    formData.set('billingInterval', 'annual');

    expect(parseSubscriptionFormData(formData)).toEqual({
      ok: true,
      body: { plan: 'team', billingInterval: 'annual' },
    });
  });

  it('rejeita uma alteração de plano incompleta', () => {
    const formData = new FormData();
    formData.set('plan', 'enterprise');

    expect(parseSubscriptionFormData(formData)).toEqual({
      ok: false,
      error: 'Selecione um plano e uma periodicidade válidos.',
    });
  });
});
