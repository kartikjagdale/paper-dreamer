import { useState } from 'react';
import { BookOpen, MessageCircle } from 'lucide-react';
import { AnalysisResponse } from '../types';
import { ChatPanel } from './ChatPanel';
import { ResultsView } from './ResultsView';

interface ResultsPanelProps {
  result: AnalysisResponse;
  paperId: string | null;
  model: string;
}

type Tab = 'summary' | 'chat';

export function ResultsPanel({ result, paperId, model }: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 border-b border-border mb-6 sticky top-0 bg-white z-10 pt-1">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'summary'
              ? 'text-steel border-steel'
              : 'text-muted border-transparent hover:text-ink'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Summary
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            activeTab === 'chat'
              ? 'text-steel border-steel'
              : 'text-muted border-transparent hover:text-ink'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Chat with Paper
        </button>
      </div>

      <div className={activeTab === 'summary' ? '' : 'hidden'}>
        <ResultsView result={result} />
      </div>
      <div className={activeTab === 'chat' ? 'flex flex-col flex-1' : 'hidden'}>
        <ChatPanel paperTitle={result.paper_title} paperId={paperId} model={model} />
      </div>
    </div>
  );
}
