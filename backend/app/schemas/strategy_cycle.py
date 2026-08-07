from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field


class StrategyCycleCreate(BaseModel):
    event_key: str = Field(min_length=64, max_length=64)
    session_id: str = Field(min_length=1, max_length=120)
    strategy_id: str = Field(min_length=1, max_length=80)
    strategy_name: str = Field(min_length=1, max_length=80)
    outcome: Literal["profit", "stop"]
    target: Decimal = Field(gt=1, le=1_000_000)
    signal_length: int = Field(ge=1, le=100)
    starting_deposit: Decimal = Field(ge=0, le=1_000_000_000)
    round_id: str | None = Field(default=None, max_length=160)
    step: int = Field(ge=1, le=100_000)
    pnl: Decimal = Field(ge=-1_000_000_000, le=1_000_000_000)
    drawdown: Decimal = Field(default=0, ge=0, le=1_000_000_000)
    bet: Decimal | None = Field(default=None, ge=0, le=1_000_000_000)
    multiplier: Decimal | None = Field(default=None, ge=0, le=1_000_000)
    occurred_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class StrategyCycleBatchCreate(BaseModel):
    cycles: list[StrategyCycleCreate] = Field(min_length=1, max_length=200)
