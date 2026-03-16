import { create } from 'zustand';

// ── Types ──

export interface TextDiff {
  diff_text: string;
  additions: number;
  deletions: number;
}

export interface SemanticChange {
  type: 'added' | 'modified' | 'deleted' | 'fixed';
  description: string;
  impact_scope: string;
  severity: 'high' | 'medium' | 'low';
}

export interface SemanticImpact {
  changes: SemanticChange[];
  summary: string;
  overall_risk: string;
}

export interface AffectedTestPoint {
  id: string;
  title: string;
  group_name: string;
  status: string;
  impact_reason: string;
}

export interface AffectedTestCase {
  id: string;
  case_id: string;
  title: string;
  priority: string;
  status: string;
  impact_type: 'rewrite' | 'review' | 'none';
  change_impact?: 'needs_rewrite' | 'needs_review' | 'not_affected' | null;
}

export interface DiffResult {
  id: string;
  requirement_id: string;
  version_from: number;
  version_to: number;
  text_diff: TextDiff;
  semantic_impact: SemanticImpact | null;
  impact_level: string;
  affected_test_points: { count: number; items: AffectedTestPoint[] } | null;
  affected_test_cases: { count: number; items: AffectedTestCase[] } | null;
  summary: string | null;
  created_at: string | null;
}

export interface DiffHistoryItem {
  id: string;
  version_from: number;
  version_to: number;
  impact_level: string;
  summary: string;
  created_at: string;
}

export interface SuggestionItem {
  name: string;
  description: string;
  category: string;
  priority: string;
  reason: string;
}

// ── Store ──

interface DiffState {
  requirementId: string | null;
  setRequirementId: (id: string | null) => void;

  versionFrom: number;
  versionTo: number;
  setVersionFrom: (v: number) => void;
  setVersionTo: (v: number) => void;
  swapVersions: () => void;

  diffResult: DiffResult | null;
  setDiffResult: (r: DiffResult | null) => void;

  history: DiffHistoryItem[];
  setHistory: (h: DiffHistoryItem[]) => void;

  suggestions: SuggestionItem[];
  setSuggestions: (s: SuggestionItem[]) => void;
  adoptedIds: Set<number>;
  dismissedIds: Set<number>;
  adoptSuggestion: (index: number) => void;
  dismissSuggestion: (index: number) => void;

  computing: boolean;
  setComputing: (v: boolean) => void;
  regenerating: boolean;
  setRegenerating: (v: boolean) => void;
  regenerateProgress: number;
  setRegenerateProgress: (v: number) => void;

  reset: () => void;
}

export const useDiffStore = create<DiffState>((set) => ({
  requirementId: null,
  setRequirementId: (id) => set({ requirementId: id }),

  versionFrom: 1,
  versionTo: 2,
  setVersionFrom: (v) => set({ versionFrom: v }),
  setVersionTo: (v) => set({ versionTo: v }),
  swapVersions: () => set((s) => ({ versionFrom: s.versionTo, versionTo: s.versionFrom })),

  diffResult: null,
  setDiffResult: (r) => set({ diffResult: r }),

  history: [],
  setHistory: (h) => set({ history: h }),

  suggestions: [],
  setSuggestions: (s) => set({ suggestions: s }),
  adoptedIds: new Set(),
  dismissedIds: new Set(),
  adoptSuggestion: (index) =>
    set((s) => {
      const next = new Set(s.adoptedIds);
      next.add(index);
      return { adoptedIds: next };
    }),
  dismissSuggestion: (index) =>
    set((s) => {
      const next = new Set(s.dismissedIds);
      next.add(index);
      return { dismissedIds: next };
    }),

  computing: false,
  setComputing: (v) => set({ computing: v }),
  regenerating: false,
  setRegenerating: (v) => set({ regenerating: v }),
  regenerateProgress: 0,
  setRegenerateProgress: (v) => set({ regenerateProgress: v }),

  reset: () =>
    set({
      diffResult: null,
      history: [],
      suggestions: [],
      adoptedIds: new Set(),
      dismissedIds: new Set(),
      computing: false,
      regenerating: false,
      regenerateProgress: 0,
    }),
}));
