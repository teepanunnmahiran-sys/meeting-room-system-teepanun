from datetime import datetime, timedelta, time
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.room import Room
from app.models.booking import Booking
from app.schemas.booking import AlternativeRoom, AlternativeSlot

ACTIVE_BOOKING_STATUSES = ["pending", "approved", "reserved"]

def check_room_conflict(
    db: Session,
    room_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_booking_id: Optional[int] = None
) -> Optional[Booking]:
    """
    Returns conflicting booking if one exists.
    Overlap condition: (Booking.start_time < end_time) AND (Booking.end_time > start_time)
    """
    query = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        Booking.start_time < end_time,
        Booking.end_time > start_time
    )
    if exclude_booking_id:
        query = query.filter(Booking.id != exclude_booking_id)

    return query.first()

def find_alternative_rooms(
    db: Session,
    start_time: datetime,
    end_time: datetime,
    attendees_count: int,
    exclude_room_id: int
) -> List[AlternativeRoom]:
    """
    Finds other available rooms that fit the attendees during the specified time.
    """
    # Find all active rooms except the current one with adequate capacity
    candidate_rooms = db.query(Room).filter(
        Room.id != exclude_room_id,
        Room.is_active == True,
        Room.status != "maintenance",
        Room.capacity >= attendees_count
    ).order_by(Room.capacity.asc()).all()

    available_rooms: List[AlternativeRoom] = []
    for room in candidate_rooms:
        conflict = check_room_conflict(db, room.id, start_time, end_time)
        if not conflict:
            available_rooms.append(AlternativeRoom(
                id=room.id,
                name=room.name,
                code=room.code,
                building=room.building,
                floor=room.floor,
                capacity=room.capacity,
                image_url=room.image_url
            ))
            if len(available_rooms) >= 3:
                break

    return available_rooms

def find_alternative_slots(
    db: Session,
    room_id: int,
    target_date: datetime.date,
    duration: timedelta,
    exclude_booking_id: Optional[int] = None
) -> List[AlternativeSlot]:
    """
    Scans working hours (08:00 to 18:00) on target_date for available slots.
    """
    slots: List[AlternativeSlot] = []
    work_start = datetime.combine(target_date, time(8, 0))
    work_end = datetime.combine(target_date, time(18, 0))
    current_slot_start = work_start

    step = timedelta(minutes=30)
    now = datetime.utcnow()

    while current_slot_start + duration <= work_end:
        current_slot_end = current_slot_start + duration
        if current_slot_start > now:
            conflict = check_room_conflict(db, room_id, current_slot_start, current_slot_end, exclude_booking_id)
            if not conflict:
                slots.append(AlternativeSlot(
                    start_time=current_slot_start,
                    end_time=current_slot_end,
                    label=f"{current_slot_start.strftime('%H:%M')} - {current_slot_end.strftime('%H:%M')}"
                ))
                if len(slots) >= 4:
                    break
        current_slot_start += step

    return slots

def validate_booking_request(
    db: Session,
    room_id: int,
    start_time: datetime,
    end_time: datetime,
    attendees_count: int,
    exclude_booking_id: Optional[int] = None
) -> Tuple[bool, str, Optional[str], List[AlternativeRoom], List[AlternativeSlot]]:
    """
    Validates room status, time validity, capacity, and overlap.
    Returns: (is_valid, message, conflict_reason, alternative_rooms, alternative_slots)
    """
    if start_time >= end_time:
        return False, "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น", "invalid_time", [], []

    if start_time < datetime.utcnow() - timedelta(minutes=15):
        return False, "ไม่สามารถจองเวลาย้อนหลังได้", "past_time", [], []

    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        return False, "ไม่พบข้อมูลห้องประชุม หรือห้องถูกปิดการใช้งาน", "room_not_found", [], []

    if room.status == "maintenance":
        alt_rooms = find_alternative_rooms(db, start_time, end_time, attendees_count, room_id)
        return False, f"ห้องประชุม '{room.name}' อยู่ระหว่างปิดปรับปรุง (Maintenance)", "maintenance", alt_rooms, []

    if attendees_count > room.capacity:
        alt_rooms = find_alternative_rooms(db, start_time, end_time, attendees_count, room_id)
        return False, f"จำนวนผู้เข้าร่วม ({attendees_count} คน) เกินความจุของห้อง ({room.capacity} ที่นั่ง)", "capacity", alt_rooms, []

    conflict = check_room_conflict(db, room_id, start_time, end_time, exclude_booking_id)
    if conflict:
        alt_rooms = find_alternative_rooms(db, start_time, end_time, attendees_count, room_id)
        alt_slots = find_alternative_slots(db, room_id, start_time.date(), end_time - start_time, exclude_booking_id)
        return False, f"ไม่สามารถจองห้องนี้ได้ เนื่องจากมีการจองในช่วงเวลาดังกล่าว ({conflict.start_time.strftime('%H:%M')} - {conflict.end_time.strftime('%H:%M')})", "overlap", alt_rooms, alt_slots

    return True, "ห้องประชุมว่างและสามารถทำการจองได้", None, [], []
