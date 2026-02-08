"""
═══════════════════════════════════════════════════════════════
 Cosmic Watch — Python Risk Analysis Engine
 FastAPI microservice for advanced NEO threat assessment
═══════════════════════════════════════════════════════════════
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import time

import socketio

from app.routes import risk_router, health_router
from app.services import sio
from app.config import settings


logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("risk-engine")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🔬 Cosmic Watch Risk Engine starting...")
    yield
    logger.info("Risk Engine shutting down")


app = FastAPI(
    title="Cosmic Watch Risk Analysis Engine",
    description="Advanced NEO threat assessment using scientific computing (NumPy, SciPy, scikit-learn)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(risk_router, prefix="/api/v1")

# Wrap ASGI app with Socket.IO for real-time backend connection
combined_asgi_app = socketio.ASGIApp(sio, app)
