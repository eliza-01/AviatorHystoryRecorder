from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.repositories.game_result_repository import GameResultRepository
from app.schemas.analysis import AnalysisResponse
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("", response_model=AnalysisResponse)
async def get_analysis(
    x: Decimal = Query(default=Decimal("2.00"), ge=1, le=1_000_000),
    session: AsyncSession = Depends(get_db_session),
) -> AnalysisResponse:
    repository = GameResultRepository(session)
    return await AnalysisService(repository).calculate(threshold=x)
