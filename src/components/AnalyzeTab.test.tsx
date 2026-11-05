// Runtime validation coverage for: incident analysis flow and controls.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeStream, type StreamHandlers } from '../api';
import { analysisFixture } from '../test/fixtures';
import AnalyzeTab from './AnalyzeTab';

vi.mock('../api', () => ({
  analyzeStream: vi.fn(),
}));

const mockedAnalyzeStream = vi.mocked(analyzeStream);

describe('AnalyzeTab', () => {
  let handlers: StreamHandlers | undefined;
  let cancelStream: () => void;

  beforeEach(() => {
    handlers = undefined;
    cancelStream = vi.fn(() => undefined);
    mockedAnalyzeStream.mockImplementation((_alert, _service, streamHandlers) => {
      handlers = streamHandlers;
      return cancelStream;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps analysis disabled until alert text is entered and loads a sample', () => {
    render(<AnalyzeTab services={[]} onOpenSource={vi.fn()} onSaveDraft={vi.fn()} />);

    const analyzeButton = screen.getByRole('button', { name: /Analyze/ });
    expect(analyzeButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'DB pool exhausted' }));

    expect(screen.getByDisplayValue(/HikariPool-1/)).toBeInTheDocument();
    expect(screen.getByLabelText('Service (optional)')).toHaveValue('payment-service');
    expect(analyzeButton).toBeEnabled();
  });

  it('starts on Ctrl+Enter and displays the completed analysis', async () => {
    render(<AnalyzeTab services={[]} onOpenSource={vi.fn()} onSaveDraft={vi.fn()} />);
    const alert = 'Checkout requests are timing out';
    fireEvent.change(screen.getByLabelText('Alert or symptoms'), { target: { value: alert } });
    fireEvent.change(screen.getByLabelText('Service (optional)'), {
      target: { value: 'payment-service' },
    });

    fireEvent.keyDown(screen.getByLabelText('Alert or symptoms'), { key: 'Enter', ctrlKey: true });

    expect(mockedAnalyzeStream).toHaveBeenCalledWith(alert, 'payment-service', expect.any(Object));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    await act(async () => {
      handlers?.onStage('Searching similar incidents');
      handlers?.onResult(analysisFixture);
    });

    expect(screen.getByText('The connection pool is exhausted.')).toBeInTheDocument();
    expect(screen.getByText('Recent analyses')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('shows stream errors and allows the user to retry', async () => {
    render(<AnalyzeTab services={[]} onOpenSource={vi.fn()} onSaveDraft={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Alert or symptoms'), {
      target: { value: 'Requests are failing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze/ }));

    await act(async () => {
      handlers?.onError('Backend is unavailable');
    });

    expect(screen.getByText('Backend is unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze/ })).toBeEnabled();
  });

  it('cancels the active stream', () => {
    render(<AnalyzeTab services={[]} onOpenSource={vi.fn()} onSaveDraft={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Alert or symptoms'), {
      target: { value: 'Requests are failing' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(cancelStream).toHaveBeenCalledOnce();
    expect(screen.getByText('Cancelled by user')).toBeInTheDocument();
  });
});
