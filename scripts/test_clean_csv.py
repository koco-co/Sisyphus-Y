#!/usr/bin/env python3
"""验证清洗后 CSV 文件是否符合预期格式（6列）。

用法（在项目根目录执行）：
    python3 scripts/test_clean_csv.py
"""
import csv
import glob
import sys

KEEP_COLS = ["所属模块", "用例标题", "前置条件", "步骤", "预期结果", "优先级"]
ROOT = "清洗后数据"


def main() -> None:
    files = sorted(glob.glob(f"{ROOT}/**/*.csv", recursive=True))
    if not files:
        print("ERROR: 未找到任何 CSV 文件，请在项目根目录运行本脚本")
        sys.exit(1)

    errors: list[str] = []
    for path in files:
        with open(path, encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            headers = list(reader.fieldnames or [])
        if headers != KEEP_COLS:
            errors.append(
                f"  列不符: {path}\n"
                f"    期望: {KEEP_COLS}\n"
                f"    实际: {headers}"
            )

    if errors:
        print(f"FAIL: {len(errors)}/{len(files)} 个文件不符合要求\n")
        for msg in errors[:10]:
            print(msg)
        if len(errors) > 10:
            print(f"  ... 还有 {len(errors) - 10} 个文件")
        sys.exit(1)
    else:
        print(f"PASS: 全部 {len(files)} 个文件列格式正确 ✓")


if __name__ == "__main__":
    main()
