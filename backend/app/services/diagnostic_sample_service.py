from app.repositories.diagnostic_sample_repository import DiagnosticSampleRepository
from app.schemas.common import BatchWriteResponse
from app.schemas.diagnostic_sample import (
    DiagnosticSampleBatchCreate,
    DiagnosticSampleRead,
)
from app.services.datetime_service import to_utc_naive


class DiagnosticSampleService:
    def __init__(self, repository: DiagnosticSampleRepository):
        self._repository = repository

    async def create_batch(
        self,
        payload: DiagnosticSampleBatchCreate,
    ) -> BatchWriteResponse:
        rows = [
            {
                "event_id": str(item.event_id),
                "game_key": item.game_key,
                "transport": item.transport,
                "direction": item.direction,
                "frame_url": item.frame_url,
                "endpoint_url": item.endpoint_url,
                "payload_sample": item.payload_sample,
                "captured_at": to_utc_naive(item.captured_at),
            }
            for item in payload.samples
        ]

        accepted = await self._repository.insert_many_ignore_duplicates(rows)
        received = len(rows)
        return BatchWriteResponse(
            received=received,
            accepted=accepted,
            duplicates=received - accepted,
        )

    async def list(self, limit: int, offset: int) -> list[DiagnosticSampleRead]:
        rows = await self._repository.list(limit=limit, offset=offset)
        return [DiagnosticSampleRead.model_validate(row) for row in rows]
