from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.repositories.diagnostic_sample_repository import DiagnosticSampleRepository
from app.schemas.diagnostic_sample import DiagnosticSampleRead
from app.services.diagnostic_sample_service import DiagnosticSampleService

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


@router.get(
    "/samples",
    response_model=list[DiagnosticSampleRead],
)
async def get_samples(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> list[DiagnosticSampleRead]:
    repository = DiagnosticSampleRepository(session)
    return await DiagnosticSampleService(repository).list(limit=limit, offset=offset)
