from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserProfile"

class RoleSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class DepartmentSummary(BaseModel):
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True

class UserProfile(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    status: str
    role: RoleSummary
    department: Optional[DepartmentSummary] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

TokenResponse.model_rebuild()
