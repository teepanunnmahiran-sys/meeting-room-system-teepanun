from datetime import datetime, date, time, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from app.database import get_db
from app.models.room import Room
from app.models.booking import Booking
from app.models.user import User
from app.api.rooms import calculate_live_room_status
from app.schemas.booking import BookingOut
from app.api.bookings import format_booking_out

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    today_start = datetime.combine(now.date(), time(0, 0, 0))
    today_end = datetime.combine(now.date(), time(23, 59, 59))

    # Start of this week (Monday)
    week_start = today_start - timedelta(days=now.weekday())
    # Start of this month
    month_start = datetime(now.year, now.month, 1)

    # Rooms count
    all_rooms = db.query(Room).filter(Room.is_active == True).all()
    total_rooms = len(all_rooms)

    # Dynamic status count
    status_counts = {"available": 0, "occupied": 0, "reserved": 0, "maintenance": 0}
    for r in all_rooms:
        st = calculate_live_room_status(db, r)
        status_counts[st] = status_counts.get(st, 0) + 1

    # Bookings stats
    today_bookings_count = db.query(Booking).filter(
        Booking.status.in_(["pending", "approved", "completed"]),
        Booking.start_time >= today_start,
        Booking.start_time <= today_end
    ).count()

    week_bookings_count = db.query(Booking).filter(
        Booking.status.in_(["pending", "approved", "completed"]),
        Booking.start_time >= week_start
    ).count()

    month_bookings_count = db.query(Booking).filter(
        Booking.status.in_(["pending", "approved", "completed"]),
        Booking.start_time >= month_start
    ).count()

    pending_approvals_count = db.query(Booking).filter(
        Booking.status == "pending"
    ).count()

    # Most used room
    most_used_record = db.query(
        Booking.room_id, func.count(Booking.id).label("booking_count")
    ).filter(
        Booking.status.in_(["approved", "completed"])
    ).group_by(Booking.room_id).order_by(desc("booking_count")).first()

    most_used_room_info = None
    if most_used_record:
        r = db.query(Room).filter(Room.id == most_used_record.room_id).first()
        if r:
            most_used_room_info = {
                "id": r.id,
                "name": r.name,
                "code": r.code,
                "count": most_used_record.booking_count
            }

    return {
        "total_rooms": total_rooms,
        "available_rooms": status_counts["available"],
        "occupied_rooms": status_counts["occupied"],
        "reserved_rooms": status_counts["reserved"],
        "maintenance_rooms": status_counts["maintenance"],
        "today_bookings": today_bookings_count,
        "week_bookings": week_bookings_count,
        "month_bookings": month_bookings_count,
        "pending_approvals": pending_approvals_count,
        "most_used_room": most_used_room_info
    }

@router.get("/charts")
def get_dashboard_charts(db: Session = Depends(get_db)):
    now = datetime.utcnow()

    # 1. Daily booking count for last 14 days
    daily_labels = []
    daily_counts = []
    for i in range(13, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day, time(0, 0, 0))
        day_end = datetime.combine(day, time(23, 59, 59))
        cnt = db.query(Booking).filter(
            Booking.status.in_(["approved", "pending", "completed"]),
            Booking.start_time >= day_start,
            Booking.start_time <= day_end
        ).count()
        daily_labels.append(day.strftime("%d/%m"))
        daily_counts.append(cnt)

    # 2. Room usage breakdown (Bookings per room)
    rooms = db.query(Room).filter(Room.is_active == True).all()
    room_labels = []
    room_booking_counts = []
    room_hours = []

    for r in rooms:
        b_list = db.query(Booking).filter(
            Booking.room_id == r.id,
            Booking.status.in_(["approved", "completed"])
        ).all()
        room_labels.append(r.name)
        room_booking_counts.append(len(b_list))
        total_secs = sum((b.end_time - b.start_time).total_seconds() for b in b_list)
        room_hours.append(round(total_secs / 3600.0, 1))

    # 3. Monthly stats for the current year (12 months)
    monthly_labels = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
    monthly_counts = [0] * 12
    current_year = now.year

    year_bookings = db.query(Booking).filter(
        Booking.status.in_(["approved", "completed"]),
        func.strftime("%Y", Booking.start_time) == str(current_year)
    ).all()

    for b in year_bookings:
        m_idx = b.start_time.month - 1
        if 0 <= m_idx < 12:
            monthly_counts[m_idx] += 1

    # 4. Utilization rate calculation (Percentage of working hours 08:00-18:00 used this month)
    total_work_hours_per_room = 22 * 10  # ~22 working days * 10 hours = 220 hours
    utilization_data = []
    for r, h in zip(rooms, room_hours):
        rate = round((h / total_work_hours_per_room) * 100, 1) if total_work_hours_per_room > 0 else 0
        utilization_data.append({
            "room_name": r.name,
            "rate": min(rate, 100.0),
            "hours": h
        })

    return {
        "daily_trends": {
            "labels": daily_labels,
            "data": daily_counts
        },
        "room_usage": {
            "labels": room_labels,
            "counts": room_booking_counts,
            "hours": room_hours
        },
        "monthly_trends": {
            "labels": monthly_labels,
            "data": monthly_counts
        },
        "utilization_rate": utilization_data
    }

@router.get("/upcoming", response_model=List[BookingOut])
def get_upcoming_meetings(limit: int = 5, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    bookings = db.query(Booking).filter(
        Booking.status.in_(["approved", "pending"]),
        Booking.end_time >= now
    ).order_by(Booking.start_time.asc()).limit(limit).all()

    return [format_booking_out(b) for b in bookings]

@router.get("/recent", response_model=List[BookingOut])
def get_recent_bookings(limit: int = 5, db: Session = Depends(get_db)):
    bookings = db.query(Booking).order_by(Booking.created_at.desc()).limit(limit).all()
    return [format_booking_out(b) for b in bookings]
