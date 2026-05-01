"""Git routes — branches, PRs, diff, commits via git/gh CLI."""
from __future__ import annotations

import json
import subprocess
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from webui.server import config

router = APIRouter(prefix="/api/v1/git", tags=["git"])

# ---------------------------------------------------------------------------
# Shell helpers
# ---------------------------------------------------------------------------

def _run_git(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(config.REPO_ROOT),
        check=check,
    )


def _run_gh(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["gh", *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(config.REPO_ROOT),
        check=check,
    )


def _git_ok(result: subprocess.CompletedProcess, detail: str = "git error") -> str:
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"{detail}: {result.stderr.strip()}")
    return result.stdout.strip()


def _gh_ok(result: subprocess.CompletedProcess, detail: str = "gh error") -> str:
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=f"{detail}: {result.stderr.strip()}")
    return result.stdout.strip()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/branches")
async def list_branches() -> list[dict]:
    """Returns [{name, is_current, last_commit_sha, last_commit_message}]"""
    try:
        result = _run_git(
            "branch", "--all", "--format",
            "%(refname:short)|%(HEAD)|%(objectname:short)|%(subject)",
        )
        output = _git_ok(result, "list branches")
        branches: list[dict[str, Any]] = []
        for line in output.splitlines():
            if not line.strip():
                continue
            parts = line.split("|", 3)
            if len(parts) < 4:
                continue
            name, head_marker, sha, message = parts
            branches.append({
                "name": name.strip(),
                "is_current": head_marker.strip() == "*",
                "last_commit_sha": sha.strip(),
                "last_commit_message": message.strip(),
            })
        return branches
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/prs")
async def list_prs() -> list[dict]:
    """Returns open PRs via gh pr list."""
    try:
        result = _run_gh(
            "pr", "list",
            "--state", "open",
            "--json", "number,title,headRefName,baseRefName,author,createdAt,labels,url",
        )
        output = _gh_ok(result, "list PRs")
        return json.loads(output) if output else []
    except HTTPException:
        raise
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Could not parse gh output: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/prs/{pr_number}")
async def get_pr(pr_number: int) -> dict:
    """Returns PR details via gh pr view --json."""
    try:
        result = _run_gh(
            "pr", "view", str(pr_number),
            "--json",
            "number,title,body,headRefName,baseRefName,author,createdAt,mergedAt,"
            "closedAt,state,labels,url,additions,deletions,commits",
        )
        output = _gh_ok(result, f"get PR #{pr_number}")
        return json.loads(output)
    except HTTPException:
        raise
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Could not parse gh output: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/prs/{pr_number}/merge")
async def merge_pr(pr_number: int) -> dict:
    """gh pr merge --squash"""
    try:
        result = _run_gh("pr", "merge", str(pr_number), "--squash", "--auto", check=False)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=result.stderr.strip())
        return {"merged": True, "pr_number": pr_number, "output": result.stdout.strip()}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/prs/{pr_number}/close")
async def close_pr(pr_number: int, body: dict = {}) -> dict:
    """gh pr close. Body: {reason: optional str}"""
    try:
        cmd = ["pr", "close", str(pr_number)]
        reason = body.get("reason", "").strip()
        if reason:
            cmd += ["--comment", reason]
        result = _run_gh(*cmd, check=False)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=result.stderr.strip())
        return {"closed": True, "pr_number": pr_number}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/diff")
async def get_diff(base: str = Query(...), head: str = Query(...)) -> dict:
    """Returns unified diff between two refs."""
    try:
        result = _run_git("diff", f"{base}...{head}", check=False)
        # returncode 1 means there are differences (normal)
        if result.returncode not in (0, 1):
            raise HTTPException(status_code=500, detail=result.stderr.strip())
        return {"base": base, "head": head, "diff": result.stdout}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/commits")
async def get_commits(branch: str = "main", n: int = 20) -> list[dict]:
    """Returns last n commits on branch."""
    try:
        result = _run_git(
            "log", branch,
            f"--max-count={n}",
            "--pretty=format:%H|%h|%an|%ae|%ai|%s",
            check=False,
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=result.stderr.strip())
        commits: list[dict[str, Any]] = []
        for line in result.stdout.splitlines():
            if not line.strip():
                continue
            parts = line.split("|", 5)
            if len(parts) < 6:
                continue
            sha, short_sha, author_name, author_email, date, message = parts
            commits.append({
                "sha": sha,
                "short_sha": short_sha,
                "author_name": author_name,
                "author_email": author_email,
                "date": date,
                "message": message,
            })
        return commits
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/checkout")
async def checkout(body: dict) -> dict:
    """Body: {branch: str}. git checkout branch."""
    branch = body.get("branch", "").strip()
    if not branch:
        raise HTTPException(status_code=422, detail="'branch' field is required")
    try:
        result = _run_git("checkout", branch, check=False)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=result.stderr.strip())
        return {"checked_out": branch}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
