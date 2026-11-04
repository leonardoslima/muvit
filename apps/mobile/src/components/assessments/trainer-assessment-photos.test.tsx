import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';
import type { AssessmentPhotoInput } from '../../application/assessments/assessment-form';
import { TrainerAssessmentPhotos } from './trainer-assessment-photos';

vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'View' }));

function photo(uri: string): AssessmentPhotoInput {
  return { uri, contentType: 'image/jpeg' };
}

describe('TrainerAssessmentPhotos', () => {
  it('abre a foto inteira e permite fechar a conferência', () => {
    render(
      <TrainerAssessmentPhotos
        disabled={false}
        onAdd={() => undefined}
        onRemove={() => undefined}
        photos={[photo('file:///one.jpg')]}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Abrir foto 1' }));
    const preview = screen.getByLabelText('Prévia ampliada da foto 1');
    expect(preview.props.source.uri).toBe('file:///one.jpg');
    expect(preview.props.resizeMode).toBe('contain');
    fireEvent.press(screen.getByRole('button', { name: 'Fechar fotos' }));
    expect(screen.queryByLabelText('Prévia ampliada da foto 1')).toBeNull();
  });

  it('mostra adicionar na próxima posição até três fotos', () => {
    const { rerender } = render(
      <TrainerAssessmentPhotos
        disabled={false}
        onAdd={() => undefined}
        onRemove={() => undefined}
        photos={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeTruthy();
    expect(screen.getByText('Até 3 fotos · JPEG ou PNG')).toBeTruthy();

    rerender(
      <TrainerAssessmentPhotos
        disabled={false}
        onAdd={() => undefined}
        onRemove={() => undefined}
        photos={[photo('file:///one.jpg')]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeTruthy();
    expect(screen.getByText('1 foto selecionada')).toBeTruthy();

    rerender(
      <TrainerAssessmentPhotos
        disabled={false}
        onAdd={() => undefined}
        onRemove={() => undefined}
        photos={[photo('file:///one.jpg'), photo('file:///two.jpg')]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Adicionar foto' })).toBeTruthy();
    expect(screen.getByText('2 fotos selecionadas')).toBeTruthy();

    rerender(
      <TrainerAssessmentPhotos
        disabled={false}
        onAdd={() => undefined}
        onRemove={() => undefined}
        photos={[photo('file:///one.jpg'), photo('file:///two.jpg'), photo('file:///three.jpg')]}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Adicionar foto' })).toBeNull();
  });

  it('rotula fotos pela ordem e encaminha o índice correto ao remover', () => {
    const onRemove = vi.fn();
    render(
      <TrainerAssessmentPhotos
        disabled={false}
        onAdd={() => undefined}
        onRemove={onRemove}
        photos={[photo('file:///one.jpg'), photo('file:///two.jpg')]}
      />,
    );

    expect(screen.getByText('Foto 1')).toBeTruthy();
    expect(screen.getByText('Foto 2')).toBeTruthy();
    expect(screen.getByLabelText('Prévia da foto 1').props.source.uri).toBe('file:///one.jpg');
    expect(screen.getByLabelText('Prévia da foto 2').props.source.uri).toBe('file:///two.jpg');
    expect(screen.getAllByRole('button', { name: 'Remover foto 1' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Remover foto 2' })).toHaveLength(1);

    fireEvent.press(screen.getByRole('button', { name: 'Remover foto 2' }));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('distingue fotos repetidas pela posição e renumera após remover a primeira', () => {
    const onRemove = vi.fn();
    const samePhoto = photo('file:///repeated.jpg');
    const { rerender } = render(
      <TrainerAssessmentPhotos
        disabled={false}
        onAdd={() => undefined}
        onRemove={onRemove}
        photos={[samePhoto, samePhoto]}
      />,
    );

    expect(screen.getByLabelText('Prévia da foto 1').props.source.uri).toBe('file:///repeated.jpg');
    expect(screen.getByLabelText('Prévia da foto 2').props.source.uri).toBe('file:///repeated.jpg');
    fireEvent.press(screen.getByRole('button', { name: 'Remover foto 1' }));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledWith(0);

    rerender(
      <TrainerAssessmentPhotos
        disabled={false}
        onAdd={() => undefined}
        onRemove={onRemove}
        photos={[samePhoto]}
      />,
    );
    expect(screen.getByText('Foto 1')).toBeTruthy();
    expect(screen.queryByText('Foto 2')).toBeNull();
    expect(screen.getByRole('button', { name: 'Remover foto 1' })).toBeTruthy();
  });

  it.each([
    { viewport: 320, content: 288, column: 138 },
    { viewport: 390, content: 358, column: 173 },
    { viewport: 430, content: 398, column: 193 },
  ])('mantém duas colunas e adicionar abaixo da grade em $viewport dp', ({ content, column }) => {
    render(
      <TrainerAssessmentPhotos
        disabled={false}
        onAdd={() => undefined}
        onRemove={() => undefined}
        photos={[photo('file:///one.jpg')]}
      />,
    );

    const upload = screen.getByRole('button', { name: 'Adicionar foto' });
    const grid = screen.getByTestId('trainer-assessment-photo-grid');
    fireEvent(grid, 'layout', {
      nativeEvent: { layout: { width: content, height: 400, x: 0, y: 0 } },
    });

    const photoCell = screen.getByLabelText('Prévia da foto 1').parent?.parent?.parent?.parent;
    expect(photoCell?.props.style?.width).toBe(column);
    expect(upload.props.style).toBeUndefined();
    expect(upload.parent).not.toBe(grid);
    expect(screen.getByLabelText('Prévia da foto 1').props.style.aspectRatio).toBe(1);
  });

  it('bloqueia adicionar e remover durante o envio', () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    render(
      <TrainerAssessmentPhotos
        disabled
        onAdd={onAdd}
        onRemove={onRemove}
        photos={[photo('file:///one.jpg')]}
      />,
    );

    const addButton = screen.getByRole('button', { name: 'Adicionar foto' });
    const removeButton = screen.getByRole('button', { name: 'Remover foto 1' });
    expect(addButton.props.accessibilityState.disabled).toBe(true);
    expect(removeButton.props.accessibilityState.disabled).toBe(true);
    expect(addButton.props.className).toContain('opacity-50');
    fireEvent.press(addButton);
    fireEvent.press(removeButton);
    expect(onAdd).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
