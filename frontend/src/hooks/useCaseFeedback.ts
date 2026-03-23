'use client';

import { useCallback, useState } from 'react';
import { testcasesApi } from '@/lib/api';
import type { WorkbenchTestCase } from '@/stores/workspace-store';

export function useCaseFeedback(testCases: WorkbenchTestCase[]) {
  const [feedbacks, setFeedbacks] = useState<Record<string, 'up' | 'down'>>({});

  const handleFeedback = useCallback(
    async (displayCaseId: string, value: 'up' | 'down') => {
      const tc = testCases.find((t) => t.case_id === displayCaseId);
      if (!tc) return;

      setFeedbacks((prev) => ({ ...prev, [displayCaseId]: value }));
      try {
        if (value === 'up') {
          await testcasesApi.adoptCase(tc.id);
        } else {
          await testcasesApi.rejectCase(tc.id);
        }
      } catch {
        setFeedbacks((prev) => {
          const { [displayCaseId]: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [testCases],
  );

  return { feedbacks, handleFeedback };
}
