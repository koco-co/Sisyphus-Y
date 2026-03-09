export interface CoverageRequirement {
  id: string;
  req_id: string;
  title: string;
  test_points: CoverageTestPoint[];
  coverage_status: 'full' | 'partial' | 'none';
}

export interface CoverageTestPoint {
  id: string;
  title: string;
  priority: string;
  case_count: number;
  cases: CoverageCaseRef[];
}

export interface CoverageCaseRef {
  id: string;
  case_id: string;
  title: string;
  status: string;
}

export interface IterationCoverage {
  iteration_id: string;
  iteration_name: string;
  coverage_rate: number;
  requirement_count: number;
  testcase_count: number;
  uncovered_count: number;
  requirements?: CoverageRequirement[];
}

export interface CoverageResponse {
  iterations: IterationCoverage[];
}

export interface CoverageSummary {
  avgRate: number;
  totalReqs: number;
  totalCovered: number;
  totalPartial: number;
  totalUncovered: number;
}
