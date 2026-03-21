import { create } from 'zustand';

export type StreamPhase = 'idle' | 'thinking' | 'generating' | 'organizing' | 'done';

const PHASE_LABELS: Record<StreamPhase, string> = {
  idle: '',
  thinking: '正在理解需求结构...',
  generating: '正在生成内容...',
  organizing: '正在整理分析结果...',
  done: '',
};

interface StreamState {
  thinkingText: string;
  contentText: string;
  isStreaming: boolean;
  isThinkingDone: boolean;
  phase: StreamPhase;
  phaseLabel: string;
  reset: () => void;
  appendThinking: (delta: string) => void;
  appendContent: (delta: string) => void;
  setOrganizing: () => void;
  setDone: () => void;
}

export const useStreamStore = create<StreamState>((set) => ({
  thinkingText: '',
  contentText: '',
  isStreaming: false,
  isThinkingDone: false,
  phase: 'idle',
  phaseLabel: '',
  reset: () =>
    set({
      thinkingText: '',
      contentText: '',
      isStreaming: false,
      isThinkingDone: false,
      phase: 'idle',
      phaseLabel: '',
    }),
  appendThinking: (delta) =>
    set((s) => ({
      thinkingText: s.thinkingText + delta,
      isStreaming: true,
      phase: 'thinking',
      phaseLabel: PHASE_LABELS.thinking,
    })),
  appendContent: (delta) =>
    set((s) => ({
      contentText: s.contentText + delta,
      isStreaming: true,
      isThinkingDone: true,
      phase: 'generating',
      phaseLabel: PHASE_LABELS.generating,
    })),
  setOrganizing: () =>
    set({
      phase: 'organizing',
      phaseLabel: PHASE_LABELS.organizing,
    }),
  setDone: () =>
    set({
      isStreaming: false,
      phase: 'done',
      phaseLabel: '',
    }),
}));
