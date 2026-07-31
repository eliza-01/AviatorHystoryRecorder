from fastapi import APIRouter, status

from app.schemas.telegram_notification import (
    TelegramStrategyNotificationRequest,
    TelegramStrategyNotificationResponse,
)
from app.services.telegram_service import send_strategy_notification

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post(
    "/strategy-notification",
    response_model=TelegramStrategyNotificationResponse,
    status_code=status.HTTP_200_OK,
)
async def post_strategy_notification(
    payload: TelegramStrategyNotificationRequest,
) -> TelegramStrategyNotificationResponse:
    await send_strategy_notification(payload)
    return TelegramStrategyNotificationResponse()
