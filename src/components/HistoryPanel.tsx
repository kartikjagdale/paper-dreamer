import { Clock, Cpu, FileText, History, Trash2 } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  items: HistoryItem[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

function formatDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function HistoryPanel({ items, onSelect, onDelete, onClearAll }: HistoryPanelProps) {
  return (
    <div className="mt-4 bg-white rounded-xl border border-border p-4 shadow-[0_1px_3px_oklch(0.200_0.010_210/0.06),0_1px_2px_oklch(0.200_0.010_210/0.04)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted tracking-[0.04em] flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          RECENT ANALYSES
        </h3>
        {items.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-muted hover:text-red transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <History className="w-8 h-8 text-border mb-2" />
          <p className="text-sm text-muted">No analyses yet</p>
          <p className="text-xs text-muted mt-1 max-w-[220px] leading-relaxed">
            Analyzed papers will appear here so you can revisit them without re-running the model.
          </p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-fog cursor-pointer transition-colors"
              onClick={() => onSelect(item.id)}
            >
              <FileText className="w-3.5 h-3.5 text-muted mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink font-medium truncate leading-tight">
                  {item.paperTitle}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    {item.model}
                  </span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-light hover:text-red text-muted transition-all shrink-0"
                title="Remove from history"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
