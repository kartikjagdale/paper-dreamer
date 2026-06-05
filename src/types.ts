export interface PaperSummary {
  abstract: string;
  methodology: string;
  contributions: string[];
  limitations: string[];
}

export interface KeyConcept {
  term: string;
  definition: string;
}

export interface EvidenceBackedFinding {
  claim: string;
  source_excerpt: string;
}

export interface DatasetUsed {
  name: string;
  description: string;
}

export interface ComparisonEntry {
  baseline: string;
  result: string;
}

export interface AnalysisResponse {
  paper_title: string;
  summary: PaperSummary;
  layman_explanation: string;
  key_concepts: KeyConcept[];
  evidence_backed_findings: EvidenceBackedFinding[];
  related_work?: string[];
  research_questions?: string[];
  datasets_used?: DatasetUsed[];
  future_work?: string[];
  practical_applications?: string[];
  comparison_with_prior_work?: ComparisonEntry[];
}

export interface OllamaModelInfo {
  name: string;
  size: number;
  parameterSize: string | null;
  family: string | null;
}

export interface HistoryItem {
  id: string;
  paperTitle: string;
  model: string;
  analysisMode: 'single' | 'chunked';
  characters: number;
  createdAt: number;
}

export type SourceMode = 'upload' | 'url';

export interface AnalysisProgress {
  stage: string;
  detail: string;
  percent: number;
  tokenCount: number;
  elapsedSeconds: number;
  metrics: {
    characters?: number;
    model?: string;
  };
  log: string[];
}

export interface PaperInspection {
  paperId: string;
  characters: number;
  estimatedTokens: number;
  model: string;
  modelContextTokens: number | null;
  modelLoaded: boolean;
  recommendedMode: 'single' | 'chunked';
  requiresConfirmation: boolean;
  stronglyRecommendChunking: boolean;
  reason: string;
  usableContextTokens: number | null;
}

export type StreamEvent =
  | { type: 'progress'; stage: string; percent: number; detail?: string; metrics?: AnalysisProgress['metrics'] }
  | { type: 'token'; tokenCount: number; percent: number }
  | { type: 'final'; data: AnalysisResponse }
  | { type: 'error'; error: string }
  | { type: 'done' };

