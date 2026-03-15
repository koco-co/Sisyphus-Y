import { expect, test } from 'bun:test';
import { extractRequirementTestCases } from './useRequirement';

test('extractRequirementTestCases unwraps paginated testcase responses', () => {
  const result = extractRequirementTestCases({
    items: [
      {
        id: 'case-001',
        case_id: 'TC-001',
        title: '分页响应中的用例',
        priority: 'P1',
        status: 'draft',
      },
    ],
  });

  expect(JSON.stringify(result)).toBe(
    JSON.stringify([
      {
        id: 'case-001',
        case_id: 'TC-001',
        title: '分页响应中的用例',
        priority: 'P1',
        status: 'draft',
      },
    ]),
  );
});

test('extractRequirementTestCases tolerates missing testcase items', () => {
  expect(JSON.stringify(extractRequirementTestCases(undefined))).toBe(JSON.stringify([]));
  expect(JSON.stringify(extractRequirementTestCases({}))).toBe(JSON.stringify([]));
});
