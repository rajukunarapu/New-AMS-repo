"""
main.py - FastAPI Application Entry Point for AMS Ticket Intelligence Assistant (Updated).
"""

from datetime import datetime, timezone
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from routers import auth_router, chat_router, tickets_router, sla_router
from services.sla_scheduler import sla_scheduler_instance


@asynccontextmanager
async def lifespan(app: FastAPI):
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


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["."])
