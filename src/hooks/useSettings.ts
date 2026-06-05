import { useCallback, useEffect, useState } from 'react';

export interface AppSettings {
  defaultModel: string;
  embeddingModel: string;
}

const STORAGE_KEY = 'paper-dreamer-settings';

const DEFAULTS: AppSettings = {
  defaultModel: '',
  embeddingModel: 'nomic-embed-text',
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

export const EMBEDDING_MODELS = [
  { id: 'nomic-embed-text', label: 'Nomic Embed Text', size: '274 MB', dims: 768, context: '8K tokens' },
  { id: 'qwen3-embedding:0.6b', label: 'Qwen3 Embedding 0.6B', size: '639 MB', dims: 4096, context: '32K tokens' },
  { id: 'qwen3-embedding:4b', label: 'Qwen3 Embedding 4B', size: '2.5 GB', dims: 4096, context: '40K tokens' },
  { id: 'qwen3-embedding:8b', label: 'Qwen3 Embedding 8B', size: '4.7 GB', dims: 4096, context: '32K tokens' },
  { id: 'mxbai-embed-large', label: 'mxbai Embed Large', size: '670 MB', dims: 1024, context: '512 tokens' },
];

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSettings(loadSettings());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, update };
}
