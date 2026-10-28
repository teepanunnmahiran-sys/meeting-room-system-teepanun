from datetime import datetime, date, time, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.room import Room, Equipment, RoomEquipment
from app.models.booking import Booking
from app.models.user import User
from app.schemas.room import RoomOut, RoomCreate, RoomUpdate, RoomStatusUpdate, EquipmentOut
from app.services.auth_service import get_current_user, require_roles
from app.services.audit_service import log_activity
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/rooms", tags=["Meeting Rooms"])

def calculate_live_room_status(db: Session, room: Room) -> str:
    """
    Computes real-time dynamic room status:
    - If marked as 'maintenance', remains 'maintenance'
    - If an active meeting is in progress right now, becomes 'occupied'
    - If a meeting starts within 30 minutes, becomes 'reserved'
    - Otherwise 'available'
    """
    if room.status == "maintenance":
        return "maintenance"

    now = datetime.utcnow()
    # Check if there is a meeting occurring right now
    current_meeting = db.query(Booking).filter(
        Booking.room_id == room.id,
        Booking.status.in_(["approved", "pending"]),
        Booking.start_time <= now,
        Booking.end_time > now
    ).first()
    if current_meeting:
        return "occupied"

    # Check if a meeting is starting within next 30 minutes
    soon_meeting = db.query(Booking).filter(
        Booking.room_id == room.id,
        Booking.status.in_(["approved", "pending"]),
        Booking.start_time > now,
        Booking.start_time <= now + timedelta(minutes=30)
    ).first()
    if soon_meeting:
        return "reserved"

    return "available"

def format_room_out(db: Session, room: Room) -> RoomOut:
    live_status = calculate_live_room_status(db, room)
    equipment_list = [
        EquipmentOut(
            id=re.equipment.id,
            name=re.equipment.name,
            icon=re.equipment.icon,
            description=re.equipment.description,
            quantity=re.quantity
        )
        for re in room.equipment_associations
    ]
    return RoomOut(
        id=room.id,
        code=room.code,
        name=room.name,
        building=room.building,
        floor=room.floor,
        capacity=room.capacity,
        description=room.description,
        image_url=room.image_url,
        status=live_status,
        is_active=room.is_active,
        equipment=equipment_list,
        created_at=room.created_at,
        updated_at=room.updated_at
    )

@router.get("", response_model=List[RoomOut])
def get_rooms(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    capacity_min: Optional[int] = None,
    building: Optional[str] = None,
    floor: Optional[str] = None,
    equipment_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Room).filter(Room.is_active == True)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Room.name.ilike(search_term),
                Room.code.ilike(search_term),
                Room.building.ilike(search_term),
                Room.description.ilike(search_term)
            )
        )

    if capacity_min:
        query = query.filter(Room.capacity >= capacity_min)

    if building:
        query = query.filter(Room.building == building)

    if floor:
        query = query.filter(Room.floor == floor)

    if equipment_id:
        query = query.join(RoomEquipment).filter(RoomEquipment.equipment_id == equipment_id)

    rooms = query.order_by(Room.building.asc(), Room.floor.asc(), Room.name.asc()).all()
    results = [format_room_out(db, r) for r in rooms]

    if status_filter:
        results = [r for r in results if r.status.lower() == status_filter.lower()]

    return results

@router.get("/equipment", response_model=List[EquipmentOut])
def get_all_equipment(db: Session = Depends(get_db)):
    equipment = db.query(Equipment).order_by(Equipment.name.asc()).all()
    return [
        EquipmentOut(
            id=e.id,
            name=e.name,
            icon=e.icon,
            description=e.description,
            quantity=1
        )
        for e in equipment
    ]

@router.get("/{room_id}", response_model=RoomOut)
def get_room_by_id(room_id: int, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="ไม่พบห้องประชุมที่ระบุ")
    return format_room_out(db, room)

@router.get("/{room_id}/availability")
def get_room_availability(
    room_id: int,
    target_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="ไม่พบห้องประชุมที่ระบุ")

    check_date = target_date or datetime.utcnow().date()
    start_of_day = datetime.combine(check_date, time(0, 0, 0))
    end_of_day = datetime.combine(check_date, time(23, 59, 59))

    bookings = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.status.in_(["pending", "approved"]),
        Booking.start_time < end_of_day,
        Booking.end_time > start_of_day
    ).order_by(Booking.start_time.asc()).all()

    booked_slots = [
        {
            "id": b.id,
            "title": b.title,
            "start_time": b.start_time.isoformat(),
            "end_time": b.end_time.isoformat(),
            "organizer_name": b.organizer_name,
            "status": b.status
        }
        for b in bookings
    ]

    return {
        "room_id": room.id,
        "room_name": room.name,
        "date": check_date.isoformat(),
        "is_maintenance": room.status == "maintenance",
        "booked_slots": booked_slots
    }

