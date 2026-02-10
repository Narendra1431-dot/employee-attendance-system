from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base
from .routes import auth, employees, attendance, config, stats
from .core.logging_config import setup_logging, logger
from .core.exceptions import global_exception_handler, http_exception_handler
from fastapi import Request, HTTPException
import os
from pathlib import Path

# Setup logging
setup_logging()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Employee Attendance System")

# Register exception handlers
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)


BASE_DIR = Path(__file__).resolve().parent.parent.parent
STATIC_DIR = BASE_DIR / "frontend" / "static"
TEMPLATES_DIR = BASE_DIR / "frontend" / "templates"

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/")
async def read_index():
    return FileResponse(str(TEMPLATES_DIR / "index.html"))

@app.get("/dashboard")
async def read_dashboard():
    return FileResponse(str(TEMPLATES_DIR / "dashboard.html"))

@app.get("/admin")
async def read_admin():
    return FileResponse(str(TEMPLATES_DIR / "admin.html"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(config.router, prefix="/api/config", tags=["Configuration"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])

