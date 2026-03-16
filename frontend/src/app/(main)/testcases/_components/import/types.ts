/* ------------------------------------------------------------------ */
/*  Shared types for ImportDialog sub-components                       */
/* ------------------------------------------------------------------ */

export type FileFormat = 'xlsx' | 'csv' | 'xmind' | 'json' | null;
export type DuplicateStrategyType = 'skip' | 'overwrite' | 'rename';

export interface ColumnMapping {
  source: string;
  target: string | null;
}

export interface ParseResult {
  columns: string[];
  preview_rows: string[][];
  all_rows: string[][];
  total_rows: number;
  auto_mapping: Record<string, string | null>;
  is_standard: boolean;
}

export interface DuplicateInfo {
  index: number;
  title: string;
  existing_id: string;
  existing_case_id: string;
}

export interface FlatFolder {
  id: string;
  name: string;
  level: number;
  is_system: boolean;
}

export interface FolderTreeNode {
  id: string;
  name: string;
  level: number;
  is_system: boolean;
  children: FolderTreeNode[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  overwritten: number;
  renamed: number;
}

export const TARGET_FIELDS = [
  { value: 'title', label: '用例标题' },
  { value: 'precondition', label: '前置条件' },
  { value: 'steps', label: '测试步骤' },
  { value: 'expected_result', label: '预期结果' },
  { value: 'priority', label: '优先级' },
  { value: 'case_type', label: '用例类型' },
  { value: 'module_path', label: '所属模块' },
] as const;

export const REQUIRED_FIELDS = ['title', 'steps', 'expected_result'];
export const ACCEPT_EXTENSIONS = '.xlsx,.csv,.xmind,.json';

/* ------------------------------------------------------------------ */
/*  Step utilities                                                     */
/* ------------------------------------------------------------------ */

export type StepId = 'upload' | 'mapping' | 'preview' | 'duplicate' | 'result';

export const STEP_LABELS: Record<StepId, string> = {
  upload: '上传文件',
  mapping: '字段映射',
  preview: '数据预览',
  duplicate: '重复检测',
  result: '导入完成',
};

export function buildSteps(isStandard: boolean): StepId[] {
  if (isStandard) return ['upload', 'preview', 'duplicate', 'result'];
  return ['upload', 'mapping', 'preview', 'duplicate', 'result'];
}

/* ------------------------------------------------------------------ */
/*  File helpers                                                       */
/* ------------------------------------------------------------------ */

export function detectFormat(fileName: string): FileFormat {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'csv') return 'csv';
  if (ext === 'xmind') return 'xmind';
  if (ext === 'json') return 'json';
  return null;
}

export function flattenFolderTree(nodes: FolderTreeNode[]): FlatFolder[] {
  const result: FlatFolder[] = [];
  function walk(list: FolderTreeNode[]) {
    for (const node of list) {
      result.push({ id: node.id, name: node.name, level: node.level, is_system: node.is_system });
      if (node.children?.length) walk(node.children);
    }
  }
  walk(nodes);
  return result;
}
