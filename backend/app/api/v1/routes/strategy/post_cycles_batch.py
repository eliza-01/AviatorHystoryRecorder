from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.repositories.strategy_cycle_repository import StrategyCycleRepository
from app.schemas.common import BatchWriteResponse
from app.schemas.strategy_cycle import StrategyCycleBatchCreate
from app.services.strategy_cycle_service import StrategyCycleService

router = APIRouter(prefix="/strategy", tags=["strategy"])


@router.post(
    "/cycles/batch",
    response_model=BatchWriteResponse,
)
async def post_strategy_cycles_batch(
    payload: StrategyCycleBatchCreate,
    session: AsyncSession = Depends(get_db_session),
) -> BatchWriteResponse:
    repository = StrategyCycleRepository(session)
    return await StrategyCycleService(repository).create_batch(payload)
