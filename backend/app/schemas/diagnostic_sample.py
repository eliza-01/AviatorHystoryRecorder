from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DiagnosticSampleCreate(BaseModel):
    event_id: UUID
    game_key: str = Field(default="aviator_pm_by", min_length=1, max_length=64)
    transport: Literal["websocket", "fetch", "xhr", "unknown"]
    direction: Literal["in", "out", "response", "unknown"]
    frame_url: str | None = Field(default=None, max_length=4096)
    endpoint_url: str | None = Field(default=None, max_length=4096)
    payload_sample: str = Field(min_length=1, max_length=8000)
    captured_at: datetime


class DiagnosticSampleBatchCreate(BaseModel):
    samples: list[DiagnosticSampleCreate] = Field(min_length=1, max_length=200)


class DiagnosticSampleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    game_key: str
    transport: str
    direction: str
    frame_url: str | None
    endpoint_url: str | None
    payload_sample: str
    captured_at: datetime
    created_at: datetime
