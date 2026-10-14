import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import { colors, controlSizes } from '../../lib/design-system/tokens';
import { AssessmentPhotoGrid } from './assessment-photo-grid';

function photos(count: number): { uri: string }[] {
  return Array.from({ length: count }, (_, index) => ({ uri: `file:///${index + 1}.jpg` }));
}

describe('AssessmentPhotoGrid', () => {
  it('mostra oito fotos e mantém a ação de adicionar na célula seguinte sem limite configurado', () => {
    const onAdd = vi.fn();
    render(<AssessmentPhotoGrid onAdd={onAdd} photos={photos(8)} />);

    expect(
      Array.from({ length: 8 }, (_, index) => screen.getByLabelText(`Prévia da foto ${index + 1}`)),
    ).toHaveLength(8);
    const addButton = screen.getByRole('button', { name: 'Adicionar foto' });
    expect(addButton).toBeTruthy();
    expect(addButton.props.children[0].props.style.backgroundColor).toBe(colors.primary);
    expect(addButton.props.children[0].props.children.props.color).toBe(colors.brand);
    fireEvent.press(addButton);
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('não oferece ações em modo somente leitura', () => {
    render(<AssessmentPhotoGrid photos={photos(2)} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('Prévia da foto 1')).toBeTruthy();
    expect(screen.getByLabelText('Prévia da foto 2')).toBeTruthy();
  });

  it('abre a foto pressionada usando seu índice atual', () => {
    const onOpen = vi.fn();
    render(<AssessmentPhotoGrid onOpen={onOpen} photos={photos(3)} />);

    fireEvent.press(screen.getByRole('button', { name: 'Abrir foto 2' }));

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it.each([
    { label: 'primeira', button: 'Remover foto 1', index: 0 },
    { label: 'última', button: 'Remover foto 3', index: 2 },
  ])('remove a $label foto pelo índice correto e mantém o alvo de 48 dp', ({ button, index }) => {
    const onRemove = vi.fn();
    render(<AssessmentPhotoGrid onRemove={onRemove} photos={photos(3)} />);

    const removeButton = screen.getByRole('button', { name: button });
    expect(removeButton.props.style).toEqual(
      expect.objectContaining({
        height: controlSizes.touch,
        width: controlSizes.touch,
      }),
    );
    expect(removeButton.props.children.props.style).toEqual(
      expect.objectContaining({ backgroundColor: colors.brand }),
    );
    expect(removeButton.props.children.props.className).toContain('rounded-full');
    expect(removeButton.props.children.props.children.props).toEqual(
      expect.objectContaining({ color: colors.surface, size: 16 }),
    );

    fireEvent.press(removeButton);

    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledWith(index);
  });

  it('mantém fotos com URI repetida distintas e remove pela posição', () => {
    const onRemove = vi.fn();
    const repeated = { uri: 'file:///repeated.jpg' };
    render(<AssessmentPhotoGrid onRemove={onRemove} photos={[repeated, repeated]} />);

    expect(screen.getByLabelText('Prévia da foto 1').props.source.uri).toBe(repeated.uri);
    expect(screen.getByLabelText('Prévia da foto 2').props.source.uri).toBe(repeated.uri);
    fireEvent.press(screen.getByRole('button', { name: 'Remover foto 2' }));

    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it.each([
    { label: 'zero', source: { width: 0, height: 200 } },
    { label: 'NaN', source: { width: Number.NaN, height: 200 } },
    { label: 'dimensões ausentes', source: {} },
  ])(
    'mantém a proporção de fallback 1:2 com dimensões de imagem inválidas: $label',
    ({ source }) => {
      render(<AssessmentPhotoGrid photos={photos(1)} />);
      const image = screen.getByLabelText('Prévia da foto 1');

      fireEvent(image, 'load', { nativeEvent: { source } });

      expect(screen.getByLabelText('Prévia da foto 1').props.style.aspectRatio).toBe(0.5);
    },
  );

  it('atualiza a proporção depois de carregar dimensões válidas', () => {
    render(<AssessmentPhotoGrid photos={photos(1)} />);
    const image = screen.getByLabelText('Prévia da foto 1');

    fireEvent(image, 'load', { nativeEvent: { source: { width: 300, height: 200 } } });

    expect(screen.getByLabelText('Prévia da foto 1').props.style.aspectRatio).toBe(1.5);
  });

  it('bloqueia abertura, adição e remoção enquanto disabled', () => {
    const onAdd = vi.fn();
    const onOpen = vi.fn();
    const onRemove = vi.fn();
    render(
      <AssessmentPhotoGrid
        disabled
        onAdd={onAdd}
        onOpen={onOpen}
        onRemove={onRemove}
        photos={photos(1)}
      />,
    );

    const buttons = [
      screen.getByRole('button', { name: 'Abrir foto 1' }),
      screen.getByRole('button', { name: 'Remover foto 1' }),
      screen.getByRole('button', { name: 'Adicionar foto' }),
    ];
    for (const button of buttons) {
      expect(button.props.accessibilityState.disabled).toBe(true);
      fireEvent.press(button);
    }

    expect(onAdd).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
