from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.products.models import (
    Iteration,
    Product,
    Requirement,
    RequirementFolder,
    RequirementVersion,
)
from app.modules.products.schemas import (
    IterationCreate,
    IterationUpdate,
    ProductCreate,
    ProductUpdate,
    ReqFolderCreate,
    ReqFolderUpdate,
    RequirementCreate,
    RequirementUpdate,
)


class ProductService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_product(self, data: ProductCreate) -> Product:
        product = Product(**data.model_dump())
        self.session.add(product)
        await self.session.commit()
        await self.session.refresh(product)
        return product

    async def list_products(self) -> list[Product]:
        result = await self.session.execute(select(Product).where(Product.deleted_at.is_(None)))
        return list(result.scalars().all())

    async def get_product(self, product_id: UUID) -> Product | None:
        return await self.session.get(Product, product_id)

    async def update_product(self, product_id: UUID, data: ProductUpdate) -> Product:
        product = await self.session.get(Product, product_id)
        if not product or product.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(product, key, value)
        await self.session.commit()
        await self.session.refresh(product)
        return product

    async def soft_delete_product(self, product_id: UUID) -> None:
        product = await self.session.get(Product, product_id)
        if not product or product.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        product.deleted_at = datetime.now(UTC)
        await self.session.commit()


class IterationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_iteration(self, data: IterationCreate) -> Iteration:
        iteration = Iteration(**data.model_dump())
        self.session.add(iteration)
        await self.session.flush()  # 获取 iteration.id

        # 自动创建「未分类」系统文件夹
        uncategorized = RequirementFolder(
            iteration_id=iteration.id,
            parent_id=None,
            name="未分类",
            sort_order=0,
            level=1,
            is_system=True,
        )
        self.session.add(uncategorized)

        await self.session.commit()
        await self.session.refresh(iteration)
        return iteration

    async def list_by_product(self, product_id: UUID) -> list[Iteration]:
        result = await self.session.execute(
            select(Iteration).where(
                Iteration.product_id == product_id,
                Iteration.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def update_iteration(self, iteration_id: UUID, data: IterationUpdate) -> Iteration:
        iteration = await self.session.get(Iteration, iteration_id)
        if not iteration or iteration.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Iteration not found")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(iteration, key, value)
        await self.session.commit()
        await self.session.refresh(iteration)
        return iteration

    async def soft_delete_iteration(self, iteration_id: UUID) -> None:
        iteration = await self.session.get(Iteration, iteration_id)
        if not iteration or iteration.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Iteration not found")
        iteration.deleted_at = datetime.now(UTC)
        await self.session.commit()


class RequirementService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_requirement(self, requirement_id: UUID) -> Requirement:
        requirement = await self.session.get(Requirement, requirement_id)
        if not requirement or requirement.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
        return requirement

    async def create_requirement(self, data: RequirementCreate) -> Requirement:
        requirement = Requirement(**data.model_dump(exclude_none=True))
        self.session.add(requirement)
        await self.session.commit()
        await self.session.refresh(requirement)
        return requirement

    async def list_by_iteration(self, iteration_id: UUID) -> list[Requirement]:
        result = await self.session.execute(
            select(Requirement).where(
                Requirement.iteration_id == iteration_id,
                Requirement.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def list_by_product(self, product_id: UUID) -> list[Requirement]:
        result = await self.session.execute(
            select(Requirement)
            .join(Iteration, Requirement.iteration_id == Iteration.id)
            .where(
                Iteration.product_id == product_id,
                Requirement.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[Requirement]:
        result = await self.session.execute(select(Requirement).where(Requirement.deleted_at.is_(None)))
        return list(result.scalars().all())

    async def update_requirement(self, requirement_id: UUID, data: RequirementUpdate) -> Requirement:
        requirement = await self.session.get(Requirement, requirement_id)
        if not requirement or requirement.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")

        updates = data.model_dump(exclude_unset=True)
        if not updates:
            return requirement

        # Auto-version: snapshot current state before applying changes
        version_snapshot = RequirementVersion(
            requirement_id=requirement.id,
            version=requirement.version,
            content_ast=requirement.content_ast or {},
            change_summary=f"Version {requirement.version} snapshot before update",
        )
        self.session.add(version_snapshot)

        for key, value in updates.items():
            setattr(requirement, key, value)
        requirement.version += 1

        await self.session.commit()
        await self.session.refresh(requirement)
        return requirement

    async def append_parsed_content(self, requirement_id: UUID, filename: str, parsed_ast: dict) -> Requirement:
        """Append parsed content (e.g. from a pasted image) to an existing requirement."""
        requirement = await self.session.get(Requirement, requirement_id)
        if not requirement or requirement.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")

        # Snapshot current version before modifying
        version_snapshot = RequirementVersion(
            requirement_id=requirement.id,
            version=requirement.version,
            content_ast=requirement.content_ast or {},
            change_summary=f"Before appending parsed content from {filename}",
        )
        self.session.add(version_snapshot)

        existing_ast = dict(requirement.content_ast) if requirement.content_ast else {}
        attachments: list[dict] = existing_ast.get("attachments", [])
        attachments.append({"filename": filename, "parsed": parsed_ast})
        existing_ast["attachments"] = attachments

        # Merge parsed sections into existing sections
        existing_sections: list[dict] = existing_ast.get("sections", [])
        new_sections: list[dict] = parsed_ast.get("sections", [])
        existing_sections.extend(new_sections)
        existing_ast["sections"] = existing_sections

        requirement.content_ast = existing_ast
        requirement.version += 1

        await self.session.commit()
        await self.session.refresh(requirement)
        return requirement

    async def publish_version(self, req_id: UUID, version_note: str | None) -> tuple[int, int]:
        """发布新版本：快照当前内容，版本号+1，异步触发 Diff 计算。"""
        requirement = await self.session.get(Requirement, req_id)
        if not requirement or requirement.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")

        old_version = requirement.version
        version_snapshot = RequirementVersion(
            requirement_id=requirement.id,
            version=old_version,
            content_ast=requirement.content_ast or {},
            change_summary=version_note or f"Version {old_version} snapshot",
        )
        self.session.add(version_snapshot)
        requirement.version = old_version + 1
        await self.session.commit()
        return (old_version, old_version + 1)

    async def soft_delete_requirement(self, requirement_id: UUID) -> None:
        requirement = await self.session.get(Requirement, requirement_id)
        if not requirement or requirement.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found")
        requirement.deleted_at = datetime.now(UTC)
        await self.session.commit()


class RequirementFolderService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_requirement_count(self, folder_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count())
            .select_from(Requirement)
            .where(
                Requirement.folder_id == folder_id,
                Requirement.deleted_at.is_(None),
            )
        )
        return result.scalar_one()

    async def list_by_iteration(self, iteration_id: UUID) -> list[RequirementFolder]:
        result = await self.session.execute(
            select(RequirementFolder)
            .where(
                RequirementFolder.iteration_id == iteration_id,
                RequirementFolder.deleted_at.is_(None),
            )
            .order_by(RequirementFolder.sort_order, RequirementFolder.name)
        )
        return list(result.scalars().all())

    async def get_tree(self, iteration_id: UUID) -> list[dict]:
        """Return folders as a nested tree with requirement_count."""
        folders = await self.list_by_iteration(iteration_id)

        folder_map: dict[str, dict] = {}
        for f in folders:
            count = await self.get_requirement_count(f.id)
            folder_map[str(f.id)] = {
                "id": str(f.id),
                "name": f.name,
                "parent_id": str(f.parent_id) if f.parent_id else None,
                "sort_order": f.sort_order,
                "level": f.level,
                "is_system": f.is_system,
                "requirement_count": count,
                "children": [],
            }

        roots: list[dict] = []
        for node in folder_map.values():
            if node["parent_id"] and node["parent_id"] in folder_map:
                folder_map[node["parent_id"]]["children"].append(node)
            else:
                roots.append(node)

        return roots

    async def create_folder(self, data: ReqFolderCreate) -> RequirementFolder:
        level = 1
        if data.parent_id:
            parent = await self.session.get(RequirementFolder, data.parent_id)
            if parent and parent.deleted_at is None:
                level = parent.level + 1

        folder = RequirementFolder(
            iteration_id=data.iteration_id,
            parent_id=data.parent_id,
            name=data.name,
            sort_order=data.sort_order,
            level=level,
        )
        self.session.add(folder)
        await self.session.commit()
        await self.session.refresh(folder)
        return folder

    async def update_folder(self, folder_id: UUID, data: ReqFolderUpdate) -> RequirementFolder:
        folder = await self.session.get(RequirementFolder, folder_id)
        if not folder or folder.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(folder, key, value)
        await self.session.commit()
        await self.session.refresh(folder)
        return folder

    async def delete_folder(self, folder_id: UUID) -> None:
        """软删除文件夹，将文件夹内需求的 folder_id 重置为 None（移到迭代根目录）。"""
        folder = await self.session.get(RequirementFolder, folder_id)
        if not folder or folder.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

        # 系统文件夹不可删除
        if folder.is_system:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="系统文件夹不可删除")

        # 将该文件夹内的需求移至根层（folder_id = None）
        reqs = await self.session.execute(
            select(Requirement).where(
                Requirement.folder_id == folder_id,
                Requirement.deleted_at.is_(None),
            )
        )
        for req in reqs.scalars().all():
            req.folder_id = None

        folder.deleted_at = datetime.now(UTC)
        await self.session.commit()
