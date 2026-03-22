"""RequirementFolderService 单元测试"""

import uuid
from datetime import UTC, datetime

import pytest
from fastapi import HTTPException

from app.modules.products.models import Iteration, Product, RequirementFolder
from app.modules.products.service import RequirementFolderService


@pytest.mark.asyncio
async def test_delete_system_folder_raises_error(db_session):
    """系统文件夹不可删除"""
    # 创建测试数据 - 使用唯一 slug
    unique_slug = f"test-sys-folder-{uuid.uuid4().hex[:8]}"
    product = Product(name="测试产品", slug=unique_slug)
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
async def test_delete_folder_not_found(db_session):
    """删除不存在的文件夹应抛出 404"""
    service = RequirementFolderService(db_session)

    with pytest.raises(HTTPException) as exc:
        await service.delete_folder(uuid.uuid4())

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_already_deleted_folder(db_session):
    """删除已删除的文件夹应抛出 404"""
    unique_slug = f"test-del-folder-{uuid.uuid4().hex[:8]}"
    product = Product(name="测试产品3", slug=unique_slug)
    db_session.add(product)
    await db_session.commit()

    iteration = Iteration(product_id=product.id, name="v3.0")
    db_session.add(iteration)
    await db_session.commit()

    folder = RequirementFolder(
        iteration_id=iteration.id,
        name="已删除文件夹",
        is_system=False,
        level=1,
        deleted_at=datetime.now(UTC),
    )
    db_session.add(folder)
    await db_session.commit()

    service = RequirementFolderService(db_session)

    with pytest.raises(HTTPException) as exc:
        await service.delete_folder(folder.id)

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_get_folder_tree(db_session):
    """测试获取文件夹树"""
    from unittest.mock import AsyncMock, patch

    unique_slug = f"test-tree-folder-{uuid.uuid4().hex[:8]}"
    product = Product(name="测试产品树", slug=unique_slug)
    db_session.add(product)
    await db_session.commit()

    iteration = Iteration(product_id=product.id, name="v1.0")
    db_session.add(iteration)
    await db_session.commit()

    # 创建文件夹层级
    root_folder = RequirementFolder(
        iteration_id=iteration.id,
        name="根文件夹",
        is_system=False,
        level=1,
    )
    db_session.add(root_folder)
    await db_session.commit()

    child_folder = RequirementFolder(
        iteration_id=iteration.id,
        parent_id=root_folder.id,
        name="子文件夹",
        is_system=False,
        level=2,
    )
    db_session.add(child_folder)
    await db_session.commit()

    service = RequirementFolderService(db_session)

    # Mock get_requirement_count 以避免 requirements 表不存在的问题
    with patch.object(service, "get_requirement_count", new_callable=AsyncMock, return_value=0):
        tree = await service.get_tree(iteration.id)

    assert len(tree) == 1
    assert tree[0]["name"] == "根文件夹"
    assert len(tree[0]["children"]) == 1
    assert tree[0]["children"][0]["name"] == "子文件夹"


@pytest.mark.asyncio
async def test_create_folder(db_session):
    """测试创建文件夹"""
    from app.modules.products.schemas import ReqFolderCreate

    unique_slug = f"test-create-folder-{uuid.uuid4().hex[:8]}"
    product = Product(name="测试产品创建", slug=unique_slug)
    db_session.add(product)
    await db_session.commit()

    iteration = Iteration(product_id=product.id, name="v1.0")
    db_session.add(iteration)
    await db_session.commit()

    service = RequirementFolderService(db_session)
    data = ReqFolderCreate(
        iteration_id=iteration.id,
        name="新文件夹",
        parent_id=None,
    )
    folder = await service.create_folder(data)

    assert folder.name == "新文件夹"
    assert folder.level == 1
    assert folder.parent_id is None


@pytest.mark.asyncio
async def test_create_subfolder(db_session):
    """测试创建子文件夹"""
    from app.modules.products.schemas import ReqFolderCreate

    unique_slug = f"test-subfolder-{uuid.uuid4().hex[:8]}"
    product = Product(name="测试产品子文件夹", slug=unique_slug)
    db_session.add(product)
    await db_session.commit()

    iteration = Iteration(product_id=product.id, name="v1.0")
    db_session.add(iteration)
    await db_session.commit()

    # 先创建父文件夹
    parent_folder = RequirementFolder(
        iteration_id=iteration.id,
        name="父文件夹",
        is_system=False,
        level=1,
    )
    db_session.add(parent_folder)
    await db_session.commit()

    service = RequirementFolderService(db_session)
    data = ReqFolderCreate(
        iteration_id=iteration.id,
        name="子文件夹",
        parent_id=parent_folder.id,
    )
    folder = await service.create_folder(data)

    assert folder.name == "子文件夹"
    assert folder.level == 2  # level 仍然是 1，因为 get_tree 会处理嵌套
    assert folder.parent_id == parent_folder.id


@pytest.mark.asyncio
async def test_update_folder(db_session):
    """测试更新文件夹"""
    from app.modules.products.schemas import ReqFolderUpdate

    unique_slug = f"test-update-folder-{uuid.uuid4().hex[:8]}"
    product = Product(name="测试产品更新", slug=unique_slug)
    db_session.add(product)
    await db_session.commit()

    iteration = Iteration(product_id=product.id, name="v1.0")
    db_session.add(iteration)
    await db_session.commit()

    folder = RequirementFolder(
        iteration_id=iteration.id,
        name="原名称",
        is_system=False,
        level=1,
    )
    db_session.add(folder)
    await db_session.commit()

    service = RequirementFolderService(db_session)
    data = ReqFolderUpdate(name="新名称")
    updated = await service.update_folder(folder.id, data)

    assert updated.name == "新名称"
