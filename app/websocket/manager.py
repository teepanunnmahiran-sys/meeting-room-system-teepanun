import json
from typing import Dict, List, Any
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Anonymous or general broadcast connections
        self.broadcast_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, user_id: int = None):
        await websocket.accept()
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
        else:
            self.broadcast_connections.append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int = None):
        if user_id and user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        if websocket in self.broadcast_connections:
            self.broadcast_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: Any):
        payload = json.dumps({"type": event_type, "data": data}, default=str)
        # Send to all users
        all_sockets: List[WebSocket] = list(self.broadcast_connections)
        for user_sockets in self.active_connections.values():
            all_sockets.extend(user_sockets)

        for connection in all_sockets:
            try:
                await connection.send_text(payload)
            except Exception:
                pass

    async def send_personal_message(self, user_id: int, event_type: str, data: Any):
        if user_id in self.active_connections:
            payload = json.dumps({"type": event_type, "data": data}, default=str)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    pass

ws_manager = ConnectionManager()
