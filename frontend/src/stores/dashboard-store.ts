import { create } from 'zustand';

export interface DashboardStats {
  product_count: number;
  iteration_count: number;
  requirement_count: number;
  testcase_count: number;
  coverage_rate: number;
  weekly_cases: number;
  pending_diagnosis: number;
}

export interface PendingItem {
  id: string;
  type: 'unconfirmed_testpoint' | 'pending_review' | 'failed_diagnosis' | 'low_coverage';
  title: string;
  description: string;
  product_name: string;
  priority: 'high' | 'medium' | 'low';
  link: string;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  time: string;
  action: string;
  resource: string;
  resource_id: string;
  title: string;
  user: string;
}

interface DashboardState {
  stats: DashboardStats | null;
  pendingItems: PendingItem[];
  activities: ActivityItem[];

  setStats: (stats: DashboardStats) => void;
  setPendingItems: (items: PendingItem[]) => void;
  setActivities: (activities: ActivityItem[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  pendingItems: [],
  activities: [],

  setStats: (stats) => set({ stats }),
  setPendingItems: (items) => set({ pendingItems: items }),
  setActivities: (activities) => set({ activities: activities }),
}));
