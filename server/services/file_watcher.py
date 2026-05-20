from pathlib import Path


class RepoWatcher:
    def __init__(self):
        self._observer = None

    def start(self):
        try:
            from watchdog.observers import Observer
            from watchdog.events import FileSystemEventHandler
            from webui.server import config as cfg

            class Handler(FileSystemEventHandler):
                def on_modified(self, event):
                    if event.is_directory: return
                    try:
                        from webui.server.routes.ws import ws_hub
                        rel = Path(event.src_path).relative_to(cfg.REPO_ROOT).as_posix()
                        # Ignore .git and webui/server/db changes
                        if '.git' in rel or rel.startswith('webui/server/db'):
                            return
                        ws_hub.broadcast_sync({"type": "file.changed", "path": rel})
                    except Exception:
                        pass

            self._observer = Observer()
            self._observer.schedule(Handler(), str(cfg.REPO_ROOT), recursive=True)
            self._observer.start()
        except ImportError:
            pass  # watchdog not installed

    def stop(self):
        if self._observer:
            try:
                self._observer.stop()
                self._observer.join(timeout=2)
            except Exception:
                pass


repo_watcher = RepoWatcher()
