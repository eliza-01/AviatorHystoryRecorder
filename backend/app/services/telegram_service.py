import asyncio
import json
from datetime import datetime, timezone
from html import escape
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.telegram_notification import (
    TelegramNotificationReason,
    TelegramStrategyNotificationRequest,
)


def _format_number(value: float, digits: int = 2) -> str:
    return f"{float(value):.{digits}f}"


def _format_compact_number(value: float, digits: int = 1) -> str:
    formatted = f"{float(value):.{digits}f}"
    return formatted.rstrip("0").rstrip(".")


def _format_elapsed(started_at: datetime, now: datetime) -> str:
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    else:
        started_at = started_at.astimezone(timezone.utc)

    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    else:
        now = now.astimezone(timezone.utc)

    total_minutes = max(0, int((now - started_at).total_seconds() // 60))
    days, remainder = divmod(total_minutes, 24 * 60)
    hours, minutes = divmod(remainder, 60)

    parts: list[str] = []
    if days:
        parts.append(f"{days}д")
    if hours or days:
        parts.append(f"{hours}ч")
    parts.append(f"{minutes}м")
    return " ".join(parts)


def _format_profit_summary(
    payload: TelegramStrategyNotificationRequest,
    now: datetime | None = None,
) -> str:
    if (
        payload.starting_deposit is None
        or payload.started_at is None
        or payload.total_profit is None
    ):
        return ""

    current_time = now or datetime.now(timezone.utc)
    started_at = payload.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    else:
        started_at = started_at.astimezone(timezone.utc)
    current_time = current_time.astimezone(timezone.utc)
    elapsed_seconds = max(
        60.0,
        (current_time - started_at).total_seconds(),
    )
    average_per_day = float(payload.total_profit) * 86_400 / elapsed_seconds

    return (
        "\n\n________________________\n"
        f"Депозит: <b>{_format_compact_number(payload.starting_deposit, 2)}</b>\n"
        f"Старт: <b>{_format_elapsed(started_at, current_time)} назад</b>\n"
        f"Общая прибыль: <b>{_format_compact_number(payload.total_profit, 1)}</b>\n"
        f"Средняя в сутки: <b>{_format_compact_number(average_per_day, 1)}</b>"
    )


def _format_message(payload: TelegramStrategyNotificationRequest) -> str:
    strategy = escape(payload.strategy_name)
    target = _format_number(payload.target)

    if payload.reason is TelegramNotificationReason.SERIES:
        notification_level = int(payload.series_length or 0)
        current_streak = int(payload.current_streak or notification_level)
        signal_length = int(payload.signal_length)
        signal_reached = current_streak >= signal_length
        title = (
            "🏁 <b>Сигнал стратегии сформирован</b>"
            if signal_reached
            else f"🏁 <b>Готовность <b>{notification_level}/{signal_length}</b></b>"
        )
        signal_status = "достигнут" if signal_reached else "ещё не достигнут"
        return (
            f"{title}\n\n"
            # f"Цель: <b>{target}x</b>\n"
            f"Текущий прогресс: <b>{min(current_streak, signal_length)}/{signal_length}</b>\n\n"
            # f"Уровень уведомления: <b>{notification_level}/{signal_length}</b>\n"
            # f"Сигнал: <b>{signal_status}</b>"
            f"Стратегия: <b>{strategy}</b>"
        )

    if payload.reason is TelegramNotificationReason.PROFIT:
        return (
            "✅ <b>Закрыто с прибылью</b>\n\n"
            f"Прибыль: <b>+{_format_number(payload.profit or 0)}</b>\n"
            f"На шаге: <b>{int(payload.step or 0)}</b>\n"
            f"Просадка: <b>{_format_number(payload.drawdown or 0)}</b>\n"
            f"Последняя ставка: <b>{_format_number(payload.bet or 0)}</b>\n"
            f"Множитель раунда: <b>{_format_number(payload.multiplier or 0)}x</b>\n\n"
            f"Стратегия: <b>{strategy}</b>"
            f"{_format_profit_summary(payload)}"
        )

    return (
        "❌ <b>Цикл остановлен</b>\n\n"
        f"Стратегия: <b>{strategy}</b>\n"
        f"🏁 Завершено на шаге: <b>{int(payload.step or 0)}</b>\n"
        f"Убыток: <b>-{_format_number(payload.loss or 0)}</b>\n"
        f"📉 Просадка: <b>{_format_number(payload.drawdown or 0)}</b>"
    )


def _send_message_sync(token: str, chat_id: str, text: str, timeout: float) -> None:
    body = json.dumps(
        {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
        }
    ).encode("utf-8")
    request = Request(
        f"https://api.telegram.org/bot{token}/sendMessage",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=timeout) as response:
            response_body = response.read().decode("utf-8", errors="replace")
    except HTTPError as error:
        response_body = error.read().decode("utf-8", errors="replace")
        detail = _extract_telegram_error(response_body) or f"Telegram API: HTTP {error.code}"
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from error
    except (URLError, TimeoutError) as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Telegram API недоступен: {error}",
        ) from error

    try:
        parsed = json.loads(response_body)
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Telegram API вернул некорректный ответ",
        ) from error

    if not parsed.get("ok"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(parsed.get("description") or "Telegram отклонил сообщение"),
        )


def _extract_telegram_error(response_body: str) -> str | None:
    try:
        parsed = json.loads(response_body)
    except json.JSONDecodeError:
        return None
    description = parsed.get("description")
    return str(description) if description else None


async def send_strategy_notification(
    payload: TelegramStrategyNotificationRequest,
) -> None:
    settings = get_settings()
    token = settings.telegram_bot_token.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TELEGRAM_BOT_TOKEN не настроен в .env",
        )

    await asyncio.to_thread(
        _send_message_sync,
        token,
        payload.chat_id,
        _format_message(payload),
        settings.telegram_request_timeout_seconds,
    )
