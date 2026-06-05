import { AlertCircle } from 'lucide-react';
import { PaperInspection } from '../types';
import { Stat } from './Stat';

interface ConfirmationPanelProps {
  inspection: PaperInspection;
  onConfirm: (mode: 'single' | 'chunked') => void;
  onCancel: () => void;
}

export function ConfirmationPanel({ inspection, onConfirm, onCancel }: ConfirmationPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-6 lg:p-8">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-light text-amber-text text-xs font-semibold mb-4">
        <AlertCircle className="w-3.5 h-3.5" />
        Long paper detected
      </span>
      <h2 className="font-serif text-2xl font-medium tracking-tight text-ink mb-2" style={{ textWrap: 'balance' }}>
        Use multi-pass analysis?
      </h2>
      <p className="text-sm text-muted leading-relaxed max-w-2xl mb-6" style={{ textWrap: 'pretty' }}>
        {inspection.reason} Multi-pass analysis reads the paper in chunks, then combines the findings into one final summary. It takes longer, but should cover the full paper more reliably.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Extracted Text" value={`${inspection.characters.toLocaleString()} chars`} />
        <Stat label="Estimated Tokens" value={inspection.estimatedTokens.toLocaleString()} />
        <Stat label="Model Context" value={inspection.modelContextTokens ? inspection.modelContextTokens.toLocaleString() : 'Unknown'} />
        <Stat label="Model" value={inspection.model} />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onConfirm('chunked')}
          className="px-4 py-3 bg-steel hover:bg-ink text-white font-semibold rounded-lg text-sm transition-colors"
        >
          Use Multi-Pass Analysis
        </button>
        <button
          onClick={() => onConfirm('single')}
          className="px-4 py-3 bg-white hover:bg-fog border border-border text-ink font-semibold rounded-lg text-sm transition-colors"
        >
          Analyze Single Pass
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-3 bg-white hover:bg-red-light border border-red/30 text-red font-semibold rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
