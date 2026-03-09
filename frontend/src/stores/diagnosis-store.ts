import { create } from 'zustand';

export type DiagnosisStep = 'select' | 'scan' | 'probe' | 'report';

interface DiagnosisState {
  currentStep: DiagnosisStep;
  isRunning: boolean;
  setStep: (step: DiagnosisStep) => void;
  setRunning: (running: boolean) => void;
  reset: () => void;
}

export const useDiagnosisStore = create<DiagnosisState>((set) => ({
  currentStep: 'select',
  isRunning: false,
  setStep: (step) => set({ currentStep: step }),
  setRunning: (running) => set({ isRunning: running }),
  reset: () => set({ currentStep: 'select', isRunning: false }),
}));
