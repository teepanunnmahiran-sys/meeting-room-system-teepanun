from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50), default="box", nullable=False)  # lucide icon name
    description = Column(String(255), nullable=True)

    room_associations = relationship("RoomEquipment", back_populates="equipment", cascade="all, delete-orphan")

class RoomEquipment(Base):
    __tablename__ = "room_equipment"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    equipment_id = Column(Integer, ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)

    room = relationship("Room", back_populates="equipment_associations")
    equipment = relationship("Equipment", back_populates="room_associations")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    building = Column(String(80), nullable=False)
    floor = Column(String(20), nullable=False)
    capacity = Column(Integer, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    status = Column(String(20), default="available", nullable=False)  # available, occupied, reserved, maintenance
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    equipment_associations = relationship("RoomEquipment", back_populates="room", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="room", cascade="all, delete-orphan")
