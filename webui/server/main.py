"""FastAPI application factory."""
from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from webui.server import config
from webui.server.db.init_db import init_db
from webui.server.routes import games, specs, runs, edits, files, git, schedule, cfg, ws
from webui.server.services.scheduler import scheduler_service
from webui.server.services.process import process_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db(config.DB_PATH)
    scheduler_service.start()
    asyncio.create_task(_start_file_watcher())
    yield
    # Shutdown
    scheduler_service.shutdown()
    process_manager.shutdown()


async def _start_file_watcher() -> None:
    """Launch watchdog observer in a thread."""
    from webui.server.services.repo import repo_watcher
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, repo_watcher.start)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Roblox Agency UI",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = "/api/v1"
    app.include_router(games.router, prefix=f"{prefix}/games", tags=["games"])
    app.include_router(specs.router, prefix=f"{prefix}/specs", tags=["specs"])
    app.include_router(runs.router, prefix=f"{prefix}/runs", tags=["runs"])
    app.include_router(edits.router, prefix=f"{prefix}/edits", tags=["edits"])
    app.include_router(files.router, prefix=f"{prefix}/files", tags=["files"])
    app.include_router(git.router, prefix=f"{prefix}/git", tags=["git"])
    app.include_router(schedule.router, prefix=f"{prefix}/schedule", tags=["schedule"])
    app.include_router(cfg.router, prefix=f"{prefix}/config", tags=["config"])
    app.include_router(ws.router, tags=["ws"])

    # Serve built React app — must be last
    dist = Path(__file__).parent.parent / "client" / "dist"
    if dist.exists():
        app.mount("/", StaticFiles(directory=str(dist), html=True), name="static")

    return app


app = create_app()
