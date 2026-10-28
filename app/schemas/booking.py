from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ParticipantInput(BaseModel):
    name: str
    email: str
    role: str = "attendee"

class ParticipantOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True

class BookingBase(BaseModel):
    room_id: int
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    attendees_count: int = Field(ge=1)
    organizer_name: str
    organizer_contact: Optional[str] = None

class BookingCreate(BookingBase):
    equipment_ids: List[int] = []
    participants: List[ParticipantInput] = []

class BookingUpdate(BaseModel):
    room_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    attendees_count: Optional[int] = None
    organizer_name: Optional[str] = None
    organizer_contact: Optional[str] = None
    equipment_ids: Optional[List[int]] = None
    participants: Optional[List[ParticipantInput]] = None

class BookingStatusAction(BaseModel):
    reason: Optional[str] = None

class AlternativeRoom(BaseModel):
    id: int
    name: str
    code: str
    building: str
    floor: str
    capacity: int
    image_url: Optional[str] = None

class AlternativeSlot(BaseModel):
    start_time: datetime
    end_time: datetime
    label: str

class BookingConflictCheckRequest(BaseModel):
    room_id: int
    start_time: datetime
    end_time: datetime
    attendees_count: int
    exclude_booking_id: Optional[int] = None

class BookingConflictCheckResponse(BaseModel):
    is_available: bool
    message: str
    conflict_reason: Optional[str] = None  # overlap, maintenance, capacity
    alternative_rooms: List[AlternativeRoom] = []
    alternative_slots: List[AlternativeSlot] = []

class BookingOut(BaseModel):
    id: int
    booking_code: str
    room_id: int
    room_name: str
    room_code: str
    room_image: Optional[str] = None
    building: str
    floor: str
    user_id: int
    user_name: str
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    attendees_count: int
    organizer_name: str
    organizer_contact: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    participants: List[ParticipantOut] = []
    equipment_names: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
