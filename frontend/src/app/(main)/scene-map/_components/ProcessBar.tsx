'use client';

import { ArrowRight, Check, CheckCircle, FileSearch, Lock, Sparkles } from 'lucide-react';
import type { SceneMapStep } from '@/stores/scene-map-store';

const steps: { key: SceneMapStep; label: string; icon: typeof FileSearch }[] = [
  { key: 'select', label: '需求选择', icon: FileSearch },
  { key: 'analyzing', label: 'AI 分析', icon: Sparkles },
  { key: 'confirm', label: '测试点确认', icon: CheckCircle },
  { key: 'done', label: '完成', icon: Lock },
];

const stepOrder: SceneMapStep[] = ['select', 'analyzing', 'confirm', 'done'];

interface ProcessBarProps {
  currentStep: SceneMapStep;
}

export function ProcessBar({ currentStep }: ProcessBarProps) {
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center gap-1 px-4 py-3 border-b border-sy-border bg-sy-bg-1">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                isDone
                  ? 'bg-sy-accent text-black'
                  : isActive
                    ? 'bg-sy-accent/10 text-sy-accent border border-sy-accent/30'
                    : 'bg-sy-bg-2 text-sy-text-3'
              }`}
            >
              {isDone ? <Check size={12} strokeWidth={3} /> : <Icon size={12} />}
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight
                size={14}
                className={`mx-1 ${
                  i < currentIndex ? 'text-sy-accent' : 'text-sy-text-3 opacity-40'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
