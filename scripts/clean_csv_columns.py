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
ENCODINGS = ["utf-8-sig", "utf-8", "gbk"]


def detect_encoding(path: str) -> str:
    for enc in ENCODINGS:
        try:
            with open(path, encoding=enc, newline="") as f:
                list(csv.DictReader(f))
            return enc
        except (UnicodeDecodeError, Exception):
            continue
    raise ValueError(f"无法识别文件编码: {path}")


def clean_file(path: str) -> int:
    """清洗单个文件，返回写入行数。原子写入防止中途崩溃损坏原文件。"""
    enc = detect_encoding(path)
    rows: list[dict[str, str]] = []

    with open(path, encoding=enc, newline="") as f:
        reader = csv.DictReader(f)
        headers = list(reader.fieldnames or [])
        missing = [col for col in KEEP_COLS if col not in headers]
        if missing:
            raise ValueError(f"缺少必要列 {missing}，当前列: {headers}")
        for row in reader:
            rows.append({col: row.get(col, "") for col in KEEP_COLS})

    dir_ = os.path.dirname(os.path.abspath(path))
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8-sig",
        newline="",
        dir=dir_,
        delete=False,
        suffix=".tmp",
    ) as tmp:
        tmp_path = tmp.name
        writer = csv.DictWriter(tmp, fieldnames=KEEP_COLS)
        writer.writeheader()
        writer.writerows(rows)

    os.replace(tmp_path, path)
    return len(rows)


def main() -> None:
    files = sorted(glob.glob(f"{ROOT}/**/*.csv", recursive=True))
    if not files:
        print("ERROR: 未找到任何 CSV 文件，请在项目根目录运行本脚本")
        sys.exit(1)

    ok = err = 0
    for path in files:
        try:
            n = clean_file(path)
            print(f"  ✓  {path}  ({n} 行)")
            ok += 1
        except Exception as e:
            print(f"  ✗  {path}: {e}", file=sys.stderr)
            err += 1

    print(f"\n{'─' * 60}")
    print(f"完成: {ok} 成功 / {err} 失败 / {len(files)} 总计")
    if err:
        sys.exit(1)


if __name__ == "__main__":
    main()
