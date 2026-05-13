from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel

RunScript = Literal[
    "night-cycle",
    "architect",
    "reporter",
    "live-edit",
    "worker",
    "weekly-research",
]

RunStatus = Literal["pending", "running", "completed", "failed", "killed"]


class Run(BaseModel):
    id: str
    game: Optional[str] = None
    script: RunScript
    status: RunStatus = "pending"
    started_at: str
    ended_at: Optional[str] = None
    exit_code: Optional[int] = None
    pid: Optional[int] = None


class RunLogLine(BaseModel):
    run_id: str
    line_number: int
    timestamp: str
    agent: str = ""
    level: str = "INFO"
    message: str


class LaunchNightCycleRequest(BaseModel):
    game: Optional[str] = None
    dry_run: bool = False
    workers: str = "all"


class LaunchLiveEditRequest(BaseModel):
    text: str
    priority: str = "normal"
    run_now: bool = True
