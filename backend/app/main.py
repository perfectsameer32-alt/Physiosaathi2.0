import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import ensure_indexes, close_mongo_connection, HAS_MONGO
from app.api.v1.router import api_router

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: trigger index creation if Mongo is present
    if HAS_MONGO:
        app.state.index_task = asyncio.create_task(ensure_indexes())
        logger.info("MongoDB index task scheduled.")
    yield
    # Shutdown: clean up background index task and Mongo connection
    if HAS_MONGO:
        if hasattr(app.state, 'index_task'):
            app.state.index_task.cancel()
            with suppress(asyncio.CancelledError):
                await app.state.index_task
        await close_mongo_connection()

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Robust CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

