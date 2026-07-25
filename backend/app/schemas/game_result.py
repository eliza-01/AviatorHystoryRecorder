from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GameResultCreate(BaseModel):
    event_id: UUID
    game_key: str = Field(default="aviator_pm_by", min_length=1, max_length=64)
    round_id: str | None = Field(default=None, max_length=128)
    multiplier: Decimal = Field(gt=0, le=9999999999)
    happened_at: datetime | None = None
    captured_at: datetime
    source: Literal["websocket", "fetch", "xhr", "dom", "unknown"]
    page_url: str | None = Field(default=None, max_length=4096)
    frame_url: str | None = Field(default=None, max_length=4096)
    confidence: Decimal = Field(default=Decimal("0.5"), ge=0, le=1)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("multiplier")
    @classmethod
    def normalize_multiplier(cls, value: Decimal) -> Decimal:
        return value.quantize(Decimal("0.01"))


class GameResultBatchCreate(BaseModel):
    results: list[GameResultCreate] = Field(min_length=1, max_length=500)


class GameResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    game_key: str
    round_id: str | None
    multiplier: Decimal
    happened_at: datetime | None
    captured_at: datetime
    source: str
    page_url: str | None
    frame_url: str | None
    confidence: Decimal
    metadata_json: dict[str, Any]
    created_at: datetime
