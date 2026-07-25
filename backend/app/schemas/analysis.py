from datetime import datetime

from pydantic import BaseModel, Field


class AnalysisPoint(BaseModel):
    index: int = Field(ge=1)
    multiplier: float = Field(ge=1)
    delta: float
    balance: float
    occurred_at: datetime


class AnalysisStats(BaseModel):
    x: float = Field(ge=1)
    total: int = Field(ge=0)
    positive: int = Field(ge=0)
    negative: int = Field(ge=0)
    positive_rate: float = Field(ge=0, le=100)
    negative_rate: float = Field(ge=0, le=100)
    weighted_positive: float
    requested_result: float
    chart_result: float
    points_returned: int = Field(ge=0)


class AnalysisResponse(BaseModel):
    stats: AnalysisStats
    points: list[AnalysisPoint]
