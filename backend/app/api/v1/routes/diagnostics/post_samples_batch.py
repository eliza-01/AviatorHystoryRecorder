from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.repositories.diagnostic_sample_repository import DiagnosticSampleRepository
from app.schemas.common import BatchWriteResponse
from app.schemas.diagnostic_sample import DiagnosticSampleBatchCreate
from app.services.diagnostic_sample_service import DiagnosticSampleService

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


@router.post(
    "/samples/batch",
    response_model=BatchWriteResponse,
)
async def post_samples_batch(
    payload: DiagnosticSampleBatchCreate,
    session: AsyncSession = Depends(get_db_session),
) -> BatchWriteResponse:
    repository = DiagnosticSampleRepository(session)
    return await DiagnosticSampleService(repository).create_batch(payload)
