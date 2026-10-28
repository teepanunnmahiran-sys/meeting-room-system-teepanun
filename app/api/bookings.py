import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.room import Room, Equipment
from app.models.booking import Booking, BookingParticipant, BookingEquipment
from app.models.user import User, Role
from app.schemas.booking import (
    BookingOut, BookingCreate, BookingUpdate, BookingConflictCheckRequest,
    BookingConflictCheckResponse, BookingStatusAction, ParticipantOut
)
from app.services.auth_service import get_current_user, require_roles
from app.services.booking_service import (
    validate_booking_request, check_room_conflict
)
from app.services.notification_service import create_notification, notify_admins_and_managers
from app.services.audit_service import log_activity
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/bookings", tags=["Bookings"])

def generate_booking_code() -> str:
    return f"BK-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

def format_booking_out(b: Booking) -> BookingOut:
    participants = [
        ParticipantOut(id=p.id, name=p.name, email=p.email, role=p.role)
        for p in b.participants
    ]
    equipment_names = [be.equipment.name for be in b.requested_equipment if be.equipment]
    return BookingOut(
        id=b.id,
        booking_code=b.booking_code,
        room_id=b.room_id,
        room_name=b.room.name if b.room else "ห้องที่ถูกลบ",
        room_code=b.room.code if b.room else "N/A",
        room_image=b.room.image_url if b.room else None,
        building=b.room.building if b.room else "",
        floor=b.room.floor if b.room else "",
        user_id=b.user_id,
        user_name=b.user.name if b.user else "ผู้ใช้งาน",
        title=b.title,
        description=b.description,
        start_time=b.start_time,
        end_time=b.end_time,
        attendees_count=b.attendees_count,
        organizer_name=b.organizer_name,
        organizer_contact=b.organizer_contact,
        status=b.status,
        rejection_reason=b.rejection_reason,
        approved_by_name=b.approver.name if b.approver else None,
        approved_at=b.approved_at,
        participants=participants,
        equipment_names=equipment_names,
        created_at=b.created_at,
        updated_at=b.updated_at
    )

@router.post("/check-conflict", response_model=BookingConflictCheckResponse)
def check_conflict_api(
    data: BookingConflictCheckRequest,
    db: Session = Depends(get_db)
):
    is_valid, msg, reason, alt_rooms, alt_slots = validate_booking_request(
        db=db,
        room_id=data.room_id,
        start_time=data.start_time,
        end_time=data.end_time,
        attendees_count=data.attendees_count,
        exclude_booking_id=data.exclude_booking_id
    )
    return BookingConflictCheckResponse(
        is_available=is_valid,
        message=msg,
        conflict_reason=reason,
        alternative_rooms=alt_rooms,
        alternative_slots=alt_slots
    )

@router.get("", response_model=List[BookingOut])
def get_bookings(
    room_id: Optional[int] = None,
    user_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Booking)

    # Regular users can view their own bookings or public approved bookings for calendar
    user_role = current_user.role.name.lower()

    if user_id:
        query = query.filter(Booking.user_id == user_id)
    elif user_role == "user" and not room_id and not start_date:
        # If regular user asks for generic bookings list, default to own bookings
        query = query.filter(Booking.user_id == current_user.id)

    if room_id:
        query = query.filter(Booking.room_id == room_id)

    if status_filter:
        query = query.filter(Booking.status == status_filter)

    if start_date:
        query = query.filter(Booking.end_time >= start_date)

    if end_date:
        query = query.filter(Booking.start_time <= end_date)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Booking.title.ilike(s),
                Booking.booking_code.ilike(s),
                Booking.organizer_name.ilike(s)
            )
        )

    bookings = query.order_by(Booking.start_time.desc()).limit(limit).all()
    return [format_booking_out(b) for b in bookings]

@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลการจองนี้")

    return format_booking_out(booking)

