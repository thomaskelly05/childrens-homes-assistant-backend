from __future__ import annotations

import asyncio
import datetime
import json
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

router = APIRouter(tags=['IndiCare Connect Realtime'])


class ConnectRealtimeHub:
    def __init__(self) -> None:
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self.socket_rooms: dict[WebSocket, set[str]] = defaultdict(set)
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, rooms: list[str]) -> None:
        await websocket.accept()
        async with self.lock:
            for room in rooms:
                normalised = self.normalise_room(room)
                self.rooms[normalised].add(websocket)
                self.socket_rooms[websocket].add(normalised)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self.lock:
            rooms = self.socket_rooms.pop(websocket, set())
            for room in rooms:
                sockets = self.rooms.get(room)
                if sockets:
                    sockets.discard(websocket)
                    if not sockets:
                        self.rooms.pop(room, None)

    async def subscribe(self, websocket: WebSocket, room: str) -> None:
        normalised = self.normalise_room(room)
        async with self.lock:
            self.rooms[normalised].add(websocket)
            self.socket_rooms[websocket].add(normalised)
        await self.send(websocket, {'type': 'subscription.added', 'room': normalised})

    async def unsubscribe(self, websocket: WebSocket, room: str) -> None:
        normalised = self.normalise_room(room)
        async with self.lock:
            self.rooms.get(normalised, set()).discard(websocket)
            self.socket_rooms.get(websocket, set()).discard(normalised)
        await self.send(websocket, {'type': 'subscription.removed', 'room': normalised})

    async def broadcast(self, room: str, event: dict[str, Any]) -> None:
        normalised = self.normalise_room(room)
        payload = json.dumps({**event, 'room': normalised, 'sent_at': datetime.datetime.utcnow().isoformat() + 'Z'}, default=str)
        async with self.lock:
            sockets = list(self.rooms.get(normalised, set()))
        dead: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_text(payload)
            except Exception:
                dead.append(socket)
        for socket in dead:
            await self.disconnect(socket)

    async def send(self, websocket: WebSocket, event: dict[str, Any]) -> None:
        await websocket.send_text(json.dumps({**event, 'sent_at': datetime.datetime.utcnow().isoformat() + 'Z'}, default=str))

    @staticmethod
    def normalise_room(room: str) -> str:
        return str(room or '').strip().lower().replace(' ', '')


hub = ConnectRealtimeHub()


def default_rooms(home_id: int | None, user_id: int | None, staff_id: int | None, young_person_id: int | None, channel_id: str | None) -> list[str]:
    rooms = ['global:connect']
    if home_id is not None:
        rooms.extend([f'home:{home_id}', f'safeguarding:{home_id}'])
    if user_id is not None:
        rooms.append(f'user:{user_id}')
    if staff_id is not None:
        rooms.append(f'staff:{staff_id}')
    if young_person_id is not None:
        rooms.append(f'child:{young_person_id}')
    if channel_id:
        rooms.append(f'channel:{channel_id}')
    return rooms


@router.websocket('/ws/connect')
async def connect_websocket(
    websocket: WebSocket,
    home_id: int | None = Query(default=None),
    user_id: int | None = Query(default=None),
    staff_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    channel_id: str | None = Query(default=None),
):
    rooms = default_rooms(home_id, user_id, staff_id, young_person_id, channel_id)
    await hub.connect(websocket, rooms)
    await hub.send(websocket, {'type': 'connect.ready', 'rooms': rooms})
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                await hub.send(websocket, {'type': 'error', 'message': 'Invalid JSON event'})
                continue

            event_type = event.get('type')
            if event_type == 'subscribe':
                await hub.subscribe(websocket, str(event.get('room', '')))
            elif event_type == 'unsubscribe':
                await hub.unsubscribe(websocket, str(event.get('room', '')))
            elif event_type == 'typing':
                room = event.get('room') or (f"channel:{event.get('channel_id')}" if event.get('channel_id') else None)
                if room:
                    await hub.broadcast(str(room), {'type': 'typing', 'user_id': user_id, 'staff_id': staff_id, 'channel_id': event.get('channel_id')})
            elif event_type == 'presence.update':
                target_rooms = [f'user:{user_id}' if user_id else None, f'home:{home_id}' if home_id else None]
                for room in [r for r in target_rooms if r]:
                    await hub.broadcast(room, {'type': 'presence.updated', 'user_id': user_id, 'staff_id': staff_id, 'status': event.get('status'), 'status_message': event.get('status_message')})
            elif event_type == 'call.ringing':
                for room in event.get('rooms') or []:
                    await hub.broadcast(str(room), {'type': 'call.ringing', 'call_id': event.get('call_id'), 'title': event.get('title'), 'from_user_id': user_id})
            elif event_type == 'calendar.reminder':
                room = event.get('room') or (f'home:{home_id}' if home_id else 'global:connect')
                await hub.broadcast(str(room), {'type': 'calendar.reminder', 'event_id': event.get('event_id'), 'title': event.get('title'), 'starts_at': event.get('starts_at')})
            elif event_type == 'safeguarding.alert':
                room = event.get('room') or (f'safeguarding:{home_id}' if home_id else 'global:connect')
                await hub.broadcast(str(room), {'type': 'safeguarding.alert', 'record_id': event.get('record_id'), 'priority': event.get('priority', 'high'), 'message': event.get('message')})
            else:
                await hub.send(websocket, {'type': 'error', 'message': f'Unsupported event type: {event_type}'})
    except WebSocketDisconnect:
        await hub.disconnect(websocket)
    except Exception:
        await hub.disconnect(websocket)


@router.get('/api/connect/realtime/health')
async def realtime_health() -> dict[str, Any]:
    return {
        'status': 'ok',
        'rooms': {room: len(sockets) for room, sockets in hub.rooms.items()},
        'connections': len(hub.socket_rooms),
    }
