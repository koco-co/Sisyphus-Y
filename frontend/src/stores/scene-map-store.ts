import { create } from 'zustand';

import { sceneMapApi } from '@/lib/api';

export type SceneMapStep = 'select' | 'analyzing' | 'confirm' | 'done';
export type TestPointSource = 'document' | 'supplemented' | 'missing' | 'pending';

export interface TestPointItem {
  id: string;
  scene_map_id?: string;
  group_name: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  estimated_cases: number;
  source: TestPointSource;
  category?: string;
  source_risk_id?: string | null;
  actual_cases_count?: number | null;
}

export interface GranularityWarning {
  id: string;
  test_point_id: string;
  message: string;
  suggestion: string;
}

interface SceneMapState {
  currentStep: SceneMapStep;
  selectedReqId: string | null;
  selectedReqTitle: string;
  testPoints: TestPointItem[];
  selectedPointId: string | null;
  checkedPointIds: Set<string>;
  isLocked: boolean;
  granularityWarnings: GranularityWarning[];
  searchQuery: string;

  setStep: (step: SceneMapStep) => void;
  setSelectedReq: (id: string | null, title?: string) => void;
  setTestPoints: (points: TestPointItem[]) => void;
  selectPoint: (id: string | null) => void;
  toggleCheckPoint: (id: string) => void;
  checkAllPoints: () => void;
  uncheckAllPoints: () => void;
  bulkCheckPoints: (ids: string[], checked: boolean) => void;
  updatePoint: (id: string, updates: Partial<TestPointItem>) => void;
  addPoint: (point: TestPointItem) => void;
  removePoint: (id: string) => void;
  confirmPoint: (id: string) => void;
  batchConfirmPoints: (
    ids: string[],
    onProgress?: (current: number, total: number) => void,
  ) => Promise<void>;
  ignorePoint: (id: string) => void;
  lockMap: () => void;
  setGranularityWarnings: (warnings: GranularityWarning[]) => void;
  setSearchQuery: (q: string) => void;
  reset: () => void;
}

export const useSceneMapStore = create<SceneMapState>((set) => ({
  currentStep: 'select',
  selectedReqId: null,
  selectedReqTitle: '',
  testPoints: [],
  selectedPointId: null,
  checkedPointIds: new Set(),
  isLocked: false,
  granularityWarnings: [],
  searchQuery: '',

  setStep: (step) => set({ currentStep: step }),
  setSelectedReq: (id, title = '') =>
    set({
      selectedReqId: id,
      selectedReqTitle: title,
      selectedPointId: null,
      checkedPointIds: new Set(),
      isLocked: false,
    }),
  setTestPoints: (points) =>
    set((s) => ({
      testPoints: points,
      checkedPointIds: new Set(points.filter((p) => p.status === 'confirmed').map((p) => p.id)),
      currentStep: points.length > 0 ? 'confirm' : s.currentStep,
    })),
  selectPoint: (id) => set({ selectedPointId: id }),
  toggleCheckPoint: (id) =>
    set((s) => {
      const next = new Set(s.checkedPointIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { checkedPointIds: next };
    }),
  checkAllPoints: () =>
    set((s) => ({
      checkedPointIds: new Set(s.testPoints.map((p) => p.id)),
    })),
  uncheckAllPoints: () => set({ checkedPointIds: new Set() }),
  bulkCheckPoints: (ids, checked) =>
    set((s) => {
      const next = new Set(s.checkedPointIds);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return { checkedPointIds: next };
    }),
  updatePoint: (id, updates) =>
    set((s) => ({
      testPoints: s.testPoints.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  addPoint: (point) => set((s) => ({ testPoints: [...s.testPoints, point] })),
  removePoint: (id) =>
    set((s) => ({
      testPoints: s.testPoints.filter((p) => p.id !== id),
      selectedPointId: s.selectedPointId === id ? null : s.selectedPointId,
    })),
  confirmPoint: (id) =>
    set((s) => ({
      testPoints: s.testPoints.map((p) => (p.id === id ? { ...p, status: 'confirmed' } : p)),
      checkedPointIds: new Set([...s.checkedPointIds, id]),
    })),
  batchConfirmPoints: async (ids, onProgress) => {
    const reqId = useSceneMapStore.getState().selectedReqId;
    if (!reqId) return;

    // Filter only unconfirmed points
    const unconfirmedIds = ids.filter((id) => {
      const point = useSceneMapStore.getState().testPoints.find((p) => p.id === id);
      return point && point.status !== 'confirmed';
    });

    if (unconfirmedIds.length === 0) return;

    // Update status locally first for immediate feedback
    set((s) => ({
      testPoints: s.testPoints.map((p) =>
        unconfirmedIds.includes(p.id) ? { ...p, status: 'confirmed' } : p,
      ),
      checkedPointIds: new Set([...s.checkedPointIds, ...unconfirmedIds]),
    }));

    // Call API to persist
    try {
      const updates = unconfirmedIds.map((id) => ({ id, status: 'confirmed' }));
      await sceneMapApi.batchUpdate(reqId, updates);

      // Report progress after API call completes
      if (onProgress) {
        onProgress(unconfirmedIds.length, unconfirmedIds.length);
      }
    } catch {
      // Revert on error
      set((s) => ({
        testPoints: s.testPoints.map((p) =>
          unconfirmedIds.includes(p.id) ? { ...p, status: 'pending' } : p,
        ),
      }));
      throw new Error('批量确认失败');
    }
  },
  ignorePoint: (id) =>
    set((s) => ({
      testPoints: s.testPoints.map((p) =>
        p.id === id ? { ...p, status: 'ignored', source: 'pending' as const } : p,
      ),
    })),
  lockMap: () => set({ isLocked: true, currentStep: 'done' }),
  setGranularityWarnings: (warnings) => set({ granularityWarnings: warnings }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  reset: () =>
    set({
      currentStep: 'select',
      selectedReqId: null,
      selectedReqTitle: '',
      testPoints: [],
      selectedPointId: null,
      checkedPointIds: new Set(),
      isLocked: false,
      granularityWarnings: [],
      searchQuery: '',
    }),
}));
