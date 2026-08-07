from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Index, JSON, Numeric, String
from sqlalchemy.dialects.mysql import DATETIME
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StrategyCycle(Base):
    __tablename__ = "strategy_cycles"
    __table_args__ = (
        Index("idx_strategy_cycles_strategy_time", "strategy_id", "occurred_at"),
        Index("idx_strategy_cycles_session_time", "session_id", "occurred_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    event_key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    session_id: Mapped[str] = mapped_column(String(120), nullable=False)
    strategy_id: Mapped[str] = mapped_column(String(80), nullable=False)
    strategy_name: Mapped[str] = mapped_column(String(80), nullable=False)
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    target: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    signal_length: Mapped[int] = mapped_column(nullable=False)
    starting_deposit: Mapped[Decimal] = mapped_column(Numeric(16, 4), nullable=False)
    round_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    step: Mapped[int] = mapped_column(nullable=False)
    pnl: Mapped[Decimal] = mapped_column(Numeric(16, 4), nullable=False)
    drawdown: Mapped[Decimal] = mapped_column(Numeric(16, 4), nullable=False)
    bet: Mapped[Decimal | None] = mapped_column(Numeric(16, 4), nullable=True)
    multiplier: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DATETIME(fsp=3),
        nullable=False,
        default=datetime.utcnow,
    )
