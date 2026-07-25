from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game_result import GameResult


class GameResultRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def insert_many_ignore_duplicates(self, rows: list[dict]) -> int:
        if not rows:
            return 0

        statement = insert(GameResult).values(rows).prefix_with("IGNORE")
        result = await self._session.execute(statement)
        await self._session.commit()
        return max(result.rowcount or 0, 0)

    async def list(self, limit: int, offset: int) -> list[GameResult]:
        statement = (
            select(GameResult)
            .order_by(GameResult.captured_at.desc(), GameResult.id.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.scalars(statement)
        return list(result.all())

    async def list_for_analysis(
        self,
    ) -> list[tuple[int, Decimal, datetime]]:
        occurred_at = func.coalesce(
            GameResult.happened_at,
            GameResult.captured_at,
        ).label("occurred_at")
        statement = (
            select(GameResult.id, GameResult.multiplier, occurred_at)
            .order_by(occurred_at.asc(), GameResult.id.asc())
        )
        result = await self._session.execute(statement)
        return [
            (row.id, row.multiplier, row.occurred_at)
            for row in result.all()
        ]
