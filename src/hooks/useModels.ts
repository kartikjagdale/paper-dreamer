import { useCallback, useEffect, useState } from 'react';
import { OllamaModelInfo } from '../types';
import { useSettings } from './useSettings';

export type OllamaStatus = 'loading' | 'ready' | 'unavailable' | 'no-models';

export function useModels() {
  const { settings } = useSettings();
  const [availableModels, setAvailableModels] = useState<OllamaModelInfo[]>([]);
  const [model, setModel] = useState('');
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('loading');
  const [retrying, setRetrying] = useState(false);

  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const res = await fetch('/api/models');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch models' }));
        setModelsError(err.error);
        setOllamaStatus('unavailable');
        return;
      }
      const data = await res.json();
      setAvailableModels(data.models);
      if (data.models.length > 0) {
        const userDefault = settings.defaultModel;
        const userDefaultExists = userDefault && data.models.some((m: OllamaModelInfo) => m.name === userDefault);
        const serverDefault = data.defaultModel && data.models.some((m: OllamaModelInfo) => m.name === data.defaultModel);
        setModel(
          userDefaultExists ? userDefault :
          serverDefault ? data.defaultModel :
          data.models[0].name
        );
        setOllamaStatus('ready');
      } else {
        setOllamaStatus('no-models');
      }
    } catch {
      setModelsError('Cannot connect to Ollama. Is it running?');
      setOllamaStatus('unavailable');
    } finally {
      setModelsLoading(false);
      setRetrying(false);
    }
  }, [settings.defaultModel]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const retry = useCallback(() => {
    setRetrying(true);
    fetchModels();
  }, [fetchModels]);

  return { availableModels, model, setModel, modelsLoading, modelsError, ollamaStatus, retrying, retry };
}
