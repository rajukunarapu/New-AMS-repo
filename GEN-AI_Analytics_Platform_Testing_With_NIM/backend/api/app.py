import sys
from pathlib import Path

# Ensure backend directory is in sys.path for module imports
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.routes.health import router as health_router
from api.routes.dashboard import router as dashboard_router
from api.routes.analytics import router as analytics_router
from api.routes.chat import router as chat_router
from api.routes.graph import router as graph_router
from api.routes.upload import router as upload_router

app = FastAPI(
    title="GEN-AI Analytics Platform API",
    description="Enterprise Analytics & RAG Service powered by SAP HANA Cloud & SAP AI Core",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(chat_router)
app.include_router(graph_router)
app.include_router(upload_router)

@app.get("/")
def root():
    return {
        "message": "Welcome to GEN-AI Analytics Platform API",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=settings.PORT, reload=True)
