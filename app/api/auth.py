from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserProfile, ChangePasswordRequest,
    ForgotPasswordRequest, ProfileUpdateRequest
)
from app.services.auth_service import (
    verify_password, get_password_hash, create_access_token, get_current_user
)
from app.services.audit_service import log_activity

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    # Find user by email (case-insensitive)
    user = db.query(User).filter(User.email.ilike(login_data.email.strip())).first()

    client_ip = request.client.host if request.client else "unknown"

    if not user or not verify_password(login_data.password, user.password_hash):
        log_activity(db, None, "LOGIN_FAILED", "auth", None, f"Failed login attempt for {login_data.email}", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง"
        )

    if user.status != "active":
        log_activity(db, user.id, "LOGIN_BLOCKED", "auth", str(user.id), "Account disabled", client_ip)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
        )

    # Update last login timestamp
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    log_activity(db, user.id, "LOGIN_SUCCESS", "auth", str(user.id), f"User {user.email} logged in", client_ip)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.name}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserProfile.model_validate(user)
    )

@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "LOGOUT", "auth", str(current_user.id), f"User {current_user.email} logged out", client_ip)
    return {"message": "ออกจากระบบสำเร็จ"}

@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    return UserProfile.model_validate(current_user)

@router.put("/profile", response_model=UserProfile)
def update_profile(
    profile_data: ProfileUpdateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.name:
        current_user.name = profile_data.name.strip()
    if profile_data.phone is not None:
        current_user.phone = profile_data.phone.strip()
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url.strip()

    db.commit()
    db.refresh(current_user)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "UPDATE_PROFILE", "user", str(current_user.id), "User updated profile", client_ip)

    return UserProfile.model_validate(current_user)

@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="รหัสผ่านปัจจุบันไม่ถูกต้อง"
        )

    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร"
        )

    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "CHANGE_PASSWORD", "auth", str(current_user.id), "Password changed successfully", client_ip)

    return {"message": "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว"}

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(data.email.strip())).first()
    client_ip = request.client.host if request.client else "unknown"

    if user:
        log_activity(db, user.id, "FORGOT_PASSWORD_REQUESTED", "auth", str(user.id), f"Password reset requested for {data.email}", client_ip)

    # Always return success message to prevent user enumeration
    return {"message": "หากอีเมลนี้มีอยู่ในระบบ ลิงก์สำหรับตั้งรหัสผ่านใหม่จะถูกส่งไปยังอีเมลของคุณ"}
