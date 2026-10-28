from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ReportFilter(BaseModel):
    range_type: str = "month"  # today, week, month, year, custom
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class RoomUsageStat(BaseModel):
    room_id: int
    room_name: str
    room_code: str
    capacity: int
    total_bookings: int
    total_hours: float
    utilization_rate: float

class DailyBookingStat(BaseModel):
    date: str
    count: int

class UserBookingStat(BaseModel):
    user_id: int
    user_name: str
    department_name: str
    booking_count: int
    total_hours: float

class ReportSummaryOut(BaseModel):
    total_bookings: int
    total_hours: float
    cancelled_bookings: int
    cancellation_rate: float
    approved_bookings: int
    pending_bookings: int
    most_used_room: Optional[Dict[str, Any]] = None
    least_used_room: Optional[Dict[str, Any]] = None
    room_stats: List[RoomUsageStat] = []
    daily_stats: List[DailyBookingStat] = []
    user_stats: List[UserBookingStat] = []
    status_distribution: Dict[str, int] = {}
