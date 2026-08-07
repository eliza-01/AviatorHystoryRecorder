from datetime import datetime, timezone

from app.schemas.telegram_notification import TelegramStrategyNotificationRequest
from app.services.telegram_service import _format_profit_summary


def main() -> None:
    payload = TelegramStrategyNotificationRequest(
        chat_id="123456",
        reason="profit",
        strategy_name="15+ - x5.12",
        target=5.12,
        signal_length=15,
        step=3,
        drawdown=0.4,
        profit=0.2,
        multiplier=6.2,
        bet=0.2,
        starting_deposit=14,
        started_at=datetime(2026, 8, 4, 16, 30, tzinfo=timezone.utc),
        total_profit=10.6,
    )

    summary = _format_profit_summary(
        payload,
        now=datetime(2026, 8, 5, 1, 0, tzinfo=timezone.utc),
    )

    assert summary == (
        "\n\n________________________\n"
        "Депозит: <b>14</b>\n"
        "Старт: <b>8ч 30м назад</b>\n"
        "Общая прибыль: <b>10.6</b>\n"
        "Средняя в сутки: <b>29.9</b>"
    )


if __name__ == "__main__":
    main()
    print("telegram profit summary tests passed")
