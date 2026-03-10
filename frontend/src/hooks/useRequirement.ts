import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { type RequirementDetail, type RequirementVersion, requirementsApi } from '@/lib/api';
import { apiClient } from '@/lib/api-client';

interface TestPointItem {
  id: string;
  title: string;
  group_name: string;
  priority: string;
  status: string;
}

interface TestCaseItem {
  id: string;
  case_id: string;
  title: string;
  priority: string;
  status: string;
}

export function useRequirement(reqId: string | undefined) {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(false);
  const requireReqId = useCallback(() => {
    if (!reqId) {
      throw new Error('Requirement ID is required');
    }
    return reqId;
  }, [reqId]);

  const requirementQuery = useQuery({
    queryKey: ['requirement', reqId],
    queryFn: () => apiClient<RequirementDetail>(`/products/requirements/${reqId}`),
    enabled: !!reqId,
  });

  const versionsQuery = useQuery({
    queryKey: ['requirement-versions', reqId],
    queryFn: () => apiClient<RequirementVersion[]>(`/products/requirements/${reqId}/versions`),
    enabled: !!reqId,
    retry: false,
  });

  const sceneMapQuery = useQuery({
    queryKey: ['scene-map', reqId],
    queryFn: () => apiClient<{ test_points: TestPointItem[] }>(`/scene-map/${reqId}`),
    enabled: !!reqId,
    retry: false,
  });

  const testCasesQuery = useQuery({
    queryKey: ['testcases-for-req', reqId],
    queryFn: () => apiClient<TestCaseItem[]>(`/testcases?requirement_id=${reqId}`),
    enabled: !!reqId,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof requirementsApi.update>[1]) =>
      requirementsApi.update(requireReqId(), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirement', reqId] });
      queryClient.invalidateQueries({ queryKey: ['requirement-versions', reqId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => requirementsApi.delete(requireReqId()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
  });

  const updateFrontmatter = useCallback(
    async (data: { frontmatter: Record<string, unknown>; status: string }) => {
      await updateMutation.mutateAsync({
        frontmatter: data.frontmatter,
        status: data.status,
      });
    },
    [updateMutation],
  );

  const updateContent = useCallback(
    async (contentAst: Record<string, unknown>) => {
      await updateMutation.mutateAsync({ content_ast: contentAst });
    },
    [updateMutation],
  );

  const rollbackToVersion = useCallback(
    async (_versionId: string, _version: number) => {
      const versions = versionsQuery.data;
      if (!versions) return;
      const target = versions.find((v) => v.id === _versionId);
      if (!target) return;
      await updateMutation.mutateAsync({ content_ast: target.content_ast });
    },
    [versionsQuery.data, updateMutation],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!reqId) return;
      setUploadProgress(true);
      try {
        // For now, upload as requirement document attachment
        const fd = new FormData();
        fd.append('file', file);
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
        await fetch(`${API_BASE}/products/requirements/${reqId}/attachments`, {
          method: 'POST',
          body: fd,
        });
      } finally {
        setUploadProgress(false);
      }
    },
    [reqId],
  );

  return {
    requirement: requirementQuery.data,
    requirementLoading: requirementQuery.isLoading,
    versions: versionsQuery.data ?? [],
    versionsLoading: versionsQuery.isLoading,
    testPoints: sceneMapQuery.data?.test_points ?? [],
    testCases: testCasesQuery.data ?? [],
    relationsLoading: sceneMapQuery.isLoading || testCasesQuery.isLoading,
    updateFrontmatter,
    updateContent,
    rollbackToVersion,
    uploadFile,
    uploadProgress,
    deleteRequirement: deleteMutation.mutateAsync,
    updating: updateMutation.isPending,
  };
}
