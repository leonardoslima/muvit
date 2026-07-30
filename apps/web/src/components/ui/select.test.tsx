import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

describe('Select', () => {
  it('applies Radix popper positioning classes when requested', () => {
    render(
      <Select defaultOpen defaultValue="active">
        <SelectTrigger aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent data-testid="select-content" position="popper">
          <SelectItem value="active">Ativo</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByTestId('select-content')).toHaveClass(
      'origin-[var(--radix-select-content-transform-origin)]',
    );
  });
});
