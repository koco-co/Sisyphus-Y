export interface AnalyticsOverview {
  product_count: number;
  iteration_count: number;
  requirement_count: number;
  testcase_count: number;
  pass_rate: number;
  coverage_rate: number;
  defect_density: number;
  automation_rate: number;
  quality_score: number;
}

export interface DistributionItem {
  [key: string]: string | number;
  count: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface TrendData {
  case_count_trend: TrendPoint[];
  pass_rate_trend: TrendPoint[];
}

export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export function getGrade(score: number): QualityGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function getGradeColor(grade: QualityGrade): string {
  switch (grade) {
    case 'A':
      return 'text-sy-accent';
    case 'B':
      return 'text-sy-info';
    case 'C':
      return 'text-sy-warn';
    case 'D':
      return 'text-purple';
    case 'F':
      return 'text-sy-danger';
  }
}

export function getGradeBg(grade: QualityGrade): string {
  switch (grade) {
    case 'A':
      return 'bg-sy-accent/10 border-sy-accent/25';
    case 'B':
      return 'bg-sy-info/10 border-sy-info/25';
    case 'C':
      return 'bg-sy-warn/10 border-sy-warn/25';
    case 'D':
      return 'bg-purple/10 border-purple/25';
    case 'F':
      return 'bg-sy-danger/10 border-sy-danger/25';
  }
}
