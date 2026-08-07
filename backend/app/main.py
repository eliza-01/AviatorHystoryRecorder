from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import engine
from app.models.base import Base
from app.models.diagnostic_sample import DiagnosticSample  # noqa: F401
from app.models.game_result import GameResult  # noqa: F401
from app.models.strategy_cycle import StrategyCycle  # noqa: F401


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


settings = get_settings()
web_directory = Path(__file__).resolve().parent / "web"

app = FastAPI(
    title=settings.app_name,
    version="1.2.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.mount(
    "/assets",
    StaticFiles(directory=web_directory),
    name="web-assets",
)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
async def get_dashboard() -> FileResponse:
    return FileResponse(web_directory / "index.html")
