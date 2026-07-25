from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Index, JSON, Numeric, String, Text
from sqlalchemy.dialects.mysql import DATETIME
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class GameResult(Base):
    __tablename__ = "game_results"
    __table_args__ = (
        Index("idx_game_results_game_captured", "game_key", "captured_at"),
        Index("idx_game_results_round", "round_id"),
        Index("idx_game_results_multiplier", "multiplier"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True)
    dedupe_key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    game_key: Mapped[str] = mapped_column(String(64), nullable=False)
    round_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    multiplier: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    happened_at: Mapped[datetime | None] = mapped_column(DATETIME(fsp=3), nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DATETIME(fsp=3), nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    page_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    frame_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DATETIME(fsp=3),
        nullable=False,
        default=datetime.utcnow,
    )
