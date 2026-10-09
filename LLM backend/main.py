"""
main.py - FastAPI Application Entry Point for AMS Ticket Intelligence Assistant (Updated).
"""

import sys
import multiprocessing
from datetime import datetime, timezone
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from routers import auth_router, chat_router, tickets_router, sla_router
from services.sla_scheduler import sla_scheduler_instance
from run_scheduler import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup logging to ensure logs/sla_monitor.log file handler is active
    setup_logging()
    # Startup: start SLA Background Scheduler non-blockingly on the event loop
    await sla_scheduler_instance.start()
    yield
    # Shutdown: stop SLA Background Scheduler non-blockingly
    await sla_scheduler_instance.stop()


app = FastAPI(
    title="AMS AI Ticket Intelligence API",
    description=(
        "Production-ready FastAPI backend for Neovatic AMS Ticket Intelligence System. "
        "Allows frontend applications to query tickets using natural language LLM intelligence, "
        "manage tickets, route assignment groups using Bearer token authentication, "
        "and monitor SLAs with automated reminders."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Enable CORS for all frontend integrations (React, Vue, Next.js, Mobile, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Frontend static directory for LLM testing UI
if os.path.isdir("frontend"):
    app.mount("/frontend", StaticFiles(directory="frontend", html=True), name="frontend")

# Register Routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(tickets_router)
app.include_router(sla_router)



@app.get("/health", tags=["System"], summary="API Health Check")
def health_check():
    """Returns the operational health status of the API."""
    return {
        "status": "healthy",
        "service": "AMS AI Ticket Intelligence API",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/", tags=["System"], summary="API Root / Overview")
def root():
    """Returns API overview and documentation endpoints."""
    return {
        "message": "Welcome to Neovatic AMS Ticket Intelligence API",
        "frontend": "/frontend",
        "docs": "/docs",
        "redoc": "/redoc",
        "endpoints": {
            "chat": "POST /api/chat",
            "auth_login": "POST /api/auth/login",
            "tickets_list": "GET /api/tickets",
            "tickets_status": "GET /api/tickets/status",
            "ticket_create": "POST /api/tickets/create",
            "groups": "GET /api/groups",
            "route_module": "POST /api/route-module",
            "health": "GET /health"
        }
    }


import argparse
from dotenv import load_dotenv

# Ensure .env is loaded from the executable directory when frozen with PyInstaller
if getattr(sys, "frozen", False):
    exe_dir = os.path.dirname(sys.executable)
    load_dotenv(os.path.join(exe_dir, ".env"), override=True)
else:
    load_dotenv(override=True)

if __name__ == "__main__":
    multiprocessing.freeze_support()

    parser = argparse.ArgumentParser(description="AMS AI Ticket Intelligence Backend API")
    parser.add_argument("--port", "-p", type=int, default=None, help="Port to listen on")
    parser.add_argument("--host", type=str, default=None, help="Host interface IP to bind")
    args, _ = parser.parse_known_args()

    # IIS sets HTTP_PLATFORM_PORT when launching via HttpPlatformHandler
    iis_port = os.getenv("HTTP_PLATFORM_PORT")
    env_port = os.getenv("PORT")

    # Priority: IIS env var > CLI argument > .env PORT > Default (90)
    if iis_port:
        port = int(iis_port)
    elif args.port:
        port = args.port
    elif env_port:
        port = int(env_port)
    else:
        port = 83

    # For IIS or general hosting, bind host priority: CLI arg > .env HOST > (0.0.0.0 if IIS else 172.16.32.50)
    env_host = os.getenv("HOST")
    if args.host:
        host = args.host
    elif env_host:
        host = env_host
    elif iis_port:
        host = "127.0.0.1"
    else:
        host = "172.16.32.50"

    print(f"Starting AMS AI Backend on {host}:{port} (IIS/Dynamic Port Mode)...")

    if getattr(sys, "frozen", False):
        # When running as a PyInstaller compiled binary, pass app directly and disable reload
        uvicorn.run(app, host=host, port=port)
    else:
        uvicorn.run("main:app", host=host, port=port, reload=True, reload_dirs=["."])

