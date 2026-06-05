import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { ConfirmationPanel } from '../components/ConfirmationPanel';
import { HistoryPanel } from '../components/HistoryPanel';
import { InputPanel } from '../components/InputPanel';
import { ProgressPanel } from '../components/ProgressPanel';
import { ResultsPanel } from '../components/ResultsPanel';
import { useAnalysis } from '../hooks/useAnalysis';
import { useHistory } from '../hooks/useHistory';
import { useModels } from '../hooks/useModels';

export function HomePage() {
  const location = useLocation();
  const { availableModels, model, setModel, modelsLoading, modelsError } = useModels();
  const {
    loading,
    result,
    error,
    progress,
    pendingInspection,
    paperId,
    handleAnalyze,
    handleStop,
    handleAnalyzeInspectedPaper,
    clearPendingInspection,
    loadFromHistory,
  } = useAnalysis(model);
  const history = useHistory();

  const prevResultRef = useRef(result);
  useEffect(() => {
    if (result && result !== prevResultRef.current) {
      history.refresh();
    }
    prevResultRef.current = result;
  }, [result, history.refresh]);

  const loadedFromHistoryRef = useRef(false);
  useEffect(() => {
    const state = location.state as { loadHistoryId?: string } | null;
    if (state?.loadHistoryId && !loadedFromHistoryRef.current) {
      loadedFromHistoryRef.current = true;
      history.loadEntry(state.loadHistoryId).then((entry) => {
        if (entry) loadFromHistory(entry.result, entry.paperId);
      });
    }
  }, [location.state]);

  const handleHistorySelect = async (id: string) => {
    const entry = await history.loadEntry(id);
    if (entry) loadFromHistory(entry.result, entry.paperId);
  };

  const recentItems = history.items.slice(0, 5);

  return (
    <main className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 h-[calc(100vh-65px)]">
      <div className="w-full lg:w-[360px] flex flex-col gap-0 shrink-0 h-full">
        <InputPanel
          availableModels={availableModels}
          model={model}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          loading={loading}
          error={error}
          onModelChange={setModel}
          onAnalyze={handleAnalyze}
          onStop={handleStop}
        />
        <HistoryPanel
          items={recentItems}
          onSelect={handleHistorySelect}
          onDelete={history.deleteEntry}
          onClearAll={history.clearAll}
        />
        {history.items.length > 5 && (
          <Link
            to="/history"
            className="mt-2 text-xs text-steel hover:text-ink transition-colors text-center block"
          >
            View all {history.items.length} analyses
          </Link>
        )}
      </div>

      <div className="w-full lg:flex-1 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar pb-6">
        {!result && !loading && !pendingInspection && (
          <div className="flex-grow flex flex-col items-center justify-center text-muted p-12 bg-fog rounded-xl border border-border border-dashed">
            <FlaskConical className="w-10 h-10 mb-4 text-border" />
            <h3 className="font-serif text-xl font-medium text-ink mb-2">Awaiting Document</h3>
            <p className="text-sm max-w-sm text-center leading-relaxed text-muted" style={{ textWrap: 'pretty' }}>
              Provide a paper to extract a structured summary, a layman's explanation, and verified evidence-backed findings.
            </p>
          </div>
        )}

        {pendingInspection && !loading && (
          <ConfirmationPanel
            inspection={pendingInspection}
            onConfirm={handleAnalyzeInspectedPaper}
            onCancel={clearPendingInspection}
          />
        )}

        {loading && progress && (
          <ProgressPanel progress={progress} model={model} onStop={handleStop} />
        )}

        {result && !loading && <ResultsPanel result={result} paperId={paperId} model={model} />}
      </div>
    </main>
  );
}
