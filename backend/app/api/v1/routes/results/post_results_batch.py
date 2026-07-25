from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.repositories.game_result_repository import GameResultRepository
from app.schemas.common import BatchWriteResponse
from app.schemas.game_result import GameResultBatchCreate
from app.services.game_result_service import GameResultService

router = APIRouter(prefix="/results", tags=["results"])


@router.post(
    "/batch",
    response_model=BatchWriteResponse,
)
async def post_results_batch(
    payload: GameResultBatchCreate,
    session: AsyncSession = Depends(get_db_session),
) -> BatchWriteResponse:
    repository = GameResultRepository(session)
    return await GameResultService(repository).create_batch(payload)
