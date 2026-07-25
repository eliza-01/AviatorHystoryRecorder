from hashlib import sha256

from app.repositories.game_result_repository import GameResultRepository
from app.schemas.common import BatchWriteResponse
from app.schemas.game_result import GameResultBatchCreate, GameResultRead
from app.services.datetime_service import to_utc_naive


class GameResultService:
    def __init__(self, repository: GameResultRepository):
        self._repository = repository

    async def create_batch(self, payload: GameResultBatchCreate) -> BatchWriteResponse:
        rows = []
        for item in payload.results:
            event_id = str(item.event_id)
            dedupe_basis = (
                f"round:{item.game_key}:{item.round_id}"
                if item.round_id
                else f"event:{event_id}"
            )
            rows.append(
                {
                    "event_id": event_id,
                    "dedupe_key": sha256(dedupe_basis.encode("utf-8")).hexdigest(),
                    "game_key": item.game_key,
                    "round_id": item.round_id,
                    "multiplier": item.multiplier,
                    "happened_at": to_utc_naive(item.happened_at),
                    "captured_at": to_utc_naive(item.captured_at),
                    "source": item.source,
                    "page_url": item.page_url,
                    "frame_url": item.frame_url,
                    "confidence": item.confidence,
                    "metadata_json": item.metadata,
                }
            )

        accepted = await self._repository.insert_many_ignore_duplicates(rows)
        received = len(rows)
        return BatchWriteResponse(
            received=received,
            accepted=accepted,
            duplicates=received - accepted,
        )

    async def list(self, limit: int, offset: int) -> list[GameResultRead]:
        rows = await self._repository.list(limit=limit, offset=offset)
        return [GameResultRead.model_validate(row) for row in rows]
