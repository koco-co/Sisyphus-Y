import { useCallback } from 'react';
import { api } from '@/lib/api';
import {
  type DiffHistoryItem,
  type DiffResult,
  type SuggestionItem,
  useDiffStore,
} from '@/stores/diff-store';

interface SuggestionResponse {
  suggestions: SuggestionItem[];
  count: number;
}

interface RegenerateResponse {
  regenerated_cases: Record<string, unknown>[];
  count: number;
}

export function useDiff() {
  const store = useDiffStore();

  const computeDiff = useCallback(async () => {
    const { requirementId, versionFrom, versionTo } = useDiffStore.getState();
    if (!requirementId) return;
    store.setComputing(true);
    try {
      const result = await api.post<DiffResult>(`/diff/${requirementId}/compute`, {
        version_from: versionFrom,
        version_to: versionTo,
      });
      store.setDiffResult(result);
    } catch (_e) {
      // silently ignore
    } finally {
      store.setComputing(false);
    }
  }, [store]);

  const loadHistory = useCallback(async () => {
    const { requirementId } = useDiffStore.getState();
    if (!requirementId) return;
    try {
      const items = await api.get<DiffHistoryItem[]>(`/diff/${requirementId}/history`);
      store.setHistory(items);
    } catch (_e) {
      // silently ignore
    }
  }, [store]);

  const loadLatest = useCallback(async () => {
    const { requirementId } = useDiffStore.getState();
    if (!requirementId) return;
    try {
      const result = await api.get<DiffResult | null>(`/diff/${requirementId}/latest`);
      if (result) store.setDiffResult(result);
    } catch (_e) {
      // silently ignore
    }
  }, [store]);

  const loadSuggestions = useCallback(async () => {
    const { requirementId } = useDiffStore.getState();
    if (!requirementId) return;
    try {
      const data = await api.get<SuggestionResponse>(`/diff/${requirementId}/suggestions`);
      store.setSuggestions(data.suggestions);
    } catch (_e) {
      // silently ignore
    }
  }, [store]);

  const regenerateCases = useCallback(
    async (testPointIds?: string[]) => {
      const { requirementId } = useDiffStore.getState();
      if (!requirementId) return null;
      store.setRegenerating(true);
      store.setRegenerateProgress(0);

      const progressInterval = setInterval(() => {
        const { regenerateProgress } = useDiffStore.getState();
        if (regenerateProgress < 90) {
          store.setRegenerateProgress(regenerateProgress + 10);
        }
      }, 500);

      try {
        const result = await api.post<RegenerateResponse>(`/diff/${requirementId}/regenerate`, {
          test_point_ids: testPointIds ?? null,
        });
        store.setRegenerateProgress(100);
        return result;
      } catch (_e) {
        return null;
      } finally {
        clearInterval(progressInterval);
        setTimeout(() => {
          store.setRegenerating(false);
          store.setRegenerateProgress(0);
        }, 800);
      }
    },
    [store],
  );

  return {
    ...store,
    computeDiff,
    loadHistory,
    loadLatest,
    loadSuggestions,
    regenerateCases,
  };
}
