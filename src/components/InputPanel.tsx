import { AlertCircle, Link, Loader2, Send, Square, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { OllamaModelInfo, SourceMode } from '../types';
import { ModelSelector } from './ModelSelector';
import { UploadDropZone } from './UploadDropZone';

interface InputPanelProps {
  availableModels: OllamaModelInfo[];
  model: string;
  modelsLoading: boolean;
  modelsError: string | null;
  loading: boolean;
  error: string | null;
  onModelChange: (model: string) => void;
  onAnalyze: (sourceMode: SourceMode, pdfFile: File | null, pdfUrl: string) => void;
  onStop: () => void;
}

export function InputPanel({
  availableModels,
  model,
  modelsLoading,
  modelsError,
  loading,
  error,
  onModelChange,
  onAnalyze,
  onStop,
}: InputPanelProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');

  const canSubmit = !loading && !!model && (sourceMode === 'upload' ? !!pdfFile : !!pdfUrl.trim());

  return (
    <div className="flex flex-col gap-4 flex-grow">
      <div className="bg-white rounded-xl border border-border flex flex-col flex-grow overflow-hidden shadow-[0_1px_3px_oklch(0.200_0.010_210/0.06),0_1px_2px_oklch(0.200_0.010_210/0.04)]">

        <div className="grid grid-cols-2 border-b border-border">
          <button
            onClick={() => setSourceMode('upload')}
            className={`py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-steel ${sourceMode === 'upload' ? 'text-steel border-b-2 border-steel bg-white' : 'text-muted hover:text-ink bg-fog/50'}`}
          >
            <UploadCloud className="w-[15px] h-[15px]" />
            Upload PDF
          </button>
          <button
            onClick={() => setSourceMode('url')}
            className={`py-3 text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-steel ${sourceMode === 'url' ? 'text-steel border-b-2 border-steel bg-white' : 'text-muted hover:text-ink bg-fog/50'}`}
          >
            <Link className="w-[15px] h-[15px]" />
            PDF Link
          </button>
        </div>

        <div className="p-5 flex flex-col flex-grow gap-4">
          <ModelSelector
            availableModels={availableModels}
            model={model}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            onChange={onModelChange}
          />

          {sourceMode === 'upload' && (
            <div className="flex-grow flex flex-col min-h-[160px]">
              <UploadDropZone pdfFile={pdfFile} onChange={setPdfFile} />
            </div>
          )}

          {sourceMode === 'url' && (
            <div className="flex-grow flex flex-col gap-3 min-h-[160px]">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5 tracking-[0.04em]" htmlFor="pdf-url">
                  PDF URL
                </label>
                <input
                  id="pdf-url"
                  type="url"
                  placeholder="https://arxiv.org/pdf/2606.05121"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-ring focus-visible:border-steel transition-colors"
                />
              </div>
              <p className="text-xs leading-relaxed text-muted">
                Use a public link that returns a PDF directly. arXiv abstract URLs are converted automatically. The server fetches and parses locally before any text reaches Ollama.
              </p>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={() => onAnalyze(sourceMode, pdfFile, pdfUrl)}
              disabled={!canSubmit}
              className="w-full py-3 px-4 bg-steel hover:bg-ink disabled:bg-border disabled:text-muted disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-steel"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Analyze Paper
                </>
              )}
            </button>
            {loading && (
              <button
                onClick={onStop}
                className="w-full py-2.5 px-4 bg-white hover:bg-red-light border border-red/30 text-red font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/30"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Analysis
              </button>
            )}
            {error && (
              <div className="p-3 bg-red-light text-red border border-red/20 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
