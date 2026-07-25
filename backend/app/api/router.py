from fastapi import APIRouter

from app.api.v1.routes.diagnostics.get_samples import router as get_samples_router
from app.api.v1.routes.diagnostics.post_samples_batch import (
    router as post_samples_batch_router,
)
from app.api.v1.routes.health.get_health import router as get_health_router
from app.api.v1.routes.results.get_results import router as get_results_router
from app.api.v1.routes.results.post_results_batch import (
    router as post_results_batch_router,
)

api_router = APIRouter()
api_router.include_router(get_health_router)
api_router.include_router(post_results_batch_router)
api_router.include_router(get_results_router)
api_router.include_router(post_samples_batch_router)
api_router.include_router(get_samples_router)
