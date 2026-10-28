from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.schemas.auth import RoleSummary, DepartmentSummary

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role_id: int
    department_id: Optional[int] = None
    phone: Optional[str] = None
    status: str = "active"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    department_id: Optional[int] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None

class UserStatusUpdate(BaseModel):
    status: str  # active, disabled

class UserResetPassword(BaseModel):
    new_password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    status: str
    role_id: int
    department_id: Optional[int] = None
    role: RoleSummary
    department: Optional[DepartmentSummary] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
