import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentSearch } from './_search';

const replace = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe('StudentSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    currentSearch = '';
    replace.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicia com o termo de busca atual e atualiza a URL com debounce', async () => {
    currentSearch = 'status=active&q=ana';

    render(<StudentSearch />);

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
    currentSearch = 'status=active&q=ana';

    render(<StudentSearch />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar aluno/), { target: { value: '' } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(replace).toHaveBeenLastCalledWith('?status=active');
  });
});
