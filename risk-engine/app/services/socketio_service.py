"""Socket.IO server for real-time connection monitoring from the Node.js backend."""

import logging
import time

import socketio

logger = logging.getLogger("risk-engine")

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


@sio.event
async def connect(sid: str, environ: dict):
    """Handle new backend connection."""
    logger.info("Backend connected via Socket.IO (sid=%s)", sid)
    await sio.emit(
        "connected",
        {
            "engine": "python",
            "version": "1.0.0",
            "timestamp": time.time(),
        },
        to=sid,
    )


@sio.event
async def disconnect(sid: str):
    """Handle backend disconnection."""
    logger.info("Backend disconnected (sid=%s)", sid)


@sio.event
async def ping_engine(sid: str, data: dict):
    """Respond to ping with a pong."""
    await sio.emit("pong_engine", {"timestamp": time.time()}, to=sid)
