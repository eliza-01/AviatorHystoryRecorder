import asyncio
import json
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
            else "📉 <b>Порог серии достигнут</b>"
        )
        signal_status = "достигнут" if signal_reached else "ещё не достигнут"
        return (
            f"{title}\n\n"
            f"Стратегия: <b>{strategy}</b>\n"
            f"Текущая последовательность: <b>{current_streak}</b> результатов ≤ "
            f"<b>{target}x</b>\n"
            f"Прогресс стратегии: <b>{min(current_streak, signal_length)}/{signal_length}</b>\n"
            f"Уровень уведомления: <b>{notification_level}/{signal_length}</b>\n"
            f"Сигнал: <b>{signal_status}</b>"
        )

    if payload.reason is TelegramNotificationReason.PROFIT:
        return (
            "✅ <b>Цикл закрыт в прибыль</b>\n\n"
            f"Стратегия: <b>{strategy}</b>\n"
            f"🏁 Завершено на шаге: <b>{int(payload.step or 0)}</b>\n"
            f"Прибыль: <b>+{_format_number(payload.profit or 0)}</b>\n"
            f"📉 Максимальная просадка: <b>{_format_number(payload.drawdown or 0)}</b>\n"
            f"Победная ставка: <b>{_format_number(payload.bet or 0)}</b>\n"
            f"Результат раунда: <b>{_format_number(payload.multiplier or 0)}x</b>"
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
