import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from 'vitest';
import { Text } from '../ui/v2/text';
import { TrainerMetricCard } from './trainer-metric-card';

describe('TrainerMetricCard', () => {
  it('apresenta o valor antes do rótulo', () => {
    render(<TrainerMetricCard label="Novos na semana" value={3} />);

    const textNodes = screen.UNSAFE_getAllByType(Text);

    expect(textNodes.map((node) => node.props.children)).toEqual([3, 'Novos na semana']);
  });
});
