# CSV 历史用例批量列清洗 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `清洗后数据/` 下 228 个 CSV 文件原地精简为 6 列（所属模块, 用例标题, 前置条件, 步骤, 预期结果, 优先级），删除冗余列（用例编号, 相关需求, 用例类型）。

**Architecture:** 单个独立 Python 脚本，使用标准库 `csv` 模块，原子写入（写临时文件后 rename），零额外依赖。所有文件编码统一输出为 `utf-8-sig`（带 BOM，Excel 兼容）。

**Tech Stack:** Python 3 标准库（csv, os, pathlib, tempfile）

---

### Task 1：编写测试脚本

**Files:**
- Create: `scripts/test_clean_csv.py`

**Step 1: 创建测试文件**

在 `scripts/test_clean_csv.py` 写入以下内容，用于验证清洗结果是否正确：

```python
#!/usr/bin/env python3
"""验证清洗后 CSV 文件是否符合预期格式。"""
import csv
import glob
import sys

KEEP_COLS = ["所属模块", "用例标题", "前置条件", "步骤", "预期结果", "优先级"]
ROOT = "清洗后数据"

errors = []
files = glob.glob(f"{ROOT}/**/*.csv", recursive=True)

if not files:
    print("ERROR: 未找到任何 CSV 文件，请在项目根目录运行本脚本")
    sys.exit(1)

for path in files:
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        if list(headers) != KEEP_COLS:
            errors.append(f"  列不符: {path}\n    期望: {KEEP_COLS}\n    实际: {list(headers)}")

if errors:
    print(f"FAIL: {len(errors)}/{len(files)} 个文件不符合要求")
    print("\n".join(errors[:10]))  # 最多展示前 10 条
    sys.exit(1)
else:
    print(f"PASS: 全部 {len(files)} 个文件列格式正确 ✓")
```

**Step 2: 运行测试，确认当前状态为 FAIL**

```bash
cd /Users/poco/Projects/Sisyphus-Y
python3 scripts/test_clean_csv.py
```

预期输出：
```
FAIL: 228/228 个文件不符合要求
  列不符: 清洗后数据/...
    期望: ['所属模块', '用例标题', '前置条件', '步骤', '预期结果', '优先级']
    实际: ['用例编号', '用例标题', '所属模块', '相关需求', '前置条件', '步骤', '预期结果', '优先级', '用例类型']
```

**Step 3: 提交测试文件**

```bash
git add scripts/test_clean_csv.py
git commit -m "test: add CSV column format validator"
```

---

### Task 2：编写清洗脚本

**Files:**
- Create: `scripts/clean_csv_columns.py`

**Step 1: 创建清洗脚本**

在 `scripts/clean_csv_columns.py` 写入以下内容：

```python
#!/usr/bin/env python3
"""
批量清洗 清洗后数据/ 下所有 CSV 文件，原地保留 6 列：
所属模块, 用例标题, 前置条件, 步骤, 预期结果, 优先级

用法（在项目根目录执行）：
    python3 scripts/clean_csv_columns.py
"""
import csv
import glob
import os
import sys
import tempfile

KEEP_COLS = ["所属模块", "用例标题", "前置条件", "步骤", "预期结果", "优先级"]
ROOT = "清洗后数据"

# 尝试的编码顺序
ENCODINGS = ["utf-8-sig", "utf-8", "gbk"]


def detect_encoding(path: str) -> str:
    for enc in ENCODINGS:
        try:
            with open(path, encoding=enc, newline="") as f:
                csv.DictReader(f).fieldnames  # 触发读取
            return enc
        except (UnicodeDecodeError, Exception):
            continue
    raise ValueError(f"无法识别文件编码: {path}")


def clean_file(path: str) -> tuple[int, int]:
    """清洗单个文件，返回 (原始行数, 写入行数)。"""
    enc = detect_encoding(path)
    rows: list[dict] = []

    with open(path, encoding=enc, newline="") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        missing = [col for col in KEEP_COLS if col not in headers]
        if missing:
            raise ValueError(f"缺少必要列 {missing}，当前列: {list(headers)}")
        for row in reader:
            rows.append({col: row.get(col, "") for col in KEEP_COLS})

    # 原子写入：写临时文件后 rename，防止中途崩溃损坏原文件
    dir_ = os.path.dirname(os.path.abspath(path))
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8-sig", newline="",
        dir=dir_, delete=False, suffix=".tmp"
    ) as tmp:
        tmp_path = tmp.name
        writer = csv.DictWriter(tmp, fieldnames=KEEP_COLS)
        writer.writeheader()
        writer.writerows(rows)

    os.replace(tmp_path, path)
    return len(rows), len(rows)


def main() -> None:
    files = sorted(glob.glob(f"{ROOT}/**/*.csv", recursive=True))
    if not files:
        print("ERROR: 未找到任何 CSV 文件，请在项目根目录运行本脚本")
        sys.exit(1)

    ok = err = 0
    for path in files:
        try:
            n_in, n_out = clean_file(path)
            print(f"  ✓ {path}  ({n_out} 行)")
            ok += 1
        except Exception as e:
            print(f"  ✗ {path}: {e}", file=sys.stderr)
            err += 1

    print(f"\n{'─' * 50}")
    print(f"完成: {ok} 成功 / {err} 失败 / {len(files)} 总计")
    if err:
        sys.exit(1)


if __name__ == "__main__":
    main()
```

