'use client';

import { Check, FileSearch, ListChecks, MessageSquare, Radar } from 'lucide-react';
import type { DiagnosisStep } from '@/stores/diagnosis-store';

interface FlowStepsProps {
  currentStep: DiagnosisStep;
}

const steps: { key: DiagnosisStep; label: string; icon: typeof Radar }[] = [
  { key: 'select', label: '选择需求', icon: FileSearch },
  { key: 'scan', label: '广度扫描', icon: Radar },
  { key: 'probe', label: '深度追问', icon: MessageSquare },
  { key: 'report', label: '生成报告', icon: ListChecks },
];

const stepOrder: DiagnosisStep[] = ['select', 'scan', 'probe', 'report'];

function getStepStatus(
  stepKey: DiagnosisStep,
  currentStep: DiagnosisStep,
): 'done' | 'active' | 'pending' {
  const currentIdx = stepOrder.indexOf(currentStep);
  const stepIdx = stepOrder.indexOf(stepKey);
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export function FlowSteps({ currentStep }: FlowStepsProps) {
  return (
    <div className="px-3 py-3">
      {steps.map((step, i) => {
        const status = getStepStatus(step.key, currentStep);
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-start gap-2.5">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  status === 'done'
                    ? 'bg-accent/15 text-accent'
                    : status === 'active'
                      ? 'bg-accent text-white dark:text-black'
                      : 'bg-bg3 text-text3'
                }`}
              >
                {status === 'done' ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-px h-5 my-0.5 ${status === 'done' ? 'bg-accent/30' : 'bg-border'}`}
                />
              )}
            </div>
            <div className="pt-0.5">
              <span
                className={`text-[12px] font-medium ${
                  status === 'done'
                    ? 'text-accent'
                    : status === 'active'
                      ? 'text-text'
                      : 'text-text3'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
