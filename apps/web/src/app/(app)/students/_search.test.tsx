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
  const utils = render(<StudentSearch />);
  return { replace: navigationState.replace, ...utils };
}

function rerenderWithSearch(utils: ReturnType<typeof renderStudentSearch>, currentSearch: string) {
  navigationState.currentSearch = currentSearch;
  utils.rerender(<StudentSearch />);
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('StudentSearch', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('inicia com o termo atual e não reescreve a URL ao montar', () => {
    const { replace } = renderStudentSearch('status=active&q=ana');

    expect(screen.getByPlaceholderText(/Buscar aluno/)).toHaveValue('ana');

    advance(300);

    expect(replace).not.toHaveBeenCalled();
  });

  it('inicia vazio quando não há termo e não navega na montagem', () => {
    const { replace } = renderStudentSearch('status=active');

    expect(screen.getByPlaceholderText(/Buscar aluno/)).toHaveValue('');

    advance(300);

    expect(replace).not.toHaveBeenCalled();
  });

  it('atualiza a URL com debounce ao digitar', () => {
    const { replace } = renderStudentSearch('status=active&q=ana');

    fireEvent.change(screen.getByPlaceholderText(/Buscar aluno/), { target: { value: 'bia' } });

    advance(299);
    expect(replace).not.toHaveBeenCalled();

    advance(1);
    expect(replace).toHaveBeenLastCalledWith('?status=active&q=bia');
  });

  it('alterar a busca na página 2 remove page e preserva o status', () => {
    const { replace } = renderStudentSearch('status=paused&page=2&q=ana');

    fireEvent.change(screen.getByPlaceholderText(/Buscar aluno/), { target: { value: 'bia' } });
    advance(300);

    expect(replace).toHaveBeenLastCalledWith('?status=paused&q=bia');
  });

  it('limpar a busca remove q e page preservando o status', () => {
    const { replace } = renderStudentSearch('status=paused&page=2&q=ana');

    fireEvent.change(screen.getByPlaceholderText(/Buscar aluno/), { target: { value: '' } });
    advance(300);

    expect(replace).toHaveBeenLastCalledWith('?status=paused');
  });

  it('navegação que muda apenas a página não dispara replace', () => {
    const utils = renderStudentSearch('page=2');

    advance(300);
    expect(utils.replace).not.toHaveBeenCalled();

    rerenderWithSearch(utils, 'page=3');
    advance(300);

    expect(utils.replace).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/Buscar aluno/)).toHaveValue('');
  });

  it('sincroniza o campo com q externo sem reescrever o termo anterior', () => {
    const utils = renderStudentSearch('q=ana');

    rerenderWithSearch(utils, 'status=active&q=bia');

    expect(screen.getByPlaceholderText(/Buscar aluno/)).toHaveValue('bia');

    advance(300);

    expect(utils.replace).not.toHaveBeenCalled();
  });

  it('descarta termo digitado quando a URL muda antes do debounce', () => {
    const utils = renderStudentSearch('q=ana');

    fireEvent.change(screen.getByPlaceholderText(/Buscar aluno/), { target: { value: 'bia' } });
    rerenderWithSearch(utils, 'q=carla');

    expect(screen.getByPlaceholderText(/Buscar aluno/)).toHaveValue('carla');

    advance(300);

    expect(utils.replace).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText(/Buscar aluno/)).toHaveValue('carla');
  });
});
