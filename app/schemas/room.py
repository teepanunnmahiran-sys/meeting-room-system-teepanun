from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class EquipmentOut(BaseModel):
    id: int
    name: str
    icon: str
    description: Optional[str] = None
    quantity: int = 1

    class Config:
        from_attributes = True

class RoomEquipmentInput(BaseModel):
    equipment_id: int
    quantity: int = 1

class RoomBase(BaseModel):
    code: str
    name: str
    building: str
    floor: str
    capacity: int
    description: Optional[str] = None
    image_url: Optional[str] = None
    status: str = "available"  # available, occupied, reserved, maintenance
    is_active: bool = True

class RoomCreate(RoomBase):
    equipment_ids: List[int] = []

class RoomUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    equipment_ids: Optional[List[int]] = None

class RoomStatusUpdate(BaseModel):
    status: str

class RoomOut(RoomBase):
    id: int
    equipment: List[EquipmentOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
