from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio, json, logging

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)

class WSHub:
    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._connections.append(ws)

    def _remove(self, ws: WebSocket):
        try: self._connections.remove(ws)
        except ValueError: pass

    async def broadcast(self, event: dict):
        message = json.dumps(event)
        dead = []
        for ws in list(self._connections):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._remove(ws)

    def broadcast_sync(self, event: dict):
        """Call from sync thread (watchdog, process manager)."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(event), loop)
        except Exception:
            pass

    @property
    def connection_count(self):
        return len(self._connections)

ws_hub = WSHub()

@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_hub.connect(ws)
    try:
        await ws.send_text(json.dumps({"type": "connected", "status": "ok"}))
        while True:
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                if data == "ping":
                    await ws.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                # Send keepalive ping
                await ws.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.debug(f"WS error: {e}")
    finally:
        ws_hub._remove(ws)
