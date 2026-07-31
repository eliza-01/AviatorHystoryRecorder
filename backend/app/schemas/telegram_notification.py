from enum import StrEnum

from pydantic import BaseModel, Field, field_validator, model_validator


class TelegramNotificationReason(StrEnum):
    SERIES = "series"
    PROFIT = "profit"
    STOP = "stop"


class TelegramStrategyNotificationRequest(BaseModel):
    chat_id: str = Field(min_length=1, max_length=32)
    reason: TelegramNotificationReason
    strategy_name: str = Field(default="10+ - x3.48", min_length=1, max_length=80)
    target: float = Field(default=3.48, gt=1, le=1_000_000)
    signal_length: int = Field(default=10, ge=1, le=100)
    series_length: int | None = Field(default=None, ge=1, le=100)
    current_streak: int | None = Field(default=None, ge=1, le=100_000)
    step: int | None = Field(default=None, ge=1, le=100_000)
    drawdown: float | None = Field(default=None, ge=0, le=1_000_000_000)
    profit: float | None = Field(default=None, ge=0, le=1_000_000_000)
    loss: float | None = Field(default=None, ge=0, le=1_000_000_000)
    multiplier: float | None = Field(default=None, ge=0, le=1_000_000)
    bet: float | None = Field(default=None, ge=0, le=1_000_000_000)

    @field_validator("chat_id")
    @classmethod
    def validate_chat_id(cls, value: str) -> str:
        normalized = value.strip()
        numeric = normalized[1:] if normalized.startswith("-") else normalized
        if not numeric.isdigit() or len(numeric) > 20:
            raise ValueError("Telegram ID должен быть целым числом")
        return normalized

    @model_validator(mode="after")
    def validate_reason_fields(self) -> "TelegramStrategyNotificationRequest":
        if self.reason is TelegramNotificationReason.SERIES:
            if self.series_length is None or self.current_streak is None:
                raise ValueError("Для уведомления о серии нужны series_length и current_streak")
        elif self.reason is TelegramNotificationReason.PROFIT:
            if None in (self.step, self.drawdown, self.profit, self.multiplier, self.bet):
                raise ValueError("Для уведомления о прибыли не хватает данных цикла")
        elif self.reason is TelegramNotificationReason.STOP:
            if None in (self.step, self.drawdown, self.loss):
                raise ValueError("Для уведомления о стопе не хватает данных цикла")
        return self


class TelegramStrategyNotificationResponse(BaseModel):
    ok: bool = True
