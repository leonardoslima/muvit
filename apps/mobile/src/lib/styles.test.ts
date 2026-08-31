import { describe, expect, it } from 'vitest';
import { colors, controlSizes, radii, typography } from './styles';

describe('foundation visual mobile', () => {
  it('preserva a paleta incumbente e seus papéis semânticos', () => {
    expect(colors).toMatchObject({
      background: '#F5F3EF',
      surface: '#FFFFFF',
      ink: '#1A1A1A',
      line: '#D1CCC4',
      primary: '#2ECC71',
    });
    expect(colors.dangerSoft).toBe('#E74C3C18');
    expect(colors.scrim).toBe('#00000040');
    expect(colors.surfaceTranslucent).toBe('#FFFFFFB3');
    expect(colors.primaryText).toBe('#167A45');
    expect(colors.warningText).toBe('#8A4B00');
    expect(colors.dangerText).toBe('#B42318');
  });

  it('centraliza dimensões, raios e escala tipográfica usados no mobile', () => {
    expect(controlSizes.button).toBe(48);
    expect(controlSizes.tabBar).toBe(64);
    expect(controlSizes.touchTarget).toBe(44);
    expect(radii.md).toBe(10);
    expect(radii.sheet).toBe(28);
    expect(typography.headline).toMatchObject({
      fontFamily: 'SpaceGrotesk_600SemiBold',
      fontSize: 28,
    });
    expect(typography.body).toMatchObject({
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 22,
    });
  });
});
