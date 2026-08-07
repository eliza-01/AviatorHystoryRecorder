from datetime import datetime, timezone

from app.schemas.strategy_cycle import StrategyCycleBatchCreate


def main() -> None:
    payload = StrategyCycleBatchCreate(
        cycles=[
            {
                "event_key": "a" * 64,
                "session_id": "fifteen-plus-x512-test-session",
                "strategy_id": "fifteen-plus-x512",
                "strategy_name": "15+ - x5.12",
                "outcome": "stop",
                "target": "5.12",
                "signal_length": 15,
                "starting_deposit": "14",
                "round_id": "round-1",
                "step": 16,
                "pnl": "-13.7000",
                "drawdown": "13.7000",
                "bet": "2.7200",
                "multiplier": "1.20",
                "occurred_at": datetime(2026, 8, 7, 12, 0, tzinfo=timezone.utc),
                "metadata": {"extension_version": "1.9.8"},
            }
        ]
    )
    assert len(payload.cycles) == 1
    assert str(payload.cycles[0].pnl) == "-13.7000"
    assert payload.cycles[0].outcome == "stop"


if __name__ == "__main__":
    main()
    print("strategy cycle schema tests passed")
