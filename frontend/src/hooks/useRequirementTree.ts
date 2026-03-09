import { useCallback, useEffect, useState } from 'react';
import { type Iteration, type Product, productsApi, type Requirement } from '@/lib/api';

export function useRequirementTree() {
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [iterations, setIterations] = useState<Record<string, Iteration[]>>({});
  const [expandedIterations, setExpandedIterations] = useState<Set<string>>(new Set());
  const [requirements, setRequirements] = useState<Record<string, Requirement[]>>({});
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [selectedReqTitle, setSelectedReqTitle] = useState('');

  useEffect(() => {
    productsApi
      .list()
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(console.error);
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
            productsApi
              .listIterations(productId)
              .then((data) =>
                setIterations((p) => ({ ...p, [productId]: Array.isArray(data) ? data : [] })),
              )
              .catch(console.error);
          }
        }
        return next;
      });
    },
    [iterations],
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
            productsApi
              .listRequirements(productId, iterationId)
              .then((data) =>
                setRequirements((p) => ({ ...p, [iterationId]: Array.isArray(data) ? data : [] })),
              )
              .catch(console.error);
          }
        }
        return next;
      });
    },
    [requirements],
  );

  const selectRequirement = useCallback((req: Requirement) => {
    setSelectedReqId(req.id);
    setSelectedReqTitle(req.title);
  }, []);

  return {
    products,
    expandedProducts,
    iterations,
    expandedIterations,
    requirements,
    selectedReqId,
    selectedReqTitle,
    toggleProduct,
    toggleIteration,
    selectRequirement,
  };
}
