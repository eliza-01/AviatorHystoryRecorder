from sqlalchemy.dialects.mysql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.strategy_cycle import StrategyCycle


class StrategyCycleRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def insert_many_ignore_duplicates(self, rows: list[dict]) -> int:
        if not rows:
            return 0

        statement = insert(StrategyCycle).values(rows).prefix_with("IGNORE")
        result = await self._session.execute(statement)
        await self._session.commit()
        return max(result.rowcount or 0, 0)
