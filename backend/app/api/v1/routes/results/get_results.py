from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.repositories.game_result_repository import GameResultRepository
from app.schemas.game_result import GameResultRead
from app.services.game_result_service import GameResultService

router = APIRouter(prefix="/results", tags=["results"])


@router.get(
    "",
    response_model=list[GameResultRead],
)
async def get_results(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> list[GameResultRead]:
    repository = GameResultRepository(session)
    return await GameResultService(repository).list(limit=limit, offset=offset)