@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
async def create_room(
    data: RoomCreate,
    request: Request,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    # Check duplicate code
    existing = db.query(Room).filter(Room.code == data.code.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"รหัสห้องประชุม '{data.code}' มีอยู่ในระบบแล้ว")

    new_room = Room(
        code=data.code.strip(),
        name=data.name.strip(),
        building=data.building.strip(),
        floor=data.floor.strip(),
        capacity=data.capacity,
        description=data.description,
        image_url=data.image_url,
        status=data.status,
        is_active=data.is_active
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    # Attach equipment
    for eq_id in data.equipment_ids:
        eq = db.query(Equipment).filter(Equipment.id == eq_id).first()
        if eq:
            db.add(RoomEquipment(room_id=new_room.id, equipment_id=eq.id, quantity=1))
    db.commit()
    db.refresh(new_room)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "CREATE_ROOM", "room", str(new_room.id), f"Created room {new_room.name}", client_ip)

    await ws_manager.broadcast("ROOM_STATUS_CHANGED", {"room_id": new_room.id, "action": "created"})

    return format_room_out(db, new_room)

@router.put("/{room_id}", response_model=RoomOut)
async def update_room(
    room_id: int,
    data: RoomUpdate,
    request: Request,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="ไม่พบห้องประชุมที่ระบุ")

    if data.code and data.code.strip() != room.code:
        existing = db.query(Room).filter(Room.code == data.code.strip(), Room.id != room_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"รหัสห้อง '{data.code}' ซ้ำกับห้องอื่น")
        room.code = data.code.strip()

    if data.name: room.name = data.name.strip()
    if data.building: room.building = data.building.strip()
    if data.floor: room.floor = data.floor.strip()
    if data.capacity is not None: room.capacity = data.capacity
    if data.description is not None: room.description = data.description
    if data.image_url is not None: room.image_url = data.image_url
    if data.status: room.status = data.status
    if data.is_active is not None: room.is_active = data.is_active

    if data.equipment_ids is not None:
        # Replace equipment
        db.query(RoomEquipment).filter(RoomEquipment.room_id == room_id).delete()
        for eq_id in data.equipment_ids:
            eq = db.query(Equipment).filter(Equipment.id == eq_id).first()
            if eq:
                db.add(RoomEquipment(room_id=room.id, equipment_id=eq.id, quantity=1))

    db.commit()
    db.refresh(room)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "UPDATE_ROOM", "room", str(room.id), f"Updated room {room.name}", client_ip)

    await ws_manager.broadcast("ROOM_STATUS_CHANGED", {"room_id": room.id, "action": "updated"})

    return format_room_out(db, room)

@router.patch("/{room_id}/status", response_model=RoomOut)
async def change_room_status(
    room_id: int,
    data: RoomStatusUpdate,
    request: Request,
    current_user: User = Depends(require_roles(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="ไม่พบห้องประชุมที่ระบุ")

    valid_statuses = ["available", "maintenance", "reserved", "occupied"]
    if data.status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"สถานะไม่ถูกต้อง (ต้องเป็น {', '.join(valid_statuses)})")

    old_status = room.status
    room.status = data.status.lower()
    db.commit()
    db.refresh(room)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "CHANGE_ROOM_STATUS", "room", str(room.id), f"Changed status from {old_status} to {room.status}", client_ip)

    await ws_manager.broadcast("ROOM_STATUS_CHANGED", {"room_id": room.id, "status": room.status})

    return format_room_out(db, room)

@router.delete("/{room_id}")
async def delete_room(
    room_id: int,
    request: Request,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="ไม่พบห้องประชุมที่ระบุ")

    # Soft delete room by marking is_active = False
    room.is_active = False
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "DELETE_ROOM", "room", str(room_id), f"Deactivated room {room.name}", client_ip)

    await ws_manager.broadcast("ROOM_STATUS_CHANGED", {"room_id": room_id, "action": "deleted"})

    return {"message": f"ห้องประชุม '{room.name}' ถูกลบออกจากระบบเรียบร้อยแล้ว"}
