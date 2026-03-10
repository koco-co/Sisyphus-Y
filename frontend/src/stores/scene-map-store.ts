import { create } from 'zustand';

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
  updatePoint: (id: string, updates: Partial<TestPointItem>) => void;
  addPoint: (point: TestPointItem) => void;
  removePoint: (id: string) => void;
  confirmPoint: (id: string) => void;
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
