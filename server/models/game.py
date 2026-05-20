from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class GameSummary(BaseModel):
    name: str
    slug: str
    status: str = "active"
    repo_url: Optional[str] = None
    created_at: Optional[str] = None
    # Game state
    phase: Optional[str] = None
    active_milestone: Optional[str] = None
    nights_elapsed: int = 0
    estimated_nights_to_mvp: Optional[int] = None
    tasks_total: int = 0
    tasks_done: int = 0
    tasks_pending: int = 0
    tasks_failed: int = 0
    tasks_blocked: int = 0
    milestone_count: int = 0
    milestones_done: int = 0
    blocker_count: int = 0


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
