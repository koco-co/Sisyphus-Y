"""Import cleaned CSV test cases (清洗后数据/) into the test_cases table.

Directory layout expected:
  清洗后数据/<product>/<version>/<req>.csv          (e.g. 信永中和)
  清洗后数据/<product>/<module>/<version>/<req>.csv  (e.g. 数栈平台)

CSV columns (6-column cleaned format):
  所属模块, 用例标题, 前置条件, 步骤, 预期结果, 优先级

Usage:
    cd backend
    uv run python ../scripts/import_csv_testcases.py
    uv run python ../scripts/import_csv_testcases.py --clear   # drop imported first
"""

import asyncio
import csv
import hashlib
import os
import re
import sys
import uuid
from pathlib import Path

# --clear flag: delete all source="imported" records before re-importing
CLEAR_BEFORE_IMPORT = "--clear" in sys.argv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

# Load .env from project root
env_file = PROJECT_ROOT / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

# Add backend to path
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.modules.testcases.models import TestCase
from app.modules.products.models import Product, Iteration, Requirement

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/sisyphus",
)

CSV_ROOT = PROJECT_ROOT / "清洗后数据"

PRIORITY_MAP = {
    "高": "P0",
    "中": "P1",
    "低": "P2",
    "最高": "P0",
    "": "P1",
}


def parse_steps(steps_text: str, expected_text: str) -> list[dict]:
    """Parse step/expected text into structured step objects."""
    if not steps_text or not steps_text.strip():
        return [{"step": 1, "action": "执行测试", "expected": expected_text.strip() or "验证通过"}]

    step_lines = re.split(r"\n(?=\d+[\.\、])", steps_text.strip())
    expected_lines = re.split(r"\n(?=\d+[\.\、])", expected_text.strip()) if expected_text else []

    result = []
    for i, step_line in enumerate(step_lines):
        action = re.sub(r"^\d+[\.\、]\s*", "", step_line).strip()
        if not action:
            continue
        expected = ""
        if i < len(expected_lines):
            expected = re.sub(r"^\d+[\.\、]\s*", "", expected_lines[i]).strip()
        elif i == 0 and expected_text:
            expected = expected_text.strip()
        result.append({"step": i + 1, "action": action, "expected": expected or "验证通过"})

    return result if result else [{"step": 1, "action": steps_text.strip(), "expected": expected_text.strip() or "验证通过"}]


def path_to_meta(filepath: Path) -> dict:
    """Derive product, iteration_name, req_name from the cleaned CSV path.

    Layouts:
      清洗后数据/<product>/<version>/<req>.csv          (3-level, e.g. 信永中和)
      清洗后数据/<product>/<module>/<version>/<req>.csv  (4-level, e.g. 数栈平台)
    """
    rel = filepath.relative_to(CSV_ROOT)
    parts = list(rel.parts)  # excludes CSV_ROOT itself
    req_name = filepath.stem  # filename without .csv

    if len(parts) == 3:
        # <product>/<version>/<req>.csv
        product_name = parts[0]
        iter_name = parts[1]
    else:
        # <product>/<module>/<version>/<req>.csv  (4+ levels)
        product_name = parts[0]
        module = parts[1]
        version = parts[2]
        iter_name = f"{module}-{version}"

    return {"product_name": product_name, "iter_name": iter_name, "req_name": req_name}


async def ensure_product_and_requirement(
    session: AsyncSession,
    product_name: str,
    iter_name: str,
    req_name: str,
) -> tuple[uuid.UUID, uuid.UUID]:
    """Get or create product → iteration → requirement. Returns (product_id, requirement_id)."""
    # Build a deterministic unique slug (Chinese chars → hash-based)
    slug_safe = re.sub(r"[^a-z0-9]", "", product_name.lower())[:20]
    slug_hash = hashlib.md5(product_name.encode()).hexdigest()[:8]
    slug = f"{slug_safe}-{slug_hash}" if slug_safe else f"p-{slug_hash}"

    # Product: look up by name first (handles re-runs and existing products)
    q = select(Product).where(Product.name == product_name, Product.deleted_at.is_(None))
    product = (await session.execute(q)).scalar_one_or_none()
    if not product:
        product = Product(name=product_name, slug=slug, description=f"从CSV导入: {product_name}")
        session.add(product)
        await session.flush()

    # Iteration (keyed by product_id + iter_name)
    q = select(Iteration).where(
        Iteration.product_id == product.id,
        Iteration.name == iter_name,
        Iteration.deleted_at.is_(None),
    )
    iteration = (await session.execute(q)).scalar_one_or_none()
    if not iteration:
        iteration = Iteration(product_id=product.id, name=iter_name, status="completed")
        session.add(iteration)
        await session.flush()

    # Requirement (keyed by iteration_id + title)
    req_id_str = f"IMP-{uuid.uuid5(uuid.NAMESPACE_DNS, f'{product_name}/{iter_name}/{req_name}').hex[:10].upper()}"
    q = select(Requirement).where(
        Requirement.iteration_id == iteration.id,
        Requirement.title == req_name,
        Requirement.deleted_at.is_(None),
    )
    req = (await session.execute(q)).scalar_one_or_none()
    if not req:
        req = Requirement(
            iteration_id=iteration.id,
            req_id=req_id_str,
            title=req_name,
            content_ast={"type": "doc", "content": [{"type": "paragraph", "text": f"从CSV导入: {req_name}"}]},
            status="approved",
        )
        session.add(req)
        await session.flush()

    return product.id, req.id


