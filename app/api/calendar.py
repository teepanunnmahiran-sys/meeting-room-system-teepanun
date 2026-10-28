from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.booking import Booking
from app.models.room import Room

router = APIRouter(prefix="/calendar", tags=["Calendar"])

STATUS_COLORS = {
    "approved": "#2563EB",   # Blue
    "pending": "#F59E0B",    # Amber
    "completed": "#64748B",  # Slate
    "rejected": "#EF4444",   # Red
    "cancelled": "#94A3B8"   # Gray
}

@router.get("/events")
def get_calendar_events(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    room_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Booking).join(Room)

    if start:
        query = query.filter(Booking.end_time >= start)
    if end:
        query = query.filter(Booking.start_time <= end)
    if room_id:
        query = query.filter(Booking.room_id == room_id)
    if status_filter:
        query = query.filter(Booking.status == status_filter)
    else:
        # By default exclude cancelled bookings from general calendar view unless requested
        query = query.filter(Booking.status.in_(["approved", "pending", "completed"]))

    bookings = query.all()

    events = []
    for b in bookings:
        color = STATUS_COLORS.get(b.status, "#2563EB")
        events.append({
            "id": str(b.id),
            "title": f"[{b.room.name}] {b.title}",
            "start": b.start_time.isoformat(),
            "end": b.end_time.isoformat(),
            "backgroundColor": color,
            "borderColor": color,
            "textColor": "#FFFFFF",
            "extendedProps": {
                "booking_code": b.booking_code,
                "room_id": b.room_id,
                "room_name": b.room.name,
                "room_code": b.room.code,
                "building": b.room.building,
                "floor": b.room.floor,
                "user_id": b.user_id,
                "user_name": b.user.name if b.user else "ผู้ใช้งาน",
                "organizer_name": b.organizer_name,
                "attendees_count": b.attendees_count,
                "description": b.description,
                "status": b.status
            }
        })

    return events
