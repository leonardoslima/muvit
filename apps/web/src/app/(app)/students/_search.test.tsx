import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudentSearch } from './_search';

const navigationState = vi.hoisted(() => ({
  replace: vi.fn(),
  currentSearch: '',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigationState.replace }),
  useSearchParams: () => new URLSearchParams(navigationState.currentSearch),
}));

function renderStudentSearch(currentSearch: string) {
  vi.useFakeTimers();
  navigationState.currentSearch = currentSearch;
  navigationState.replace.mockClear();
  render(<StudentSearch />);
  return { replace: navigationState.replace };
}

describe('StudentSearch', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicia com o termo de busca atual e atualiza a URL com debounce', async () => {
    const { replace } = renderStudentSearch('status=active&q=ana');

    const input = screen.getByPlaceholderText(/Buscar aluno/);
    expect(input).toHaveValue('ana');

    fireEvent.change(input, { target: { value: 'bia' } });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(replace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(replace).toHaveBeenLastCalledWith('?status=active&q=bia');
  });

  it('remove apenas o parametro de busca quando o campo fica vazio', () => {
    const { replace } = renderStudentSearch('status=active&q=ana');

    fireEvent.change(screen.getByPlaceholderText(/Buscar aluno/), { target: { value: '' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(replace).toHaveBeenLastCalledWith('?status=active');
  });
});