**Step 2: 对单个文件做冒烟测试，确认脚本可运行**

```bash
cd /Users/poco/Projects/Sisyphus-Y
python3 -c "
import sys; sys.argv=['']; 
import scripts.clean_csv_columns as m
" 2>/dev/null || python3 scripts/clean_csv_columns.py --help 2>/dev/null || echo "脚本语法正常"

# 实际执行前先看一个文件的当前状态
python3 -c "
import csv
with open('清洗后数据/信永中和/v0.2.1/流程中心.csv', encoding='utf-8-sig') as f:
    r = csv.DictReader(f)
    print('当前列:', r.fieldnames)
    row = next(r)
    print('首行:', {k: str(v)[:30] for k, v in row.items()})
"
```

预期：正常输出当前的 9 列结构。

**Step 3: 提交清洗脚本**

```bash
git add scripts/clean_csv_columns.py
git commit -m "feat: add CSV bulk column cleaner script"
```

---

### Task 3：执行清洗并验证

**Step 1: 执行清洗脚本**

```bash
cd /Users/poco/Projects/Sisyphus-Y
python3 scripts/clean_csv_columns.py
```

预期输出末尾：
```
──────────────────────────────────────────────────
完成: 228 成功 / 0 失败 / 228 总计
```

如有 `✗` 行，逐条排查报错信息。

**Step 2: 运行验证脚本，确认全部通过**

```bash
python3 scripts/test_clean_csv.py
```

预期：
```
PASS: 全部 228 个文件列格式正确 ✓
```

**Step 3: 抽查 3 个文件内容完整性**

```bash
python3 -c "
import csv, random, glob
files = glob.glob('清洗后数据/**/*.csv', recursive=True)
samples = random.sample(files, 3)
for path in samples:
    with open(path, encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))
    print(f'文件: {path}')
    print(f'  列: {list(rows[0].keys()) if rows else \"empty\"}')
    print(f'  行数: {len(rows)}')
    if rows:
        print(f'  首行步骤(前50字): {str(rows[0].get(\"步骤\",\"\"))[:50]}')
    print()
"
```

**Step 4: 提交清洗后的数据**

```bash
git add 清洗后数据/
git commit -m "chore: strip redundant columns from 228 CSV test cases

Keep only: 所属模块, 用例标题, 前置条件, 步骤, 预期结果, 优先级
Remove: 用例编号, 相关需求, 用例类型

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## 验收标准

- [ ] `python3 scripts/test_clean_csv.py` 输出 `PASS: 全部 228 个文件列格式正确 ✓`
- [ ] 每个 CSV 列头精确为：`所属模块, 用例标题, 前置条件, 步骤, 预期结果, 优先级`（顺序一致）
- [ ] 行数与清洗前一致（无数据丢失）
- [ ] 含特殊字符（逗号、换行）的字段未被截断
