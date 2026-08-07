from app.repositories.strategy_cycle_repository import StrategyCycleRepository
from app.schemas.common import BatchWriteResponse
from app.schemas.strategy_cycle import StrategyCycleBatchCreate
from app.services.datetime_service import to_utc_naive


class StrategyCycleService:
    def __init__(self, repository: StrategyCycleRepository):
        self._repository = repository

    async def create_batch(self, payload: StrategyCycleBatchCreate) -> BatchWriteResponse:
        rows = [
            {
                "event_key": item.event_key,
                "session_id": item.session_id,
                "strategy_id": item.strategy_id,
                "strategy_name": item.strategy_name,
                "outcome": item.outcome,
                "target": item.target,
                "signal_length": item.signal_length,
                "starting_deposit": item.starting_deposit,
                "round_id": item.round_id,
                "step": item.step,
                "pnl": item.pnl,
                "drawdown": item.drawdown,
                "bet": item.bet,
                "multiplier": item.multiplier,
                "occurred_at": to_utc_naive(item.occurred_at),
                "metadata_json": item.metadata,
            }
            for item in payload.cycles
        ]

        accepted = await self._repository.insert_many_ignore_duplicates(rows)
        received = len(rows)
        return BatchWriteResponse(
            received=received,
            accepted=accepted,
            duplicates=received - accepted,
        )
