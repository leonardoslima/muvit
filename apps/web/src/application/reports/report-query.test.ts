import { describe, expect, it } from 'vitest';
import { buildReportHref, parseReportSearchParams } from './report-query';

describe('report-query', () => {
  it('preserva aluno e período suportado vindos da URL', () => {
    expect(parseReportSearchParams({ studentId: 'id', range: '90d' })).toEqual({
      studentId: 'id',
      range: '90d',
    });
  });

  it('gera href customizado com ordem estável e datas válidas', () => {
    expect(
      buildReportHref({
        studentId: 'id',
        range: 'custom',
        from: '2026-01-01',
        to: '2026-02-01',
      }),
    ).toBe('/reports?studentId=id&range=custom&from=2026-01-01&to=2026-02-01');
  });

  it.each([
    [{ studentId: 'id', range: 'custom' }, 'Informe as datas inicial e final.'],
    [
      { studentId: 'id', range: 'custom', from: '2026-02-30', to: '2026-03-01' },
      'Informe datas válidas no formato AAAA-MM-DD.',
    ],
    [
      { studentId: 'id', range: 'custom', from: '2026-03-02', to: '2026-03-01' },
      'A data inicial não pode ser posterior à data final.',
    ],
  ])('rejeita intervalo customizado inválido antes da consulta: %o', (params, message) => {
    expect(parseReportSearchParams(params)).toEqual({
      ...params,
      error: message,
    });
  });

  it('descarta datas quando o período não é customizado', () => {
    expect(
      parseReportSearchParams({
        studentId: ' aluno-1 ',
        range: '30d',
        from: '2026-01-01',
        to: '2026-02-01',
      }),
    ).toEqual({ studentId: 'aluno-1', range: '30d' });
  });

  it('usa 90 dias quando o período da URL não é suportado', () => {
    expect(parseReportSearchParams({ range: 'weekly' })).toEqual({ range: '90d' });
  });
});
