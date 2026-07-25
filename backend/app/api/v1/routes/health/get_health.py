from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.services.health_service import HealthService

router = APIRouter(tags=["health"])


@router.get("/health")
async def get_health(
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    return await HealthService(session).check()
