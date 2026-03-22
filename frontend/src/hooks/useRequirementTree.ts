import { useCallback, useEffect, useState } from 'react';
import { type Folder, foldersApi, type Iteration, type Product, productsApi, type Requirement } from '@/lib/api';

export function useRequirementTree() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [iterations, setIterations] = useState<Record<string, Iteration[]>>({});
  const [iterationsLoading, setIterationsLoading] = useState<Record<string, boolean>>({});
  const [expandedIterations, setExpandedIterations] = useState<Set<string>>(new Set());
  const [requirements, setRequirements] = useState<Record<string, Requirement[]>>({});
  const [requirementsLoading, setRequirementsLoading] = useState<Record<string, boolean>>({});
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [selectedReqTitle, setSelectedReqTitle] = useState('');
  const [folders, setFolders] = useState<Record<string, Folder[]>>({});
  const [foldersLoading, setFoldersLoading] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    setProductsLoading(true);
    productsApi
      .list()
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setProductsLoading(false));
  }, []);

  const toggleProduct = useCallback(
    async (productId: string) => {
      setExpandedProducts((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) {
          next.delete(productId);
        } else {
          next.add(productId);
          if (!iterations[productId]) {
            setIterationsLoading((prev) => ({ ...prev, [productId]: true }));
            productsApi
              .listIterations(productId)
              .then((data) =>
                setIterations((p) => ({ ...p, [productId]: Array.isArray(data) ? data : [] })),
              )
              .catch((error) => {
                console.error(error);
                setIterations((p) => ({ ...p, [productId]: [] }));
              })
              .finally(() =>
                setIterationsLoading((prev) => ({
                  ...prev,
                  [productId]: false,
                })),
              );
          }
        }
        return next;
      });
    },
    [iterations],
  );

  const loadFolders = useCallback(
    async (productId: string, iterationId: string) => {
      if (folders[iterationId]) return; // 已加载

      setFoldersLoading((prev) => ({ ...prev, [iterationId]: true }));
      try {
        const data = await foldersApi.getTree(productId, iterationId);
        setFolders((prev) => ({ ...prev, [iterationId]: Array.isArray(data) ? data : [] }));
      } catch (error) {
        console.error('Failed to load folders:', error);
        setFolders((prev) => ({ ...prev, [iterationId]: [] }));
      } finally {
        setFoldersLoading((prev) => ({ ...prev, [iterationId]: false }));
      }
    },
    [folders],
  );

  const toggleIteration = useCallback(
    async (productId: string, iterationId: string) => {
      setExpandedIterations((prev) => {
        const next = new Set(prev);
        if (next.has(iterationId)) {
          next.delete(iterationId);
        } else {
          next.add(iterationId);
          if (!requirements[iterationId]) {
            setRequirementsLoading((prev) => ({ ...prev, [iterationId]: true }));
            productsApi
              .listRequirements(productId, iterationId)
              .then((data) =>
                setRequirements((p) => ({ ...p, [iterationId]: Array.isArray(data) ? data : [] })),
              )
              .catch((error) => {
                console.error(error);
                setRequirements((p) => ({ ...p, [iterationId]: [] }));
              })
              .finally(() =>
                setRequirementsLoading((prev) => ({
                  ...prev,
                  [iterationId]: false,
                })),
              );
          }
          // 加载文件夹
          loadFolders(productId, iterationId);
        }
        return next;
      });
    },
    [requirements, loadFolders],
  );

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const createFolder = useCallback(
    async (productId: string, iterationId: string, data: { name: string; parentId: string | null }) => {
      const folder = await foldersApi.create(productId, iterationId, {
        iteration_id: iterationId,
        name: data.name,
        parent_id: data.parentId,
      });
      // 刷新文件夹列表
      const updated = await foldersApi.getTree(productId, iterationId);
      setFolders((prev) => ({ ...prev, [iterationId]: updated }));
      return folder;
    },
    [],
  );

  const updateFolder = useCallback(
    async (productId: string, iterationId: string, folderId: string, data: { name?: string }) => {
      const folder = await foldersApi.update(folderId, data);
      // 刷新文件夹列表
      const updated = await foldersApi.getTree(productId, iterationId);
      setFolders((prev) => ({ ...prev, [iterationId]: updated }));
      return folder;
    },
    [],
  );

  const deleteFolder = useCallback(
    async (productId: string, iterationId: string, folderId: string) => {
      await foldersApi.delete(folderId);
      // 刷新文件夹列表和需求列表（需求可能被移至未分类）
      const [updatedFolders, updatedReqs] = await Promise.all([
        foldersApi.getTree(productId, iterationId),
        productsApi.listRequirements(productId, iterationId),
      ]);
      setFolders((prev) => ({ ...prev, [iterationId]: updatedFolders }));
      setRequirements((prev) => ({ ...prev, [iterationId]: updatedReqs }));
    },
    [],
  );

  const reorderFolders = useCallback(
    async (
      productId: string,
      iterationId: string,
      items: { id: string; sort_order: number; parent_id: string | null }[],
    ) => {
      await foldersApi.reorder({ items });
      // 刷新文件夹列表
      const updated = await foldersApi.getTree(productId, iterationId);
      setFolders((prev) => ({ ...prev, [iterationId]: updated }));
    },
    [],
  );

  const selectRequirement = useCallback((req: Requirement) => {
    setSelectedReqId(req.id);
    setSelectedReqTitle(req.title);
  }, []);

  return {
    products,
    productsLoading,
    expandedProducts,
    iterations,
    iterationsLoading,
    expandedIterations,
    requirements,
    requirementsLoading,
    selectedReqId,
    selectedReqTitle,
    folders,
    foldersLoading,
    expandedFolders,
    toggleProduct,
    toggleIteration,
    toggleFolder,
    loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
    selectRequirement,
  };
}
