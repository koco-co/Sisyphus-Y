export function getAnalysisHomeHref(): string {
  return '/analysis';
}

export function getAnalysisDiagnosisHref(id?: string): string {
  return id ? `/analysis/diagnosis/${id}` : '/analysis';
}

export function getAnalysisSceneMapHref(id?: string): string {
  return id ? `/analysis/scene-map/${id}` : '/analysis';
}

export function getWorkbenchHref(reqId?: string): string {
  return reqId ? `/workbench?req=${reqId}` : '/workbench';
}
