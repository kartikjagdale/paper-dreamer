import { CheckCircle2, Loader2, Square } from 'lucide-react';
import { AnalysisProgress } from '../types';
import { Stat } from './Stat';

interface ProgressPanelProps {
  progress: AnalysisProgress;
  model: string;
  onStop: () => void;
}

export function ProgressPanel({ progress, model, onStop }: ProgressPanelProps) {
  return (
    <div className="flex-grow bg-white rounded-xl border border-border p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-steel-light text-steel text-xs font-semibold mb-3">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing locally
          </span>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">{progress.stage}</h2>
          <p className="text-sm text-muted mt-1">{progress.detail}</p>
        </div>
        <button
          onClick={onStop}
          className="shrink-0 px-4 py-2.5 bg-white hover:bg-red-light border border-red/30 text-red font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          Stop
        </button>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-muted mb-2">
          <span>Progress</span>
          <span>{progress.percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-fog overflow-hidden">
          <div
            className="h-full bg-steel rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat label="Model" value={progress.metrics.model || model} />
        <Stat label="Extracted Text" value={progress.metrics.characters ? `${progress.metrics.characters.toLocaleString()} chars` : '-'} />
        <Stat label="Response Chunks" value={String(progress.tokenCount)} />
        <Stat label="Elapsed" value={`${progress.elapsedSeconds}s`} />
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-fog border-b border-border text-xs font-semibold text-muted tracking-[0.04em] uppercase">
          Activity
        </div>
        <div className="divide-y divide-border">
          {progress.log.map((item) => (
            <div key={item} className="px-4 py-3 flex items-center gap-3 text-sm text-ink">
              <CheckCircle2 className="w-4 h-4 text-green shrink-0" />
              <span>{item}</span>
            </div>
          ))}
          {progress.stage === 'Generating summary' && (
            <div className="px-4 py-3 flex items-center gap-3 text-sm text-ink">
              <Loader2 className="w-4 h-4 text-steel animate-spin shrink-0" />
              <span>Receiving structured analysis from Ollama</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
