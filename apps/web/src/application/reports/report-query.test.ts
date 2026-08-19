import { describe, expect, it } from 'vitest';
import { buildReportHref, parseReportSearchParams } from './report-query';

describe('report-query', () => {
  const validStudentId = '11111111-1111-4111-8111-111111111111';

  it('preserva aluno e período suportado vindos da URL', () => {
    expect(parseReportSearchParams({ studentId: validStudentId, range: '90d' })).toEqual({
      studentId: validStudentId,
      range: '90d',
    });
  });

  it('gera href customizado com ordem estável e datas válidas', () => {
    expect(
      buildReportHref({
        studentId: validStudentId,
        range: 'custom',
        from: '2026-01-01',
        to: '2026-02-01',
      }),
    ).toBe(
      '/reports?studentId=11111111-1111-4111-8111-111111111111&range=custom&from=2026-01-01&to=2026-02-01',
    );
  });

  it('rejeita studentId que não é UUID antes das consultas remotas', () => {
    expect(parseReportSearchParams({ studentId: 'x', range: '90d' })).toEqual({
      range: '90d',
      error: 'Identificador de aluno inválido.',
    });
  });

  it.each([
    [{ studentId: validStudentId, range: 'custom' }, 'Informe as datas inicial e final.'],
    [
      {
        studentId: validStudentId,
        range: 'custom',
        from: '2026-02-30',
        to: '2026-03-01',
      },
      'Informe datas válidas no formato AAAA-MM-DD.',
    ],
    [
      {
        studentId: validStudentId,
        range: 'custom',
        from: '2026-03-02',
        to: '2026-03-01',
      },
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
        studentId: ` ${validStudentId} `,
        range: '30d',
        from: '2026-01-01',
        to: '2026-02-01',
      }),
    ).toEqual({ studentId: validStudentId, range: '30d' });
  });

  it('usa 90 dias quando o período da URL não é suportado', () => {
    expect(parseReportSearchParams({ range: 'weekly' })).toEqual({ range: '90d' });
  });
});
