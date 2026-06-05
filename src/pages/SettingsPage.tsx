import { useEffect, useRef, useState } from 'react';
import { Check, Cpu, Database, Download, Info, Loader2, X } from 'lucide-react';
import { EMBEDDING_MODELS, useSettings } from '../hooks/useSettings';
import { OllamaModelInfo } from '../types';

interface ModelDetail {
  contextTokens: number | null;
  loaded: boolean;
}

type Section = 'models' | 'embeddings' | 'rag';

export function SettingsPage() {
  const { settings, update } = useSettings();
  const [section, setSection] = useState<Section>('models');
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelDetails, setModelDetails] = useState<Record<string, ModelDetail>>({});
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullPercent, setPullPercent] = useState(0);
  const [pullStatus, setPullStatus] = useState('');
  const pullAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models || []);
        (data.models || []).forEach((m: OllamaModelInfo) => fetchModelDetail(m.name));
      })
      .catch(() => {})
      .finally(() => setModelsLoading(false));
  }, []);

  const fetchModelDetail = async (modelName: string) => {
    try {
      const res = await fetch('/api/models/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      if (res.ok) {
        const data = await res.json();
        setModelDetails((prev) => ({ ...prev, [modelName]: data }));
      }
    } catch {}
  };

  const cancelPull = () => {
    pullAbortRef.current?.abort();
  };

  const pullModel = async (modelName: string) => {
    const abortController = new AbortController();
    pullAbortRef.current = abortController;
    setPulling(modelName);
    setPullPercent(0);
    setPullStatus('Starting download...');

    try {
      const res = await fetch('/api/models/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Pull failed' }));
        setPullStatus(`Error: ${err.error}`);
        return;
      }

      if (!res.body) return;
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
          try {
            const event = JSON.parse(line);
            if (event.percent != null) setPullPercent(event.percent);
            if (event.status) setPullStatus(event.status);
          } catch {}
        }
      }

      // Refresh models list
      const refreshRes = await fetch('/api/models');
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setModels(data.models || []);
      }
      await fetchModelDetail(modelName);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setPullStatus(`Error: ${err.message}`);
      }
    } finally {
      pullAbortRef.current = null;
      setPulling(null);
      setPullPercent(0);
      setPullStatus('');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
    return `${bytes} B`;
  };

  const formatContext = (tokens: number | null) => {
    if (!tokens) return 'Unknown';
    if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
    return `${tokens}`;
  };

  const isEmbeddingModel = (name: string) => /embed|nomic|mxbai/i.test(name);
  const llmModels = models.filter((m) => !isEmbeddingModel(m.name));
  const installedEmbeddingModels = models.filter((m) => isEmbeddingModel(m.name));

  const sections: { id: Section; label: string; icon: typeof Cpu }[] = [
    { id: 'models', label: 'Language Models', icon: Cpu },
    { id: 'embeddings', label: 'Embedding Model', icon: Database },
    { id: 'rag', label: 'RAG Parameters', icon: Info },
  ];

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-8 lg:p-10 flex gap-8">
      {/* Sidebar */}
      <aside className="w-48 shrink-0">
        <h2 className="font-serif text-lg font-medium text-ink mb-4">Settings</h2>
        <nav className="space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                section === s.id
                  ? 'text-steel bg-steel-light font-medium'
                  : 'text-muted hover:text-ink hover:bg-fog'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {section === 'models' && (
          <div>
            <h3 className="font-serif text-xl font-medium text-ink mb-1">Language Models</h3>
            <p className="text-sm text-muted mb-6">
              Select the default model for paper analysis. You can override per-analysis from the home page.
            </p>

            {modelsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted py-8">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading models from Ollama...
              </div>
            ) : llmModels.length === 0 ? (
              <p className="text-sm text-muted py-8">
                No language models found. Pull a model with{' '}
                <code className="bg-fog px-1.5 py-0.5 rounded text-xs">ollama pull qwen3:8b</code>
              </p>
            ) : (
              <div className="space-y-2">
                {llmModels.map((m) => {
                  const detail = modelDetails[m.name];
                  const isDefault = settings.defaultModel === m.name;
                  return (
                    <div
                      key={m.name}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-lg border transition-colors ${
                        isDefault ? 'border-steel bg-steel-light' : 'border-border bg-white'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink flex items-center gap-2">
                          {m.name}
                          {detail?.loaded && (
                            <span className="text-xs bg-green-light text-green border border-green/20 rounded px-1.5 py-0.5">
                              Loaded
                            </span>
                          )}
                          {isDefault && (
                            <span className="text-xs bg-steel-light text-steel border border-steel/20 rounded px-1.5 py-0.5">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {m.parameterSize && <span>{m.parameterSize} params</span>}
                          <span>{formatBytes(m.size)}</span>
                          {m.family && <span className="capitalize">{m.family}</span>}
                          {detail?.contextTokens && (
                            <span className="text-steel font-medium">
                              {formatContext(detail.contextTokens)} context
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => update({ defaultModel: m.name })}
                        disabled={isDefault}
                        className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                          isDefault
                            ? 'bg-steel text-white cursor-default'
                            : 'bg-fog text-muted hover:text-ink hover:bg-border border border-border'
                        }`}
                      >
                        {isDefault ? 'Default' : 'Set Default'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 bg-fog rounded-lg px-3 py-2.5 border border-border">
              <Info className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              <p className="text-xs text-muted leading-relaxed">
                The context window determines how much text the model can process. Models with larger contexts (32K+) handle long papers better in single-pass mode. The default model is pre-selected in the dropdown when analyzing a paper.
              </p>
            </div>
          </div>
        )}

        {section === 'embeddings' && (
          <div>
            <h3 className="font-serif text-xl font-medium text-ink mb-1">Embedding Model</h3>
            <p className="text-sm text-muted mb-6">
              Used by "Chat with Paper" to find relevant sections. Not installed models will be downloaded on first use, or you can download them here.
            </p>

            <div className="space-y-2">
              {EMBEDDING_MODELS.map((m) => {
                const selected = settings.embeddingModel === m.id;
                const installed = installedEmbeddingModels.some(
                  (im) => im.name === m.id || im.name === m.id + ':latest' || im.name.startsWith(m.id)
                );
                const isPulling = pulling === m.id;

                return (
                  <div
                    key={m.id}
                    className={`px-4 py-3.5 rounded-lg border transition-colors ${
                      selected ? 'border-steel bg-steel-light' : 'border-border bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => update({ embeddingModel: m.id })}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selected ? 'border-steel bg-steel' : 'border-border'
                        }`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink flex items-center gap-2">
                            {m.label}
                            {installed && (
                              <span className="text-xs bg-green-light text-green border border-green/20 rounded px-1.5 py-0.5">
                                Installed
                              </span>
                            )}
                            {m.id === 'qwen3-embedding:0.6b' && (
                              <span className="text-xs bg-fog text-steel border border-border rounded px-1.5 py-0.5">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted mt-0.5">
                            {m.dims}-dim &middot; {m.context} context &middot; {m.size}
                          </div>
                        </div>
                      </button>

                      {!installed && !isPulling && (
                        <button
                          onClick={() => pullModel(m.id)}
                          disabled={pulling !== null}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-fog text-muted hover:text-ink hover:bg-border border border-border transition-colors disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      )}
                    </div>

                    {isPulling && (
                      <div className="mt-3 ml-8">
                        <div className="flex items-center justify-between text-xs text-muted mb-1">
                          <span>{pullStatus}</span>
                          <div className="flex items-center gap-2">
                            <span>{pullPercent}%</span>
                            <button
                              onClick={cancelPull}
                              className="flex items-center gap-1 text-xs text-red hover:text-red/80 transition-colors"
                              title="Cancel download"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-steel rounded-full transition-all duration-300"
                            style={{ width: `${pullPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-start gap-2 bg-fog rounded-lg px-3 py-2.5 border border-border">
              <Info className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              <p className="text-xs text-muted leading-relaxed">
                Higher-dimensional models (4096-dim) produce better retrieval quality but use more memory. Qwen3 Embedding 0.6B offers the best balance of quality and size. Models not installed will be automatically downloaded on first chat use.
              </p>
            </div>
          </div>
        )}

        {section === 'rag' && (
          <div>
            <h3 className="font-serif text-xl font-medium text-ink mb-1">RAG Parameters</h3>
            <p className="text-sm text-muted mb-6">
              Configuration for the retrieval-augmented generation pipeline used in "Chat with Paper".
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="px-4 py-3.5 rounded-lg border border-border bg-white">
                <div className="text-xs text-muted uppercase tracking-wide">Chunk Size</div>
                <div className="text-sm font-medium text-ink mt-1">1,000 characters</div>
                <p className="text-xs text-muted mt-1">Each paper section is split into chunks of this size for embedding.</p>
              </div>
              <div className="px-4 py-3.5 rounded-lg border border-border bg-white">
                <div className="text-xs text-muted uppercase tracking-wide">Chunk Overlap</div>
                <div className="text-sm font-medium text-ink mt-1">200 characters</div>
                <p className="text-xs text-muted mt-1">Adjacent chunks share this many characters to preserve context at boundaries.</p>
              </div>
              <div className="px-4 py-3.5 rounded-lg border border-border bg-white">
                <div className="text-xs text-muted uppercase tracking-wide">Retrieved Chunks</div>
                <div className="text-sm font-medium text-ink mt-1">Top 5 per question</div>
                <p className="text-xs text-muted mt-1">The 5 most relevant chunks are included as context for each answer.</p>
              </div>
              <div className="px-4 py-3.5 rounded-lg border border-border bg-white">
                <div className="text-xs text-muted uppercase tracking-wide">Chat History</div>
                <div className="text-sm font-medium text-ink mt-1">Last 6 messages</div>
                <p className="text-xs text-muted mt-1">Recent conversation context included in each prompt for continuity.</p>
              </div>
              <div className="px-4 py-3.5 rounded-lg border border-border bg-white">
                <div className="text-xs text-muted uppercase tracking-wide">Temperature</div>
                <div className="text-sm font-medium text-ink mt-1">0.3</div>
                <p className="text-xs text-muted mt-1">Low temperature for factual, grounded answers based on the paper.</p>
              </div>
              <div className="px-4 py-3.5 rounded-lg border border-border bg-white">
                <div className="text-xs text-muted uppercase tracking-wide">Splitting Strategy</div>
                <div className="text-sm font-medium text-ink mt-1">Paragraph-aware</div>
                <p className="text-xs text-muted mt-1">Prefers splitting at paragraph boundaries rather than mid-sentence.</p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 bg-fog rounded-lg px-3 py-2.5 border border-border">
              <Info className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              <p className="text-xs text-muted leading-relaxed">
                These parameters are tuned defaults that work well for academic papers. They may become configurable in a future update.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
