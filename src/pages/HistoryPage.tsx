import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Cpu, FileText, Search, Trash2 } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { HistoryItem } from '../types';

function formatDate(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatChars(chars: number): string {
  if (chars >= 1000000) return `${(chars / 1000000).toFixed(1)}M chars`;
  if (chars >= 1000) return `${(chars / 1000).toFixed(0)}K chars`;
  return `${chars} chars`;
}

export function HistoryPage() {
  const history = useHistory();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = search.trim()
    ? history.items.filter((item) =>
        item.paperTitle.toLowerCase().includes(search.toLowerCase()) ||
        item.model.toLowerCase().includes(search.toLowerCase())
      )
    : history.items;

  const handleSelect = async (item: HistoryItem) => {
    navigate('/', { state: { loadHistoryId: item.id } });
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    history.clearAll();
    setConfirmClear(false);
  };

  return (
    <main className="max-w-[900px] mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-fog text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-medium text-ink">Analysis History</h1>
          <p className="text-sm text-muted mt-0.5">
            {history.items.length} {history.items.length === 1 ? 'paper' : 'papers'} analyzed
          </p>
        </div>
        {history.items.length > 0 && (
          <button
            onClick={handleClearAll}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              confirmClear
                ? 'bg-red text-white hover:bg-red/90'
                : 'text-muted hover:text-red hover:bg-red-light'
            }`}
          >
            {confirmClear ? 'Confirm clear all' : 'Clear all'}
          </button>
        )}
      </div>

      {history.items.length > 3 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by paper title or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-ring focus-visible:border-steel transition-colors"
          />
        </div>
      )}

      {history.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock className="w-12 h-12 text-border mb-4" />
          <h2 className="font-serif text-xl font-medium text-ink mb-2">No analyses yet</h2>
          <p className="text-sm text-muted max-w-sm leading-relaxed">
            Analyze a paper and it will appear here. Cached results load instantly without re-running the model.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-4 py-2 bg-steel hover:bg-ink text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Analyze a paper
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-10 h-10 text-border mb-3" />
          <p className="text-sm text-muted">No results matching "{search}"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelect(item)}
              className="group flex items-start gap-4 p-4 bg-white border border-border rounded-xl hover:border-steel/30 hover:shadow-sm cursor-pointer transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-fog flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{item.paperTitle}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    {item.model}
                  </span>
                  <span>{formatChars(item.characters)}</span>
                  <span className="capitalize">{item.analysisMode}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  history.deleteEntry(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-light hover:text-red text-muted transition-all shrink-0"
                title="Remove from history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
