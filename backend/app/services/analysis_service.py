from decimal import Decimal

from app.repositories.game_result_repository import GameResultRepository
from app.schemas.analysis import AnalysisPoint, AnalysisResponse, AnalysisStats


class AnalysisService:
    def __init__(self, repository: GameResultRepository):
        self._repository = repository

    async def calculate(
        self,
        threshold: Decimal,
    ) -> AnalysisResponse:
        rows = await self._repository.list_for_analysis()
        win_delta = threshold - Decimal("1")
        balance = Decimal("0")
        historical_minimum = Decimal("0")
        positive = 0
        negative = 0
        points: list[AnalysisPoint] = []

        for index, (_, multiplier, occurred_at) in enumerate(rows, start=1):
            if multiplier > threshold:
                positive += 1
                delta = win_delta
            else:
                negative += 1
                delta = Decimal("-1")

            balance += delta
            historical_minimum = min(historical_minimum, balance)
            points.append(
                AnalysisPoint(
                    index=index,
                    multiplier=float(multiplier),
                    delta=float(delta),
                    balance=float(balance),
                    occurred_at=occurred_at,
                )
            )

        total = positive + negative
        positive_rate = (positive / total * 100) if total else 0.0
        negative_rate = (negative / total * 100) if total else 0.0
        weighted_positive = Decimal(positive) * win_delta

        # Минимальное значение накопительного баланса за всю историю.
        # Стартовая точка с балансом 0 также учитывается.

        stats = AnalysisStats(
            x=float(threshold),
            total=total,
            positive=positive,
            negative=negative,
            positive_rate=positive_rate,
            negative_rate=negative_rate,
            weighted_positive=float(weighted_positive),
            historical_minimum=float(historical_minimum),
            chart_result=float(balance),
            points_returned=len(points),
        )
        return AnalysisResponse(stats=stats, points=points)
