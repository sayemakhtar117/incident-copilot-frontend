import type { Analysis } from '../types';

export const analysisFixture: Analysis = {
  service: 'payment-service',
  rootCauseHypothesis: 'The connection pool is exhausted.',
  confidence: 0.85,
  remediationSteps: ['Check connection leaks', 'Review pool limits'],
  evidence: ['Database connections reached the configured maximum.'],
  sources: [
    {
      id: 'INC-42',
      title: 'Database pool saturation',
      service: 'payment-service',
      score: 0.92,
      cited: true,
    },
  ],
  toolsUsed: ['metrics'],
  meta: {
    llm: 'test-llm',
    embedding: 'test-embedding',
    store: 'test-store',
    latencyMs: 120,
    redactions: 1,
    cached: false,
    fallbackUsed: false,
    promptTokens: 100,
    completionTokens: 50,
  },
};