def parse_cleaned_row(row: dict) -> dict:
    """Parse a row from the 6-column cleaned CSV format."""
    return {
        "title": row.get("用例标题", "").strip(),
        "module_path": row.get("所属模块", "").strip() or None,
        "precondition": row.get("前置条件", "").strip() or None,
        "steps_text": row.get("步骤", ""),
        "expected_text": row.get("预期结果", ""),
        "priority": row.get("优先级", "").strip(),
    }


async def import_csv_file(session: AsyncSession, filepath: Path, stats: dict) -> None:
    """Import a single cleaned CSV file."""
    meta = path_to_meta(filepath)
    print(f"  📄 {filepath.relative_to(CSV_ROOT)}")

    try:
        with open(filepath, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            if not reader.fieldnames:
                print(f"    ⚠️  空文件，跳过")
                return

            req_cache: dict[tuple[str, str, str], tuple[uuid.UUID, uuid.UUID]] = {}
            count = 0

            for i, row in enumerate(reader):
                try:
                    parsed = parse_cleaned_row(row)
                    if not parsed["title"]:
                        continue

                    cache_key = (meta["product_name"], meta["iter_name"], meta["req_name"])
                    if cache_key not in req_cache:
                        req_cache[cache_key] = await ensure_product_and_requirement(
                            session,
                            meta["product_name"],
                            meta["iter_name"],
                            meta["req_name"],
                        )
                    _, req_id = req_cache[cache_key]

                    # Idempotency: skip if same title already exists under same requirement
                    q = select(TestCase).where(
                        TestCase.requirement_id == req_id,
                        TestCase.title == parsed["title"],
                        TestCase.deleted_at.is_(None),
                    )
                    if (await session.execute(q)).scalar_one_or_none():
                        stats["skipped"] += 1
                        continue

                    steps = parse_steps(parsed["steps_text"], parsed["expected_text"])
                    priority = PRIORITY_MAP.get(parsed["priority"], "P1")

                    tc = TestCase(
                        requirement_id=req_id,
                        case_id=f"IMP-{uuid.uuid4().hex[:8].upper()}",
                        title=parsed["title"],
                        module_path=parsed["module_path"],
                        precondition=parsed["precondition"],
                        priority=priority,
                        case_type="functional",
                        status="approved",
                        source="imported",
                        steps=[{"step": s["step"], "action": s["action"], "expected": s["expected"]} for s in steps],
                        tags=[],
                        clean_status="cleaned",
                        original_raw=dict(row),
                    )
                    session.add(tc)
                    count += 1
                    stats["imported"] += 1

                    if count % 50 == 0:
                        await session.flush()

                except Exception as e:
                    stats["errors"] += 1
                    if stats["errors"] <= 5:
                        print(f"    ❌ Row {i}: {e}")

            await session.flush()
            if count:
                print(f"    ✅ {count} 条")

    except Exception as e:
        print(f"    ❌ 文件读取失败: {e}")
        stats["errors"] += 1


async def clear_imported(session: AsyncSession) -> int:
    """Soft-delete all source='imported' test cases."""
    from datetime import datetime, timezone
    result = await session.execute(
        text("UPDATE test_cases SET deleted_at = NOW() WHERE source = 'imported' AND deleted_at IS NULL")
    )
    return result.rowcount


async def main():
    print("🚀 开始从 清洗后数据/ 导入测试用例...\n")

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    stats = {"imported": 0, "skipped": 0, "errors": 0, "files": 0}

    csv_files = sorted(CSV_ROOT.rglob("*.csv"))
    print(f"📂 发现 {len(csv_files)} 个 CSV 文件\n")

    # --clear: run in its own transaction before file imports
    if CLEAR_BEFORE_IMPORT:
        async with async_session() as session:
            async with session.begin():
                n = await clear_imported(session)
        print(f"🗑️  已清除 {n} 条历史导入用例\n")

    # One transaction per file to prevent cascade failures
    for filepath in csv_files:
        stats["files"] += 1
        try:
            async with async_session() as session:
                async with session.begin():
                    await import_csv_file(session, filepath, stats)
        except Exception as e:
            print(f"    ❌ 文件事务失败: {filepath.name}: {e}")
            stats["errors"] += 1

    await engine.dispose()

    print(f"\n{'='*50}")
    print(f"📊 导入结果:")
    print(f"  文件数:     {stats['files']}")
    print(f"  导入:       {stats['imported']} 条用例")
    print(f"  跳过(重复): {stats['skipped']} 条")
    print(f"  错误:       {stats['errors']} 条")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main())
