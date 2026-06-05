import type { ReactNode } from 'react';
import { AlertCircle, Download, RefreshCw, Server, Terminal } from 'lucide-react';

interface OllamaFallbackProps {
  type: 'unavailable' | 'no-models';
  error?: string | null;
  onRetry: () => void;
  retrying?: boolean;
}

export function OllamaFallback({ type, error, onRetry, retrying }: OllamaFallbackProps) {
  return (
    <div className="flex-grow flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center">
        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-amber-light border border-amber/20 flex items-center justify-center">
          {type === 'unavailable' ? (
            <Server className="w-7 h-7 text-amber" />
          ) : (
            <Download className="w-7 h-7 text-amber" />
          )}
        </div>

        <h2 className="font-serif text-2xl font-medium text-ink mb-2">
          {type === 'unavailable' ? 'Ollama is not running' : 'No models installed'}
        </h2>

        <p className="text-muted text-sm leading-relaxed mb-6 max-w-sm mx-auto">
          {type === 'unavailable'
            ? 'Paper Dreamer uses Ollama to analyze papers locally on your machine. Start Ollama to get going.'
            : 'Ollama is running, but no models are installed yet. Pull a model to start analyzing papers.'}
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-light border border-red/20 rounded-lg text-sm text-red flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-fog border border-border rounded-xl p-5 text-left mb-6">
          <h3 className="text-xs font-semibold text-muted tracking-[0.04em] mb-3 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            {type === 'unavailable' ? 'GETTING STARTED' : 'PULL A MODEL'}
          </h3>

          {type === 'unavailable' ? (
            <div className="space-y-3">
              <Step number={1} label="Install Ollama">
                <Code>curl -fsSL https://ollama.com/install.sh | sh</Code>
                <p className="text-xs text-muted mt-1">Or download from ollama.com for macOS/Windows</p>
              </Step>
              <Step number={2} label="Start the server">
                <Code>ollama serve</Code>
              </Step>
              <Step number={3} label="Pull a model">
                <Code>ollama pull gemma3:4b</Code>
              </Step>
            </div>
          ) : (
            <div className="space-y-3">
              <Step number={1} label="Recommended for quick results">
                <Code>ollama pull gemma3:4b</Code>
                <p className="text-xs text-muted mt-1">Fast, good for shorter papers (~2.5 GB)</p>
              </Step>
              <Step number={2} label="Recommended for quality">
                <Code>ollama pull gemma3:12b</Code>
                <p className="text-xs text-muted mt-1">Better analysis, needs more RAM (~8 GB)</p>
              </Step>
            </div>
          )}
        </div>

        <button
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-steel hover:bg-ink disabled:bg-border disabled:text-muted text-white font-semibold rounded-lg text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-steel"
        >
          <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Checking...' : 'Check again'}
        </button>
      </div>
    </div>
  );
}

function Step({ number, label, children }: { number: number; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-5 h-5 rounded-full bg-steel/10 text-steel text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-ink mb-1">{label}</p>
        {children}
      </div>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="bg-ink text-white text-xs font-mono px-3 py-2 rounded-md overflow-x-auto">
      {children}
    </pre>
  );
}
