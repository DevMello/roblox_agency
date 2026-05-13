from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class ScheduledJob(BaseModel):
    id: str
    label: str
    game: str
    script: str
    cron_expr: str
    timezone: str = "America/New_York"
    active: bool = True
    next_run: Optional[str] = None
    last_run: Optional[str] = None
    last_run_status: Optional[str] = None
    created_at: str


class CreateJobRequest(BaseModel):
    label: str
    game: str
    script: str
    cron_expr: str
    timezone: str = "America/New_York"
    active: bool = True


class UpdateJobRequest(BaseModel):
    label: Optional[str] = None
    cron_expr: Optional[str] = None
    timezone: Optional[str] = None
    active: Optional[bool] = None