@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate conflict and capacity
    is_valid, msg, reason, alt_rooms, alt_slots = validate_booking_request(
        db=db,
        room_id=data.room_id,
        start_time=data.start_time,
        end_time=data.end_time,
        attendees_count=data.attendees_count
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": msg,
                "conflict_reason": reason,
                "alternative_rooms": [r.model_dump() for r in alt_rooms],
                "alternative_slots": [s.model_dump() for s in alt_slots]
            }
        )

    # Initial status: Staff / Admin bookings are automatically approved, normal users start as pending
    user_role = current_user.role.name.lower()
    initial_status = "approved" if user_role in ["admin", "manager"] else "pending"

    new_booking = Booking(
        booking_code=generate_booking_code(),
        room_id=data.room_id,
        user_id=current_user.id,
        title=data.title.strip(),
        description=data.description,
        start_time=data.start_time,
        end_time=data.end_time,
        attendees_count=data.attendees_count,
        organizer_name=data.organizer_name.strip(),
        organizer_contact=data.organizer_contact,
        status=initial_status,
        approved_by_id=current_user.id if initial_status == "approved" else None,
        approved_at=datetime.utcnow() if initial_status == "approved" else None
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # Add participants
    for p in data.participants:
        db.add(BookingParticipant(
            booking_id=new_booking.id,
            name=p.name.strip(),
            email=p.email.strip(),
            role=p.role
        ))

    # Add requested equipment
    for eq_id in data.equipment_ids:
        eq = db.query(Equipment).filter(Equipment.id == eq_id).first()
        if eq:
            db.add(BookingEquipment(booking_id=new_booking.id, equipment_id=eq.id))

    db.commit()
    db.refresh(new_booking)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "CREATE_BOOKING", "booking", str(new_booking.id), f"Booking created {new_booking.booking_code} for {new_booking.title}", client_ip)

    # Send Notification to Admins / Managers
    room = db.query(Room).filter(Room.id == data.room_id).first()
    room_name = room.name if room else "ห้องประชุม"

    await notify_admins_and_managers(
        db=db,
        title="มีการจองห้องประชุมใหม่",
        message=f"{current_user.name} ได้ทำการจองห้อง '{room_name}' หัวข้อ '{new_booking.title}' เวลา {new_booking.start_time.strftime('%d/%m/%Y %H:%M')}",
        notification_type="booking_created",
        link=f"/bookings/{new_booking.id}"
    )

    # Real-time WebSocket Broadcast
    await ws_manager.broadcast("BOOKING_CREATED", {
        "booking_id": new_booking.id,
        "booking_code": new_booking.booking_code,
        "room_id": new_booking.room_id,
        "room_name": room_name,
        "title": new_booking.title,
        "start_time": new_booking.start_time.isoformat(),
        "end_time": new_booking.end_time.isoformat(),
        "status": new_booking.status,
        "user_name": current_user.name
    })

    return format_booking_out(new_booking)

@router.put("/{booking_id}", response_model=BookingOut)
async def update_booking(
    booking_id: int,
    data: BookingUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลการจองนี้")

    user_role = current_user.role.name.lower()
    # Check permission: only owner or admin/manager
    if booking.user_id != current_user.id and user_role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์แก้ไขการจองของผู้อื่น")

    if booking.status in ["cancelled", "rejected"]:
        raise HTTPException(status_code=400, detail="ไม่สามารถแก้ไขการจองที่ถูกยกเลิกหรือถูกปฏิเสธแล้ว")

    # If time, room or attendees changed, validate conflict
    new_room_id = data.room_id if data.room_id is not None else booking.room_id
    new_start = data.start_time if data.start_time is not None else booking.start_time
    new_end = data.end_time if data.end_time is not None else booking.end_time
    new_attendees = data.attendees_count if data.attendees_count is not None else booking.attendees_count

    if (data.room_id is not None or data.start_time is not None or data.end_time is not None or data.attendees_count is not None):
        is_valid, msg, reason, alt_rooms, alt_slots = validate_booking_request(
            db=db,
            room_id=new_room_id,
            start_time=new_start,
            end_time=new_end,
            attendees_count=new_attendees,
            exclude_booking_id=booking.id
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"message": msg, "conflict_reason": reason}
            )

    if data.room_id is not None: booking.room_id = data.room_id
    if data.title is not None: booking.title = data.title.strip()
    if data.description is not None: booking.description = data.description
    if data.start_time is not None: booking.start_time = data.start_time
    if data.end_time is not None: booking.end_time = data.end_time
    if data.attendees_count is not None: booking.attendees_count = data.attendees_count
    if data.organizer_name is not None: booking.organizer_name = data.organizer_name.strip()
    if data.organizer_contact is not None: booking.organizer_contact = data.organizer_contact

    if data.equipment_ids is not None:
        db.query(BookingEquipment).filter(BookingEquipment.booking_id == booking.id).delete()
        for eq_id in data.equipment_ids:
            eq = db.query(Equipment).filter(Equipment.id == eq_id).first()
            if eq:
                db.add(BookingEquipment(booking_id=booking.id, equipment_id=eq.id))

    if data.participants is not None:
        db.query(BookingParticipant).filter(BookingParticipant.booking_id == booking.id).delete()
        for p in data.participants:
            db.add(BookingParticipant(
                booking_id=booking.id,
                name=p.name.strip(),
                email=p.email.strip(),
                role=p.role
            ))

    db.commit()
    db.refresh(booking)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "UPDATE_BOOKING", "booking", str(booking.id), f"Booking {booking.booking_code} updated", client_ip)

    await ws_manager.broadcast("BOOKING_UPDATED", {
        "booking_id": booking.id,
        "booking_code": booking.booking_code,
        "title": booking.title,
        "start_time": booking.start_time.isoformat(),
        "end_time": booking.end_time.isoformat(),
        "status": booking.status
    })

    return format_booking_out(booking)

