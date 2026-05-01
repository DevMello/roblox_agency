"""Process manager — launch scripts, stream logs into ring buffer, broadcast to WS hub."""
from __future__ import annotations

import collections
import subprocess
import threading
from datetime import datetime, timezone
from typing import Optional


class ManagedProcess:
    """Holds everything we track about one launched process."""

    def __init__(
        self,
        run_id: str,
        process: subprocess.Popen,
        log_buffer: collections.deque,
    ) -> None:
        self.run_id: str = run_id
        self.pid: int = process.pid
        self.process: subprocess.Popen = process
        self.log_buffer: collections.deque = log_buffer
        self.is_alive: bool = True


class ProcessManager:
    """Manages a pool of subprocesses with ring-buffered log capture."""

    def __init__(self) -> None:
        self._processes: dict[str, ManagedProcess] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _stream_output(self, mp: ManagedProcess) -> None:
        """Background daemon thread: read lines, buffer, broadcast."""
        try:
            assert mp.process.stdout is not None
            for raw_line in mp.process.stdout:
                line = raw_line.rstrip("\n\r")
                ts = datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]
                buffered = f"[{ts}] {line}"
                mp.log_buffer.append(buffered)

                # Lazy import to avoid circular reference; ignore if ws not ready.
                try:
                    from webui.server.routes.ws import ws_hub  # type: ignore[attr-defined]

                    ws_hub.broadcast(
                        {"type": "run.log", "run_id": mp.run_id, "line": buffered}
                    )
                except (ImportError, AttributeError):
                    pass
        finally:
            mp.process.wait()
            mp.is_alive = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def launch(
        self,
        script: str,
        args: list[str],
        run_id: str,
        cwd: Optional[str] = None,
    ) -> ManagedProcess:
        """Launch *script* with *args*.  Returns immediately; logging is async."""
        log_buffer: collections.deque = collections.deque(maxlen=2000)

        process = subprocess.Popen(
            [script, *args],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=cwd,
        )

        mp = ManagedProcess(run_id=run_id, process=process, log_buffer=log_buffer)

        with self._lock:
            self._processes[run_id] = mp

        thread = threading.Thread(
            target=self._stream_output,
            args=(mp,),
            daemon=True,
            name=f"proc-stream-{run_id}",
        )
        thread.start()

        return mp

    def kill(self, run_id: str) -> bool:
        """SIGTERM the process.  Returns True if it was running."""
        with self._lock:
            mp = self._processes.get(run_id)
        if mp is None or not mp.is_alive:
            return False
        try:
            mp.process.terminate()
        except OSError:
            pass
        return True

    def is_running(self, run_id: str) -> bool:
        """Returns True if the process is still alive."""
        with self._lock:
            mp = self._processes.get(run_id)
        if mp is None:
            return False
        return mp.is_alive

    def tail(self, run_id: str, n: int = 100) -> list[str]:
        """Returns last *n* lines from the ring buffer."""
        with self._lock:
            mp = self._processes.get(run_id)
        if mp is None:
            return []
        buf = list(mp.log_buffer)
        return buf[-n:]

    def get_all_logs(self, run_id: str) -> list[str]:
        """Returns all buffered log lines (up to 2000)."""
        with self._lock:
            mp = self._processes.get(run_id)
        if mp is None:
            return []
        return list(mp.log_buffer)

    def shutdown(self) -> None:
        """Called on server shutdown — terminate all managed processes."""
        with self._lock:
            run_ids = list(self._processes.keys())
        for run_id in run_ids:
            self.kill(run_id)

    def list_runs(self) -> list[dict]:
        """Returns [{run_id, pid, is_alive, line_count}] for all tracked processes."""
        with self._lock:
            snapshot = list(self._processes.values())
        return [
            {
                "run_id": mp.run_id,
                "pid": mp.pid,
                "is_alive": mp.is_alive,
                "line_count": len(mp.log_buffer),
            }
            for mp in snapshot
        ]


process_manager = ProcessManager()
