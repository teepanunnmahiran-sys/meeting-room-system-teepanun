import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError

from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all models are registered
from app.api import (
    auth, rooms, bookings, calendar, dashboard, reports, users, notifications, audit_logs
)
from app.websocket.manager import ws_manager

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(rooms.router, prefix=settings.API_PREFIX)
app.include_router(bookings.router, prefix=settings.API_PREFIX)
app.include_router(calendar.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(notifications.router, prefix=settings.API_PREFIX)
app.include_router(audit_logs.router, prefix=settings.API_PREFIX)

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    user_id = None
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            uid = payload.get("sub")
            if uid:
                user_id = int(uid)
        except (JWTError, ValueError):
            pass

    await ws_manager.connect(websocket, user_id=user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Respond to ping or heartbeat
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id=user_id)
    except Exception:
        ws_manager.disconnect(websocket, user_id=user_id)

# Mount Static Files
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
static_path = os.path.join(base_dir, "static")
templates_path = os.path.join(base_dir, "templates")

if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/")
def read_root():
    index_file = os.path.join(templates_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>Enterprise Meeting Room System Backend Running</h1>")

# Fallback route for SPA page reloads
@app.get("/{full_path:path}")
def catch_all(full_path: str):
    # If API or static, ignore
    if full_path.startswith("api/") or full_path.startswith("static/") or full_path in ["docs", "redoc", "openapi.json", "ws"]:
        return HTMLResponse("Not Found", status_code=404)
    index_file = os.path.join(templates_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>Enterprise Meeting Room System</h1>")
