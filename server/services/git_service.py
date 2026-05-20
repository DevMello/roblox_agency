"""Git service — gitpython wrapper for local repo ops + gh CLI for PR data."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

import git  # gitpython


class GitService:
    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _repo(self) -> git.Repo:
        from webui.server import config as cfg

        return git.Repo(cfg.REPO_ROOT)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def branches(self) -> list[dict]:
        """Returns [{name, is_current, last_commit_sha, last_commit_message}]."""
        repo = self._repo()
        current = repo.active_branch.name if not repo.head.is_detached else ""
        result: list[dict] = []
        for ref in repo.branches:  # type: ignore[attr-defined]
            commit = ref.commit
            result.append(
                {
                    "name": ref.name,
                    "is_current": ref.name == current,
                    "last_commit_sha": commit.hexsha,
                    "last_commit_message": commit.message.strip(),
                }
            )
        return result

    def current_branch(self) -> str:
        """Returns name of HEAD branch, or the SHA when detached."""
        repo = self._repo()
        if repo.head.is_detached:
            return repo.head.commit.hexsha
        return repo.active_branch.name

    def open_prs(self) -> list[dict]:
        """Shells out: gh pr list … Returns list of PR dicts.  Empty on failure."""
        try:
            result = subprocess.run(
                [
                    "gh",
                    "pr",
                    "list",
                    "--json",
                    "number,title,headRefName,state,url,createdAt",
                ],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                return []
            return json.loads(result.stdout) or []
        except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
            return []

    def diff(self, base: str, head: str) -> str:
        """Returns unified diff string between two refs."""
        repo = self._repo()
        try:
            return repo.git.diff(base, head)
        except git.GitCommandError as exc:
            return f"Error computing diff: {exc}"

    def commits(self, branch: str, n: int = 20) -> list[dict]:
        """Returns last *n* commits on *branch*: [{sha, message, author, date}]."""
        repo = self._repo()
        try:
            commits_iter = repo.iter_commits(branch, max_count=n)
        except git.GitCommandError:
            return []
        result: list[dict] = []
        for commit in commits_iter:
            result.append(
                {
                    "sha": commit.hexsha,
                    "message": commit.message.strip(),
                    "author": str(commit.author),
                    "date": commit.committed_datetime.isoformat(),
                }
            )
        return result

    def checkout(self, branch: str) -> None:
        """git checkout <branch>."""
        repo = self._repo()
        repo.git.checkout(branch)

    def file_history(self, path: str, n: int = 10) -> list[dict]:
        """Returns last *n* commits that touched *path*."""
        repo = self._repo()
        try:
            commits_iter = repo.iter_commits(repo.active_branch.name, paths=path, max_count=n)
        except git.GitCommandError:
            return []
        result: list[dict] = []
        for commit in commits_iter:
            result.append(
                {
                    "sha": commit.hexsha,
                    "message": commit.message.strip(),
                    "author": str(commit.author),
                    "date": commit.committed_datetime.isoformat(),
                }
            )
        return result


git_service = GitService()
