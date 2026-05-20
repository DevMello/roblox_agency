"""Reports routes — morning digests and weekly market research."""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from server.db import get_db
from server import config as cfg

router = APIRouter(tags=["reports"])


def _decode_metrics(item: dict) -> dict:
    if item.get("metrics"):
        try:
            item["metrics"] = json.loads(item["metrics"])
        except (json.JSONDecodeError, TypeError):
            pass
    return item


@router.get("/morning/")
async def list_morning_reports():
    """List all morning reports, newest first."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, report_date, title, metrics FROM reports "
            "WHERE type='morning' ORDER BY report_date DESC"
        ).fetchall()
    return {"reports": [_decode_metrics(dict(r)) for r in rows]}


@router.get("/morning/{date}")
async def get_morning_report(date: str):
    """Get a single morning report by date (YYYY-MM-DD)."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM reports WHERE type='morning' AND report_date=?",
            (date,),
        ).fetchone()
    if row:
        return _decode_metrics(dict(row))
    report_path = cfg.REPO_ROOT / "reports" / "morning" / f"{date}.md"
    if report_path.exists():
        return {"report_date": date, "content": report_path.read_text(encoding="utf-8"), "source": "filesystem"}
    raise HTTPException(status_code=404, detail=f"Morning report for {date!r} not found")


@router.get("/weekly/")
async def list_weekly_reports():
    """List all weekly reports."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, week, type, created_at FROM weekly_reports ORDER BY week DESC, type"
        ).fetchall()
    return {"reports": [dict(r) for r in rows]}


@router.get("/weekly/{week}")
async def get_weekly_reports_for_week(week: str):
    """Get all reports for a given week (e.g. '2026-18')."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, week, type, created_at FROM weekly_reports WHERE week=? ORDER BY type",
            (week,),
        ).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No weekly reports found for week {week!r}")
    return {"week": week, "reports": [dict(r) for r in rows]}


@router.get("/weekly/{week}/{report_type}")
async def get_weekly_report(week: str, report_type: str):
    """Get a specific weekly report (type: 'market-research' or 'game-ideas')."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM weekly_reports WHERE week=? AND type=?",
            (week, report_type),
        ).fetchone()
    if row:
        return dict(row)
    for md_file in (cfg.REPO_ROOT / "reports" / "weekly" / week).glob("*.md"):
        fname = md_file.stem.lower()
        if report_type == "market-research" and "market" in fname:
            return {"week": week, "type": report_type, "content": md_file.read_text(encoding="utf-8"), "source": "filesystem"}
        if report_type == "game-ideas" and ("idea" in fname or "game-idea" in fname):
            return {"week": week, "type": report_type, "content": md_file.read_text(encoding="utf-8"), "source": "filesystem"}
    raise HTTPException(status_code=404, detail=f"Weekly report {week}/{report_type} not found")
