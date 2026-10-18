import { fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import type { TextInput } from 'react-native';
import { describe, expect, it, vi } from 'vitest';
import { Field } from './field';
import { NumericField } from './numeric-field';

describe('campos v2', () => {
  it('NumericField imersivo destaca a superfície inteira no foco, prioriza erro e restaura após blur', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const props = {
      label: 'Carga',
      value: '40',
      variant: 'immersive' as const,
      onChangeText: vi.fn(),
      onIncrement: vi.fn(),
      onDecrement: vi.fn(),
      onFocus,
      onBlur,
      testID: 'carga',
    };
    const view = render(<NumericField {...props} />);
    fireEvent(screen.getByLabelText('Carga'), 'focus', { nativeEvent: {} });
    expect(screen.getByTestId('carga-surface').props.className).toContain('border-v2-primary');
    expect(screen.getByTestId('carga-surface').props.className).toContain('border-2');
    expect(onFocus).toHaveBeenCalledOnce();
    view.rerender(<NumericField {...props} error="Informe uma carga válida em kg." />);
    expect(screen.getByTestId('carga-surface').props.className).toContain('border-v2-error');
    expect(screen.getByTestId('carga-surface').props.className).not.toContain('border-v2-primary');
    expect(screen.getByRole('alert').props.className).toContain('text-v2-errorBg');
    view.rerender(<NumericField {...props} />);
    fireEvent(screen.getByLabelText('Carga'), 'blur', { nativeEvent: {} });
    expect(onBlur).toHaveBeenCalledOnce();
    expect(screen.getByTestId('carga-surface').props.className).toContain(
      'border-v2-sessionBorder',
    );
    expect(screen.getByTestId('carga-surface').props.className).not.toContain('border-2');
  });

  it('NumericField imersivo desabilitado mantém a paleta do design e bloqueia digitação e passos', () => {
    const change = vi.fn();
    const step = vi.fn();
    const props = {
      label: 'Carga',
      value: '40',
      variant: 'immersive' as const,
      onChangeText: change,
      onIncrement: step,
      onDecrement: step,
      testID: 'carga',
    };
    const view = render(<NumericField {...props} />);
    fireEvent(screen.getByLabelText('Carga'), 'focus', { nativeEvent: {} });
    view.rerender(<NumericField {...props} editable={false} />);
    const surface = screen.getByTestId('carga-surface');
    expect(surface.props.className).not.toContain('border-v2-primary');
    expect(surface.props.className).not.toContain('opacity-50');
    expect(screen.getByLabelText('Carga').props.className).toContain('text-v2-sessionSecondary');
    const increase = screen.getByRole('button', { name: 'Aumentar Carga' });
    expect(increase.props.className).toContain('bg-v2-sessionSurface');
    expect(increase.props.className).toContain('opacity-100');
    fireEvent.changeText(screen.getByLabelText('Carga'), '50');
    fireEvent.press(increase);
    expect(change).not.toHaveBeenCalled();
    expect(step).not.toHaveBeenCalled();
  });

  it('preserva label, valor controlado, unidade e erro local', () => {
    const onChangeText = vi.fn();
    render(
      <Field
        label="Carga"
        value="40,5"
        onChangeText={onChangeText}
        unit="kg"
        error="Confira a carga informada."
        hint="Digite sua carga"
      />,
    );
    const input = screen.getByLabelText('Carga');
    expect(input.props.value).toBe('40,5');
    expect(screen.getByText('Carga')).toBeTruthy();
    expect(screen.getByText('kg')).toBeTruthy();
    expect(screen.getByRole('alert').props.children).toBe('Confira a carga informada.');
    fireEvent.changeText(input, '');
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it.each(['default', 'immersive'] as const)(
    'acompanha foco/blur nativos em %s sem perder callbacks e ref',
    (variant) => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const onSubmitEditing = vi.fn();
      const ref = createRef<TextInput>();
      const nativeInput = { focus: vi.fn(), blur: vi.fn() };
      render(
        <Field
          ref={ref}
          label="Nome"
          value="Ana"
          onChangeText={vi.fn()}
          variant={variant}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={onSubmitEditing}
          testID="nome"
        />,
        { createNodeMock: () => nativeInput },
      );
      expect(ref.current).toBe(nativeInput);
      fireEvent(screen.getByLabelText('Nome'), 'focus', { nativeEvent: {} });
      expect(onFocus).toHaveBeenCalledOnce();
      expect(screen.getByTestId('nome-control').props.className).toContain('border-2');
      fireEvent(screen.getByLabelText('Nome'), 'blur', { nativeEvent: {} });
      expect(onBlur).toHaveBeenCalledOnce();
      expect(screen.getByTestId('nome-control').props.className).not.toContain('border-2');
      fireEvent(screen.getByLabelText('Nome'), 'submitEditing', { nativeEvent: { text: 'Ana' } });
      expect(onSubmitEditing).toHaveBeenCalledOnce();
    },
  );

  it.each([
    { disabled: true, editable: true },
    { disabled: false, editable: false },
  ])('não permite edição com %o', (state) => {
    const change = vi.fn();
    render(
      <Field
        {...state}
        label="Nome"
        value="Ana"
        onChangeText={change}
        accessibilityState={{ disabled: false }}
      />,
    );
    const input = screen.getByLabelText('Nome');
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(input, 'Outra');
    expect(change).not.toHaveBeenCalled();
  });

  it.each([
    { disabled: true, readOnly: false },
    { loading: true, readOnly: false },
    { editable: false, readOnly: false },
  ])('readOnly false não reativa campo bloqueado com %o', (state) => {
    const change = vi.fn();
    render(
      <Field
        {...state}
        label="Nome"
        value="Ana"
        onChangeText={change}
        accessibilityState={{ disabled: false, busy: false }}
      />,
    );
    const input = screen.getByLabelText('Nome');
    expect(input.props.editable).toBe(false);
    expect(input.props.readOnly).toBe(true);
    fireEvent.changeText(input, 'Outra');
    expect(change).not.toHaveBeenCalled();
  });

  it('usa entrada segura, busca e teclado numérico sem converter valores', () => {
    render(
      <>
        <Field kind="password" label="Senha" value="" onChangeText={vi.fn()} />
        <Field kind="search" label="Buscar" value="" onChangeText={vi.fn()} />
        <Field kind="numeric" label="Medida" value="" onChangeText={vi.fn()} />
      </>,
    );
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText('Buscar').props.returnKeyType).toBe('search');
    expect(screen.getByLabelText('Medida').props.keyboardType).toBe('decimal-pad');
  });

  it('NumericField chama o caller e preserva string vazia', () => {
    const change = vi.fn();
    const increment = vi.fn();
    const decrement = vi.fn();
    render(
      <NumericField
        label="Carga"
        value=""
        onChangeText={change}
        onIncrement={increment}
        onDecrement={decrement}
        unit="kg"
      />,
    );
    expect(screen.getByLabelText('Carga').props.value).toBe('');
    fireEvent.press(screen.getByRole('button', { name: 'Aumentar Carga' }));
    fireEvent.press(screen.getByRole('button', { name: 'Diminuir Carga' }));
    expect(increment).toHaveBeenCalledOnce();
    expect(decrement).toHaveBeenCalledOnce();
    expect(change).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Carga'), '2,5');
    expect(change).toHaveBeenCalledWith('2,5');
  });

  it('NumericField bloqueia os dois controles e entrada quando não editável', () => {
    const increment = vi.fn();
    const decrement = vi.fn();
    render(
      <NumericField
        label="Repetições"
        value="8"
        onChangeText={vi.fn()}
        onIncrement={increment}
        onDecrement={decrement}
        editable={false}
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Aumentar Repetições' }));
    fireEvent.press(screen.getByRole('button', { name: 'Diminuir Repetições' }));
    expect(increment).not.toHaveBeenCalled();
    expect(decrement).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Repetições').props.editable).toBe(false);
  });

  it('NumericField readOnly bloqueia a entrada e os controles de incremento', () => {
    const increment = vi.fn();
    const decrement = vi.fn();
    const change = vi.fn();
    render(
      <NumericField
        label="Repetições"
        value="8"
        onChangeText={change}
        onIncrement={increment}
        onDecrement={decrement}
        readOnly
      />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Aumentar Repetições' }));
    fireEvent.press(screen.getByRole('button', { name: 'Diminuir Repetições' }));
    fireEvent.changeText(screen.getByLabelText('Repetições'), '9');
    expect(increment).not.toHaveBeenCalled();
    expect(decrement).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it('Field readOnly mantém input acessível, sem teclado e sem alterações', () => {
    const change = vi.fn();
    render(<Field label="Somente leitura" value="Não editar" onChangeText={change} readOnly />);
    const input = screen.getByLabelText('Somente leitura');
    expect(input.props.editable).toBe(false);
    expect(input.props.showSoftInputOnFocus).toBe(false);
    expect(input.props.accessibilityState.disabled).toBe(false);
    expect(input.props['aria-disabled']).toBe(false);
    fireEvent.changeText(input, 'Alterar');
    expect(change).not.toHaveBeenCalled();
  });
});
