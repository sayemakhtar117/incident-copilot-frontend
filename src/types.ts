// These mirror the Java records in the Spring Boot backend.

export interface Status {
  llm: string;
  embedding: string;
  store: string;
  incidents: number;
}

export interface Source {
  id: string;
  title: string;
  service: string;
  score: number;
  cited: boolean;
}

export interface Meta {
  llm: string;
  embedding: string;
  store: string;
  latencyMs: number;
  redactions: number;
  cached: boolean;
  fallbackUsed: boolean;
  promptTokens: number;
  completionTokens: number;
}

export interface Analysis {
  service: string;
  rootCauseHypothesis: string;
  confidence: number;
  remediationSteps: string[];
  evidence: string[];
  sources: Source[];
  toolsUsed: string[];
  meta: Meta;
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: string;
  symptoms: string;
  rootCause: string;
  resolution: string;
  occurredOn: string;
}

export type NewIncident = Omit<Incident, 'id' | 'occurredOn'>;

export interface EvalCaseResult {
  alert: string;
  expected: string;
  retrieved: string[];
  rank: number;
}

export interface EvalReport {
  cases: number;
  hitAt1: number;
  hitAt3: number;
  mrr: number;
  embedding: string;
  store: string;
  results: EvalCaseResult[];
}

export interface HistoryItem {
  id: number;
  at: string;
  alert: string;
  service: string;
  result: Analysis;
}
