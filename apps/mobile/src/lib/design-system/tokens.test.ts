import { describe, expect, it } from 'vitest';
import { colors, typography } from '../styles';
import { penTokens, v2ControlSizes, v2Typography } from './tokens';

// Fixture obtida por GetVariables no Pen aprovado, conferida em 09/10/2026.
const approvedPenTokens = {
  'color/bg/default': '#F6F5EF',
  'color/surface/default': '#FFFFFF',
  'color/text/primary': '#15372E',
  'color/text/brand': '#2F6B50',
  'color/text/secondary': '#607064',
  'color/action/primary': '#C9F36C',
  'color/surface/subtle': '#EBF0E8',
  'color/border/default': '#DDE6DC',
  'color/text/on-brand-secondary': '#C5D8CC',
  'color/border/on-brand': '#567465',
  'color/icon/inactive': '#67776D',
  'color/session/bg': '#0D1512',
  'color/session/surface': '#17231D',
  'color/session/raised': '#203128',
  'color/session/border': '#31443A',
  'color/session/text': '#F3F7EF',
  'color/session/text-secondary': '#AEBCAF',
  'color/action/pressed': '#B5DB61',
  'color/action/disabled': '#DDE6DC',
  'color/text/disabled': '#607064',
  'color/feedback/error': '#A83232',
  'color/feedback/error-bg': '#FCECEC',
  'color/feedback/warning': '#7A5313',
  'color/feedback/warning-bg': '#FFF2D9',
  'color/feedback/success': '#2F6B50',
  'color/feedback/success-bg': '#EBF0E8',
  'color/feedback/info': '#285C75',
  'color/feedback/info-bg': '#EAF3F7',
  'color/scrim': '#0D151299',
  'font/family': 'DM Sans',
  'font/size/10': 10,
  'font/size/11': 11,
  'font/size/12': 12,
  'font/size/13': 13,
  'font/size/14': 14,
  'font/size/15': 15,
  'font/size/16': 16,
  'font/size/17': 17,
  'font/size/19': 19,
  'font/size/20': 20,
  'font/size/21': 21,
  'font/size/22': 22,
  'font/size/25': 25,
  'font/size/26': 26,
  'font/size/27': 27,
  'font/size/29': 29,
  'font/size/30': 30,
  'font/size/31': 31,
  'font/size/35': 35,
  'font/size/43': 43,
  'font/size/50': 50,
  'font/size/84': 84,
  'font/weight/400': '400',
  'font/weight/500': '500',
  'font/weight/600': '600',
  'font/weight/700': '700',
  'font/weight/800': '800',
  'space/0': 0,
  'space/4': 4,
  'space/6': 6,
  'space/8': 8,
  'space/12': 12,
  'space/16': 16,
  'space/20': 20,
  'space/24': 24,
  'space/32': 32,
  'space/48': 48,
  'space/64': 64,
  'radius/3': 3,
  'radius/4': 4,
  'radius/13': 13,
  'radius/20': 20,
  'radius/21': 21,
  'radius/24': 24,
  'radius/25': 25,
  'radius/26': 26,
  'radius/27': 27,
  'radius/29': 29,
  'radius/30': 30,
  'radius/33': 33,
  'radius/34': 34,
  'size/touch': 48,
  'size/button': 58,
  'size/button/compact': 52,
  'size/icon': 22,
  'size/tabbar': 67,
  'stroke/default': 1,
  'stroke/focus': 2,
  'layout/gutter': 16,
  'layout/text-inset': 6,
  'layout/section-gap': 24,
  'layout/safe-top-reference': 62,
  'layout/safe-bottom-reference': 34,
  'elevation/base': 0,
  'elevation/sticky': 1,
  'elevation/overlay': 2,
};

describe('contrato de exportação dos tokens v2', () => {
  it('oferece o catálogo aprovado completo ao pipeline e aos primitives', () => {
    expect(penTokens).toEqual(approvedPenTokens);
    expect(Object.keys(penTokens)).toHaveLength(96);
  });

  it('deriva dimensões mínimas sem fixar a altura do conteúdo', () => {
    expect(v2ControlSizes).toMatchObject({
      touch: 48,
      button: 58,
      compact: 52,
      field: 52,
      authField: 58,
    });
    expect(v2Typography.body).toMatchObject({
      fontSize: 14,
      lineHeight: 19.6,
      fontFamily: 'DMSans_400Regular',
    });
    expect(v2Typography.screenTitle).toMatchObject({
      fontSize: 30,
      lineHeight: 36,
      fontFamily: 'DMSans_800ExtraBold',
    });
  });

  it('permite consumir v2 sem mudar a foundation dos consumidores existentes', () => {
    expect(colors.background).toBe('#F5F3EF');
    expect(colors.primary).toBe('#2ECC71');
    expect(typography.body.fontFamily).toBe('Inter_400Regular');
  });
});
