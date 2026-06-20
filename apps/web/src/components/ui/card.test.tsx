import { render } from '@testing-library/react';
import { type ComponentProps, type Ref, createRef } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { CardDescription, CardTitle } from './card';

describe('Card semantic elements', () => {
  it('exposes refs matching the heading and paragraph rendered elements', () => {
    type CardTitleRef = ComponentProps<typeof CardTitle>['ref'];
    type CardDescriptionRef = ComponentProps<typeof CardDescription>['ref'];

    expectTypeOf<CardTitleRef>().toEqualTypeOf<Ref<HTMLHeadingElement> | undefined>();
    expectTypeOf<CardDescriptionRef>().toEqualTypeOf<Ref<HTMLParagraphElement> | undefined>();

    const titleRef = createRef<HTMLHeadingElement>();
    const descriptionRef = createRef<HTMLParagraphElement>();
    render(
      <>
        <CardTitle ref={titleRef}>Titulo</CardTitle>
        <CardDescription ref={descriptionRef}>Descricao</CardDescription>
      </>,
    );

    expect(titleRef.current).toBeInstanceOf(HTMLHeadingElement);
    expect(descriptionRef.current).toBeInstanceOf(HTMLParagraphElement);
  });
});
