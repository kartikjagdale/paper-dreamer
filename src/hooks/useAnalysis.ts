import { useEffect, useRef, useState } from 'react';
import {
  AnalysisProgress,
  AnalysisResponse,
  PaperInspection,
  SourceMode,
  StreamEvent,
} from '../types';

const SESSION_KEY = 'paper-dreamer-session';

function loadSession(): { result: AnalysisResponse | null; paperId: string | null } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { result: null, paperId: null };
}

function saveSession(result: AnalysisResponse | null, paperId: string | null) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ result, paperId }));
  } catch {}
}

function initialProgress(model: string, sourceMode: SourceMode): AnalysisProgress {
  return {
    stage: 'Preparing upload',
    detail: sourceMode === 'url' ? 'Sending PDF link to the server' : 'Reading PDF in the browser',
    percent: 4,
    tokenCount: 0,
    elapsedSeconds: 0,
    metrics: { model },
    log: ['Preparing upload'],
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useAnalysis(model: string) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(() => loadSession().result);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [pendingInspection, setPendingInspection] = useState<PaperInspection | null>(null);
  const [paperId, setPaperId] = useState<string | null>(() => loadSession().paperId);
  const abortRef = useRef<AbortController | null>(null);
  const sourceModeRef = useRef<SourceMode>('upload');

  useEffect(() => {
    saveSession(result, paperId);
  }, [result, paperId]);

  useEffect(() => {
    if (!loading) return;
    const interval = window.setInterval(() => {
      setProgress((c) => (c ? { ...c, elapsedSeconds: c.elapsedSeconds + 1 } : c));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [loading]);

  const startAnalysis = async (
    analysisPaperId: string,
    analysisMode: 'single' | 'chunked',
    existingController?: AbortController,
  ) => {
    const abortController = existingController || new AbortController();
    abortRef.current = abortController;
    setLoading(true);
    setError(null);
    setResult(null);
    setPaperId(analysisPaperId);
    setProgress((c) => c || {
      ...initialProgress(model, sourceModeRef.current),
      stage: analysisMode === 'chunked' ? 'Preparing multi-pass analysis' : 'Preparing single-pass analysis',
      detail: analysisMode === 'chunked' ? 'The paper will be analyzed in chunks' : 'The paper will be analyzed in one pass',
      percent: 6,
      log: [analysisMode === 'chunked' ? 'Multi-pass analysis selected' : 'Single-pass analysis selected'],
    });
    setPendingInspection(null);

    try {
      const res = await fetch('/api/analyze-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({ paperId: analysisPaperId, model, analysisMode }),
      });

      if (!res.ok) {
        let errorMsg = 'Failed to analyze paper. The server may have timed out.';
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch {
          errorMsg = `Server error: ${res.status} ${res.statusText}. Could be a timeout.`;
        }
        throw new Error(errorMsg);
      }

      if (!res.body) throw new Error('The server did not return a readable response stream.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;

          if (event.type === 'progress') {
            setProgress((c) => {
              const nextLog = c?.log.includes(event.stage)
                ? c.log
                : [...(c?.log || []), event.stage].slice(-6);
              return {
                stage: event.stage,
                detail: event.detail || c?.detail || '',
                percent: Math.max(c?.percent || 0, event.percent),
                tokenCount: c?.tokenCount || 0,
                elapsedSeconds: c?.elapsedSeconds || 0,
                metrics: { ...(c?.metrics || {}), ...(event.metrics || {}) },
                log: nextLog,
              };
            });
          }

          if (event.type === 'token') {
            setProgress((c) => c ? {
              ...c,
              stage: 'Generating summary',
              detail: 'Receiving structured analysis from Ollama',
              percent: Math.max(c.percent, event.percent),
              tokenCount: event.tokenCount,
            } : c);
          }

          if (event.type === 'final') {
            setProgress((c) => c ? { ...c, stage: 'Complete', detail: 'Rendering structured summary', percent: 100 } : c);
            setResult(event.data);
          }

          if (event.type === 'error') throw new Error(event.error);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Analysis stopped.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleAnalyze = async (sourceMode: SourceMode, pdfFile: File | null, pdfUrl: string) => {
    sourceModeRef.current = sourceMode;
    setLoading(true);
    setError(null);
    setResult(null);
    setPendingInspection(null);
    setProgress(initialProgress(model, sourceMode));

    let sourceType: 'pdfBase64' | 'pdfUrl' = 'pdfUrl';
    let content = pdfUrl.trim();

    if (sourceMode === 'upload' && pdfFile) {
      sourceType = 'pdfBase64';
      try {
        content = await fileToBase64(pdfFile);
      } catch {
        setError('Failed to process PDF file.');
        setLoading(false);
        return;
      }
    }

    try {
      const abortController = new AbortController();
      abortRef.current = abortController;
      const inspectionRes = await fetch('/api/inspect-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({ sourceType, content, model }),
      });

      if (!inspectionRes.ok) {
        let errorMsg = 'Failed to inspect paper.';
        try {
          const err = await inspectionRes.json();
          errorMsg = err.error || errorMsg;
        } catch {
          errorMsg = `Server error: ${inspectionRes.status} ${inspectionRes.statusText}.`;
        }
        throw new Error(errorMsg);
      }

      const inspection = await inspectionRes.json() as PaperInspection;

      if (inspection.requiresConfirmation) {
        setPendingInspection(inspection);
        setProgress(null);
        setLoading(false);
        abortRef.current = null;
        return;
      }

      await startAnalysis(inspection.paperId, 'single', abortController);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Analysis stopped.');
      } else {
        setError(err.message);
      }
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setProgress((c) => c ? { ...c, stage: 'Stopping', detail: 'Cancelling the local Ollama request' } : c);
  };

  const handleAnalyzeInspectedPaper = (analysisMode: 'single' | 'chunked') => {
    if (!pendingInspection) return;
    void startAnalysis(pendingInspection.paperId, analysisMode);
  };

  const clearPendingInspection = () => setPendingInspection(null);

  const loadFromHistory = (historyResult: AnalysisResponse, historyPaperId: string | null) => {
    setResult(historyResult);
    setPaperId(historyPaperId);
  };

  return {
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
    setResult,
    loadFromHistory,
  };
}
