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
      return 'text-accent';
    case 'B':
      return 'text-blue';
    case 'C':
      return 'text-amber';
    case 'D':
      return 'text-purple';
    case 'F':
      return 'text-red';
  }
}

export function getGradeBg(grade: QualityGrade): string {
  switch (grade) {
    case 'A':
      return 'bg-accent/10 border-accent/25';
    case 'B':
      return 'bg-blue/10 border-blue/25';
    case 'C':
      return 'bg-amber/10 border-amber/25';
    case 'D':
      return 'bg-purple/10 border-purple/25';
    case 'F':
      return 'bg-red/10 border-red/25';
  }
}
