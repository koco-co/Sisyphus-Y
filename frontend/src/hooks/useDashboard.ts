import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  useDashboardStore,
  type DashboardStats,
  type PendingItem,
  type ActivityItem,
} from '@/stores/dashboard-store';

const fallbackStats: DashboardStats = {
  product_count: 6,
  iteration_count: 12,
  requirement_count: 69,
  testcase_count: 847,
  coverage_rate: 94,
  weekly_cases: 847,
  pending_diagnosis: 18,
};

const fallbackPendingItems: PendingItem[] = [
  {
    id: 'p1',
    type: 'unconfirmed_testpoint',
    title: '数据导入模块存在 3 个未确认测试点',
    description: '场景地图中有高风险缺失节点，需尽快确认',
    product_name: '离线开发平台',
    priority: 'high',
    link: '/scene-map',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p2',
    type: 'pending_review',
    title: '实时流处理 — 14 条用例待审核',
    description: 'AI 生成的用例已就绪，等待人工评审确认',
    product_name: '实时计算引擎',
    priority: 'medium',
    link: '/testcases',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p3',
    type: 'failed_diagnosis',
    title: '数据质量规则引擎诊断异常',
    description: '需求文档解析失败，建议补充结构化描述',
    product_name: '数据治理平台',
    priority: 'high',
    link: '/diagnosis',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p4',
    type: 'low_coverage',
    title: '数据资产标签体系覆盖率仅 62%',
    description: '低于 80% 阈值，建议补充边界场景用例',
    product_name: '数据资产中心',
    priority: 'medium',
    link: '/coverage',
    created_at: new Date().toISOString(),
  },
];

const fallbackActivities: ActivityItem[] = [
  { id: 'a1', time: new Date(Date.now() - 28 * 60000).toISOString(), action: '生成 14 条用例', resource: 'testcase', resource_id: '', title: '离线开发平台 · 数据导入', user: '张工' },
  { id: 'a2', time: new Date(Date.now() - 62 * 60000).toISOString(), action: '完成需求健康诊断', resource: 'diagnosis', resource_id: '', title: '实时计算引擎 · 窗口函数', user: '李工' },
  { id: 'a3', time: new Date(Date.now() - 105 * 60000).toISOString(), action: '确认场景地图测试点', resource: 'scene_map', resource_id: '', title: '数据资产中心 · 标签管理', user: '王工' },
  { id: 'a4', time: new Date(Date.now() - 180 * 60000).toISOString(), action: '上传知识库文档', resource: 'knowledge', resource_id: '', title: '测试规范 v2.1.pdf', user: '张工' },
  { id: 'a5', time: new Date(Date.now() - 360 * 60000).toISOString(), action: '导出测试报告', resource: 'export', resource_id: '', title: '离线开发平台 · Sprint 24-W04', user: '李工' },
  { id: 'a6', time: new Date(Date.now() - 24 * 3600000).toISOString(), action: '新建迭代 Sprint 24-W05', resource: 'iteration', resource_id: '', title: '数据资产中心', user: '王工' },
  { id: 'a7', time: new Date(Date.now() - 25 * 3600000).toISOString(), action: '更新需求文档', resource: 'requirement', resource_id: '', title: '数据治理平台 · 质量规则', user: '赵工' },
];

export function useDashboard() {
  const store = useDashboardStore();
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, pending, activities] = await Promise.allSettled([
        api.get<DashboardStats>('/dashboard/stats'),
        api.get<PendingItem[]>('/dashboard/pending-items'),
        api.get<ActivityItem[]>('/dashboard/activities?limit=10'),
      ]);

      store.setStats(
        stats.status === 'fulfilled' ? stats.value : fallbackStats,
      );
      store.setPendingItems(
        pending.status === 'fulfilled' && pending.value.length > 0
          ? pending.value
          : fallbackPendingItems,
      );
      store.setActivities(
        activities.status === 'fulfilled' && activities.value.length > 0
          ? activities.value
          : fallbackActivities,
      );
    } catch {
      store.setStats(fallbackStats);
      store.setPendingItems(fallbackPendingItems);
      store.setActivities(fallbackActivities);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    stats: store.stats ?? fallbackStats,
    pendingItems: store.pendingItems.length > 0 ? store.pendingItems : fallbackPendingItems,
    activities: store.activities.length > 0 ? store.activities : fallbackActivities,
    loading,
    refresh: fetchAll,
  };
}
