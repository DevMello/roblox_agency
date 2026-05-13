from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel

TaskStatus = Literal["pending", "running", "done", "failed", "blocked"]
QAVerdict = Literal["approved", "failed"]


class Task(BaseModel):
    id: str
    title: str
    agent: Literal["planner", "builder", "qa", "reporter"] = "builder"
    worker_id: Optional[str] = None
    status: TaskStatus = "pending"
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    pr_number: Optional[int] = None
    qa_verdict: Optional[QAVerdict] = None
    blocker_ref: Optional[str] = None
    estimated_minutes: int = 30
    failure_reason: Optional[str] = None


class TaskUpdate(BaseModel):
    task_id: str
    status: TaskStatus
    pr_number: Optional[int] = None
    qa_verdict: Optional[QAVerdict] = None
    blocker_ref: Optional[str] = None
    failure_reason: Optional[str] = None
