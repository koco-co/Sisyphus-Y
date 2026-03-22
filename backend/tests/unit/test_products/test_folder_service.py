"""RequirementFolderService 单元测试"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.modules.products.models import Iteration, Product, RequirementFolder
from app.modules.products.service import RequirementFolderService


@pytest.mark.asyncio
async def test_delete_system_folder_raises_error(db_session):
    """系统文件夹不可删除"""
    # 创建测试数据
    product = Product(name="测试产品", slug="test-product-folder-sys")
    db_session.add(product)
    await db_session.commit()

    iteration = Iteration(product_id=product.id, name="v1.0")
    db_session.add(iteration)
    await db_session.commit()

    folder = RequirementFolder(
        iteration_id=iteration.id,
        name="未分类",
        is_system=True,
        level=1,
    )
    db_session.add(folder)
    await db_session.commit()

    service = RequirementFolderService(db_session)

    # 测试应该在查询 requirements 之前就抛出异常
    with pytest.raises(HTTPException) as exc:
        await service.delete_folder(folder.id)

    assert exc.value.status_code == 400
    assert "系统文件夹" in exc.value.detail


@pytest.mark.asyncio
async def test_delete_non_system_folder_succeeds(db_session):
    """非系统文件夹可以正常删除"""
    # 创建测试数据
    product = Product(name="测试产品2", slug="test-product-folder-nonsys")
    db_session.add(product)
    await db_session.commit()

    iteration = Iteration(product_id=product.id, name="v2.0")
    db_session.add(iteration)
    await db_session.commit()

    folder = RequirementFolder(
        iteration_id=iteration.id,
        name="自定义文件夹",
        is_system=False,
        level=1,
    )
    db_session.add(folder)
    await db_session.commit()

    service = RequirementFolderService(db_session)

    # Mock Requirement 查询以避免 JSONB 问题
    # 创建一个 mock result 对象
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars

    # 使用 patch 替换 session.execute
    with patch.object(db_session, "execute", new=AsyncMock(return_value=mock_result)):
        # 应该不抛出异常
        await service.delete_folder(folder.id)

    # 验证文件夹已被软删除
    await db_session.refresh(folder)
    assert folder.deleted_at is not None
