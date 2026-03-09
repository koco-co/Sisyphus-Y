import { useCallback, useEffect, useState } from 'react';
import { api, type Product, productsApi } from '@/lib/api';
import type { CoverageResponse, CoverageSummary, IterationCoverage } from './types';

export function useCoverageData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [iterations, setIterations] = useState<IterationCoverage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    productsApi
      .list()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const loadCoverage = useCallback(async (productId: string) => {
    setSelectedProduct(productId);
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<CoverageResponse>(`/coverage/product/${productId}`);
      setIterations(data.iterations ?? []);
    } catch {
      setError('加载覆盖度数据失败');
      setIterations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const summary: CoverageSummary = {
    avgRate:
      iterations.length > 0
        ? Math.round(
            iterations.reduce((s, it) => s + (it.coverage_rate || 0), 0) / iterations.length,
          )
        : 0,
    totalReqs: iterations.reduce((s, it) => s + (it.requirement_count || 0), 0),
    totalCovered: iterations.reduce(
      (s, it) => s + (it.requirement_count - it.uncovered_count || 0),
      0,
    ),
    totalPartial: 0,
    totalUncovered: iterations.reduce((s, it) => s + (it.uncovered_count || 0), 0),
  };

  return {
    products,
    selectedProduct,
    iterations,
    loading,
    error,
    summary,
    loadCoverage,
  };
}
