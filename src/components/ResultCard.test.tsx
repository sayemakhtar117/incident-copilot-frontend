// Runtime validation coverage for: analysis results and remediation actions.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { analysisFixture } from '../test/fixtures';
import ResultCard from './ResultCard';

describe('ResultCard', () => {
  it('updates remediation checklist progress as steps are completed', () => {
    render(
      <ResultCard
        result={analysisFixture}
        alert="Checkout requests are timing out"
        onOpenSource={vi.fn()}
        onSaveAsIncident={vi.fn()}
      />,
    );

    expect(screen.getByText('(0/2)')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Check connection leaks'));
    expect(screen.getByText('(1/2)')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Review pool limits'));
    expect(screen.getByText('(2/2)')).toBeInTheDocument();
  });

  it('opens the selected source and offers to save the analysis', () => {
    const onOpenSource = vi.fn();
    const onSaveAsIncident = vi.fn();
    render(
      <ResultCard
        result={analysisFixture}
        alert="Checkout requests are timing out"
        onOpenSource={onOpenSource}
        onSaveAsIncident={onSaveAsIncident}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /INC-42 Database pool saturation/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save to knowledge base' }));

    expect(onOpenSource).toHaveBeenCalledWith('INC-42');
    expect(onSaveAsIncident).toHaveBeenCalledOnce();
  });
});
