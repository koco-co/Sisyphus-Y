export function getWorkbenchRequirementId(
  searchParams: Pick<URLSearchParams, 'get'> | null,
): string | null {
  const reqId = searchParams?.get('reqId')?.trim();
  if (reqId) {
    return reqId;
  }

  const req = searchParams?.get('req')?.trim();
  return req || null;
}
