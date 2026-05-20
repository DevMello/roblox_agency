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
        from server import config as cfg

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

    def log_with_files(self, branch: str = "main", n: int = 40) -> list[dict]:
        """Returns last *n* commits with the list of files each commit touched."""
        from server import config as cfg
        try:
            result = subprocess.run(
                ["git", "log", branch, f"-{n}",
                 "--pretty=format:COMMIT|%H|%s|%an|%ai",
                 "--name-only"],
                capture_output=True, text=True, cwd=str(cfg.REPO_ROOT), timeout=15,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return []
        if result.returncode != 0:
            return []

        commits: list[dict] = []
        current: dict[str, Any] | None = None
        for line in result.stdout.splitlines():
            if line.startswith("COMMIT|"):
                if current:
                    commits.append(current)
                _, sha, msg, author, date = line.split("|", 4)
                current = {"sha": sha, "message": msg, "author": author, "date": date, "files": []}
            elif line.strip() and current is not None:
                current["files"].append(line.strip())
        if current:
            commits.append(current)
        return commits

    def tree(self, ref: str = "HEAD") -> list[dict]:
        """Returns all tracked files at *ref* as [{path, size, mode}]."""
        from server import config as cfg
        try:
            result = subprocess.run(
                ["git", "ls-tree", "-r", "--long", ref],
                capture_output=True, text=True, cwd=str(cfg.REPO_ROOT), timeout=15,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return []
        if result.returncode != 0:
            return []

        items: list[dict] = []
        for line in result.stdout.splitlines():
            # format: <mode> SP <type> SP <sha> SP <size> TAB <path>
            parts = line.split("\t", 1)
            if len(parts) != 2:
                continue
            meta, path = parts
            meta_parts = meta.split()
            size = int(meta_parts[3]) if meta_parts[3].isdigit() else 0
            items.append({"path": path, "size": size})
        return items


git_service = GitService()
