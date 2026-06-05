import { useCallback, useEffect, useState } from 'react';
import { AnalysisResponse, HistoryItem } from '../types';

export interface LoadedEntry {
  result: AnalysisResponse;
  paperId: string | null;
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const loadEntry = async (id: string): Promise<LoadedEntry | null> => {
    try {
      const res = await fetch(`/api/history/${id}`);
      if (res.ok) {
        const data = await res.json();
        return { result: data.result as AnalysisResponse, paperId: data.paperId || null };
      }
    } catch {
      // silent
    }
    return null;
  };

  const deleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        sessionStorage.removeItem('paper-dreamer-session');
      }
    } catch {
      // silent
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (res.ok) {
        setItems([]);
        sessionStorage.removeItem('paper-dreamer-session');
      }
    } catch {
      // silent
    }
  };

  return { items, loading, refresh, loadEntry, deleteEntry, clearAll };
}