@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    action_data: Optional[BookingStatusAction] = None,
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลการจองนี้")

    user_role = current_user.role.name.lower()
    if booking.user_id != current_user.id and user_role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ยกเลิกการจองนี้")

    if booking.status == "cancelled":
        return {"message": "การจองนี้ถูกยกเลิกแล้ว"}

    booking.status = "cancelled"
    booking.rejection_reason = action_data.reason if action_data and action_data.reason else "ผู้ใช้ขอยกเลิกการจอง"
    db.commit()
    db.refresh(booking)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "CANCEL_BOOKING", "booking", str(booking.id), f"Booking {booking.booking_code} cancelled", client_ip)

    # Notify booking owner if cancelled by staff/admin
    if booking.user_id != current_user.id:
        await create_notification(
            db=db,
            user_id=booking.user_id,
            title="การจองห้องประชุมถูกยกเลิก",
            message=f"การจอง '{booking.title}' ห้อง '{booking.room.name}' ถูกยกเลิกโดย {current_user.name} เหตุผล: {booking.rejection_reason}",
            notification_type="booking_cancelled",
            link=f"/bookings/{booking.id}"
        )

    await ws_manager.broadcast("BOOKING_CANCELLED", {
        "booking_id": booking.id,
        "booking_code": booking.booking_code,
        "room_id": booking.room_id,
        "title": booking.title
    })

    return {"message": "ยกเลิกการจองห้องประชุมเรียบร้อยแล้ว", "booking": format_booking_out(booking)}

@router.post("/{booking_id}/approve", response_model=BookingOut)
async def approve_booking(
    booking_id: int,
    request: Request,
    current_user: User = Depends(require_roles(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลการจองนี้")

    # Double check conflict before approving
    conflict = check_room_conflict(db, booking.room_id, booking.start_time, booking.end_time, exclude_booking_id=booking.id)
    if conflict:
        raise HTTPException(
            status_code=400,
            detail=f"ไม่สามารถอนุมัติได้ เนื่องจากห้องนี้ชนกับการจองอื่น ({conflict.title})"
        )

    booking.status = "approved"
    booking.approved_by_id = current_user.id
    booking.approved_at = datetime.utcnow()
    booking.rejection_reason = None
    db.commit()
    db.refresh(booking)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "APPROVE_BOOKING", "booking", str(booking.id), f"Approved booking {booking.booking_code}", client_ip)

    # Send Notification to user
    await create_notification(
        db=db,
        user_id=booking.user_id,
        title="การจองห้องประชุมของคุณได้รับการอนุมัติแล้ว",
        message=f"การจองห้อง '{booking.room.name}' หัวข้อ '{booking.title}' สำหรับวันที่ {booking.start_time.strftime('%d/%m/%Y %H:%M')} ได้รับการอนุมัติแล้ว",
        notification_type="booking_approved",
        link=f"/bookings/{booking.id}"
    )

    await ws_manager.broadcast("BOOKING_APPROVED", {
        "booking_id": booking.id,
        "booking_code": booking.booking_code,
        "room_id": booking.room_id,
        "title": booking.title,
        "status": "approved"
    })

    return format_booking_out(booking)

@router.post("/{booking_id}/reject", response_model=BookingOut)
async def reject_booking(
    booking_id: int,
    action_data: BookingStatusAction,
    request: Request,
    current_user: User = Depends(require_roles(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลการจองนี้")

    reason = action_data.reason.strip() if action_data and action_data.reason else "ไม่ผ่านการพิจารณา"

    booking.status = "rejected"
    booking.approved_by_id = current_user.id
    booking.approved_at = datetime.utcnow()
    booking.rejection_reason = reason
    db.commit()
    db.refresh(booking)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "REJECT_BOOKING", "booking", str(booking.id), f"Rejected booking {booking.booking_code}. Reason: {reason}", client_ip)

    # Send Notification to user
    await create_notification(
        db=db,
        user_id=booking.user_id,
        title="การจองห้องประชุมของคุณถูกปฏิเสธ",
        message=f"การจองห้อง '{booking.room.name}' หัวข้อ '{booking.title}' ถูกปฏิเสธ เนื่องจาก: {reason}",
        notification_type="booking_rejected",
        link=f"/bookings/{booking.id}"
    )

    await ws_manager.broadcast("BOOKING_REJECTED", {
        "booking_id": booking.id,
        "booking_code": booking.booking_code,
        "title": booking.title,
        "status": "rejected",
        "reason": reason
    })

    return format_booking_out(booking)
