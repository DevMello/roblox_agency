"""Repo service stub — full implementation provided by backend-svc-repo worker."""
from __future__ import annotations

from typing import Any


class _RepoWatcher:
    def start(self) -> None:
        pass

    def stop(self) -> None:
        pass


class _RepoService:
    """Stub repo service — methods raise NotImplementedError until fully implemented."""

    def read_file(self, path: str) -> str:
        raise NotImplementedError("repo_service not yet implemented")

    def write_file(self, path: str, content: str) -> None:
        raise NotImplementedError("repo_service not yet implemented")

    def append_to_file(self, path: str, text: str) -> None:
        raise NotImplementedError("repo_service not yet implemented")

    def list_dir(self, path: str) -> list[dict[str, Any]]:
        raise NotImplementedError("repo_service not yet implemented")

    def game_names(self) -> list[str]:
        raise NotImplementedError("repo_service not yet implemented")

    def game_state(self, name: str) -> dict[str, Any]:
        raise NotImplementedError("repo_service not yet implemented")

    def append_override(self, game: str, text: str) -> None:
        raise NotImplementedError("repo_service not yet implemented")

    def resolve_blockers(self, game: str, blocker_ids: list[str]) -> None:
        raise NotImplementedError("repo_service not yet implemented")

    def spec_path(self, game: str) -> str:
        raise NotImplementedError("repo_service not yet implemented")


repo_service = _RepoService()
repo_watcher = _RepoWatcher()
