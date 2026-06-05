import { AlertCircle, ChevronDown, Loader2 } from 'lucide-react';
import { OllamaModelInfo } from '../types';

interface ModelSelectorProps {
  availableModels: OllamaModelInfo[];
  model: string;
  modelsLoading: boolean;
  modelsError: string | null;
  onChange: (model: string) => void;
}

export function ModelSelector({ availableModels, model, modelsLoading, modelsError, onChange }: ModelSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted mb-1.5 tracking-[0.04em]" htmlFor="model-select">
        Model
      </label>
      {modelsLoading ? (
        <div className="w-full px-3.5 py-2.5 bg-fog border border-border rounded-lg text-sm text-muted flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Loading models…</span>
        </div>
      ) : modelsError ? (
        <div className="w-full px-3.5 py-2.5 bg-red-light border border-red/20 rounded-lg text-sm text-red flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{modelsError}</span>
        </div>
      ) : availableModels.length === 0 ? (
        <div className="w-full px-3.5 py-2.5 bg-amber-light border border-amber/20 rounded-lg text-sm text-amber-text">
          No models found. Run <code className="font-mono text-xs bg-amber-light px-1 rounded">ollama pull &lt;model&gt;</code> to add one.
        </div>
      ) : (
        <div className="relative">
          <select
            id="model-select"
            value={model}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border border-border rounded-lg text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-ring focus-visible:border-steel transition-colors cursor-pointer"
          >
            {availableModels.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}{m.parameterSize ? ` · ${m.parameterSize}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
        </div>
      )}
    </div>
  );
}
