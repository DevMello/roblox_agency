from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class GameSummary(BaseModel):
    name: str
    slug: str
    spec_path: str
    plan_path: str
    sprint_log_path: str
    progress_path: str
    current_sprint: int = 0
    milestone_count: int = 0
    milestones_done: int = 0
    task_count: int = 0
    tasks_done: int = 0
    open_pr_count: int = 0
    blocker_count: int = 0
    last_run_at: Optional[str] = None


class Blocker(BaseModel):
    id: str
    game: str
    description: str
    created_at: str
    resolved: bool = False
    resolved_at: Optional[str] = None


class Override(BaseModel):
    game: str
    text: str
    priority: str = "normal"
    target: str = "current sprint"
