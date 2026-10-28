from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(30), unique=True, nullable=False, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    attendees_count = Column(Integer, nullable=False)
    organizer_name = Column(String(100), nullable=False)
    organizer_contact = Column(String(100), nullable=True)
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, approved, rejected, cancelled, completed
    rejection_reason = Column(Text, nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    room = relationship("Room", back_populates="bookings")
    user = relationship("User", foreign_keys=[user_id], back_populates="bookings")
    approver = relationship("User", foreign_keys=[approved_by_id])
    participants = relationship("BookingParticipant", back_populates="booking", cascade="all, delete-orphan")
    requested_equipment = relationship("BookingEquipment", back_populates="booking", cascade="all, delete-orphan")

class BookingParticipant(Base):
    __tablename__ = "booking_participants"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    role = Column(String(30), default="attendee", nullable=False)  # host, attendee

    booking = relationship("Booking", back_populates="participants")

class BookingEquipment(Base):
    __tablename__ = "booking_equipment"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    equipment_id = Column(Integer, ForeignKey("equipment.id", ondelete="CASCADE"), nullable=False)
    notes = Column(String(255), nullable=True)

    booking = relationship("Booking", back_populates="requested_equipment")
    equipment = relationship("Equipment")
