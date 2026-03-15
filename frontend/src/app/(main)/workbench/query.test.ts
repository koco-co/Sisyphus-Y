import { expect, test } from 'bun:test';
import { getWorkbenchRequirementId } from './query';

test('getWorkbenchRequirementId prefers reqId over req', () => {
  const params = new URLSearchParams('reqId=req-001&req=req-002');

  expect(getWorkbenchRequirementId(params)).toBe('req-001');
});

test('getWorkbenchRequirementId falls back to req', () => {
  const params = new URLSearchParams('req=req-002');

  expect(getWorkbenchRequirementId(params)).toBe('req-002');
});

test('getWorkbenchRequirementId ignores empty values', () => {
  const params = new URLSearchParams('reqId=&req=');

  expect(getWorkbenchRequirementId(params)).toBeNull();
});
