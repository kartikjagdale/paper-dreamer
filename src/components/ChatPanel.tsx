import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Bot, Send, Sparkles, User, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

interface ChatPanelProps {
  paperTitle: string;
  paperId: string | null;
  model: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { chunkIndex: number; preview: string; score: number }[];
}

function SourceChunks({ sources }: { sources: { chunkIndex: number; preview: string; score: number }[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="ml-10 mt-2 space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <button
            key={s.chunkIndex}
            onClick={() => setExpanded(expanded === s.chunkIndex ? null : s.chunkIndex)}
            className={`inline-flex items-center gap-1 text-xs rounded px-2 py-1 transition-colors ${
              expanded === s.chunkIndex
                ? 'text-steel bg-steel-light border border-steel/20'
                : 'text-muted bg-white border border-border hover:border-steel/30 hover:text-steel'
            }`}
          >
            <FileText className="w-3 h-3" />
            Chunk {s.chunkIndex + 1}
            {expanded === s.chunkIndex ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ))}
      </div>
      {expanded !== null && (
        <div className="bg-white border border-border rounded-lg px-3 py-2 text-xs text-muted leading-relaxed mt-1.5">
          <span className="font-medium text-ink">Source (Chunk {expanded + 1}):</span>{' '}
          {sources.find((s) => s.chunkIndex === expanded)?.preview}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ paperTitle, paperId, model }: ChatPanelProps) {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [embedded, setEmbedded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setEmbedded(false);
    setStatus('');
  }, [paperId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = async () => {
    if (!input.trim() || sending || !paperId) return;

    const question = input.trim();
    const userMessage: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    setStatus('');

    try {
      if (!embedded) {
        setStatus('Indexing paper (may download embedding model on first use)...');
        const embedRes = await fetch(`/api/paper/${paperId}/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeddingModel: settings.embeddingModel }),
        });
        if (!embedRes.ok) {
          const err = await embedRes.json().catch(() => ({ error: 'Failed to index paper' }));
          throw new Error(err.error);
        }
        setEmbedded(true);
      }

      setStatus('Thinking...');
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(`/api/paper/${paperId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, model, history, embeddingModel: settings.embeddingModel }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to get response' }));
        throw new Error(err.error);
      }

      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';
      let sources: ChatMessage['sources'] = undefined;

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === 'progress') {
            setStatus(event.stage);
          }

          if (event.type === 'token') {
            assistantContent += event.text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
              return updated;
            });
            setStatus('');
          }

          if (event.type === 'done') {
            sources = event.sources;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantContent, sources };
              return updated;
            });
          }

          if (event.type === 'error') {
            throw new Error(event.error);
          }
        }
      }
    } catch (err: any) {
      const isSessionExpired = err.message?.includes('not found') || err.message?.includes('re-upload');
      setMessages((prev) => [
        ...prev.filter((m) => m.content !== ''),
        {
          role: 'assistant',
          content: isSessionExpired
            ? 'The paper session has expired on the server. Please re-analyze the paper to continue chatting.'
            : `Error: ${err.message}`,
        },
      ]);
    } finally {
      setSending(false);
      setStatus('');
    }
  };

  const suggestions = [
    'Explain the methodology in simpler terms',
    'What are the main limitations?',
    'How does this compare to prior work?',
    'What datasets were used and why?',
  ];

  if (!paperId) {
    return (
      <div className="flex flex-col h-full min-h-[400px] items-center justify-center text-center p-8">
        <Sparkles className="w-8 h-8 text-border mb-3" />
        <p className="text-sm font-medium text-ink mb-1">Chat unavailable for this paper</p>
        <p className="text-xs text-muted max-w-sm leading-relaxed">
          This paper was analyzed before chat was enabled. Re-analyze it to unlock chat — the paper text will be stored for future sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {messages.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
          <div className="w-12 h-12 rounded-2xl bg-steel-light flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-steel" />
          </div>
          <h3 className="font-serif text-lg font-medium text-ink mb-2">Ask about this paper</h3>
          <p className="text-sm text-muted max-w-sm leading-relaxed mb-6">
            Ask follow-up questions about "{paperTitle}" and get answers grounded in the paper's content.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="text-left text-xs text-muted bg-fog hover:bg-steel-light hover:text-steel border border-border rounded-lg px-3 py-2.5 transition-colors leading-snug"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4 pb-4">
          {messages.map((msg, idx) => (
            <div key={idx}>
              <div className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-steel-light flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-steel" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-steel text-white whitespace-pre-wrap'
                      : 'bg-fog text-ink border border-border chat-markdown'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Markdown>{msg.content}</Markdown>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <SourceChunks sources={msg.sources} />
              )}
            </div>
          ))}
          {sending && !messages[messages.length - 1]?.content && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-steel-light flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-steel" />
              </div>
              <div className="bg-fog border border-border rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {status && (
        <div className="text-xs text-steel px-2 py-1 animate-pulse">{status}</div>
      )}

      <div className="border-t border-border pt-3 mt-auto">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Ask a question about this paper..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 bg-white border border-border rounded-lg text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-ring focus-visible:border-steel transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="px-4 py-2.5 bg-steel hover:bg-ink disabled:bg-border disabled:text-muted text-white rounded-lg transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted mt-2 text-center">
          Powered by local RAG — answers are grounded in the paper's content
        </p>
      </div>
    </div>
  );
}
