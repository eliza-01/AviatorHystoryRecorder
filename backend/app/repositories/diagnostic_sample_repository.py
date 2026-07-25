from sqlalchemy import select
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.diagnostic_sample import DiagnosticSample


class DiagnosticSampleRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def insert_many_ignore_duplicates(self, rows: list[dict]) -> int:
        if not rows:
            return 0

        statement = insert(DiagnosticSample).values(rows).prefix_with("IGNORE")
        result = await self._session.execute(statement)
        await self._session.commit()
        return max(result.rowcount or 0, 0)

    async def list(self, limit: int, offset: int) -> list[DiagnosticSample]:
        statement = (
            select(DiagnosticSample)
            .order_by(DiagnosticSample.captured_at.desc(), DiagnosticSample.id.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.scalars(statement)
        return list(result.all())
