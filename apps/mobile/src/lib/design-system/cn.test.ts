import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('composição de classes do Design System', () => {
  it('permite override do consumidor e remove classes condicionais falsas', () => {
    expect(cn('px-4 bg-v2-primary', false, undefined, { 'opacity-50': false }, 'px-6')).toBe(
      'bg-v2-primary px-6',
    );
  });
});
