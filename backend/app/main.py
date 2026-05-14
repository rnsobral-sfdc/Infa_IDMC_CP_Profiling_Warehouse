from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import init_db
from .api import auth
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="IDMC Profiling Extractor API",
    description="REST API for extracting and managing Informatica IDMC profiling data",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize scheduler
scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def startup_event():
    """Initialize database and start scheduler on startup."""
    logger.info("Initializing database...")
    init_db()

    # Clean up orphaned running jobs (server restart scenarios)
    logger.info("Checking for orphaned running jobs...")
    from .core.database import SessionLocal
    from .models import SyncJobRun
    from datetime import datetime

    db = SessionLocal()
    try:
        orphaned_runs = db.query(SyncJobRun).filter(SyncJobRun.status == "RUNNING").all()
        if orphaned_runs:
            logger.info(f"Found {len(orphaned_runs)} orphaned running jobs, marking as FAILED")
            for run in orphaned_runs:
                run.status = "FAILED"
                run.completed_at = datetime.utcnow()
                run.error_message = "Server restarted while job was running"
                if run.started_at:
                    run.duration_seconds = int((run.completed_at - run.started_at).total_seconds())
            db.commit()
            logger.info("Orphaned jobs cleaned up")
    finally:
        db.close()

    logger.info("Starting scheduler...")
    scheduler.start()
    logger.info("Application started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down scheduler...")
    scheduler.shutdown()
    logger.info("Application shutdown complete")


# Include routers
app.include_router(auth.router)


# Additional route imports (will be created)
try:
    from .api import connections, sync_jobs, profiling, api_logs, data_explorer, admin, reports
    app.include_router(connections.router)
    app.include_router(sync_jobs.router)
    app.include_router(profiling.router)
    app.include_router(api_logs.router)
    app.include_router(data_explorer.router)
    app.include_router(admin.router)
    app.include_router(reports.router)
    logger.info("All routers loaded successfully")
except ImportError as e:
    logger.warning(f"Some route modules not found: {e}")
except Exception as e:
    logger.error(f"Error loading routers: {e}")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "service": "IDMC Profiling Extractor API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
