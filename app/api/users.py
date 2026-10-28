from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.user import User, Role, Department
from app.schemas.user import UserOut, UserCreate, UserUpdate, UserStatusUpdate, UserResetPassword
from app.schemas.auth import RoleSummary, DepartmentSummary
from app.services.auth_service import require_roles, get_password_hash
from app.services.audit_service import log_activity

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("/roles", response_model=List[RoleSummary])
def get_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()

@router.get("/departments", response_model=List[DepartmentSummary])
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()

@router.get("", response_model=List[UserOut])
def get_all_users(
    search: Optional[str] = None,
    role_id: Optional[int] = None,
    department_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(User)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(User.name.ilike(s), User.email.ilike(s), User.phone.ilike(s)))

    if role_id:
        query = query.filter(User.role_id == role_id)

    if department_id:
        query = query.filter(User.department_id == department_id)

    if status_filter:
        query = query.filter(User.status == status_filter)

    users = query.order_by(User.id.asc()).all()
    return users

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    request: Request,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    # Check duplicate email
    existing = db.query(User).filter(User.email == data.email.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"อีเมล '{data.email}' มีอยู่ในระบบแล้ว")

    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="ไม่พบ Role ที่เลือก")

    new_user = User(
        name=data.name.strip(),
        email=data.email.strip().lower(),
        password_hash=get_password_hash(data.password),
        role_id=data.role_id,
        department_id=data.department_id,
        phone=data.phone.strip() if data.phone else None,
        status=data.status
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "CREATE_USER", "user", str(new_user.id), f"Created user {new_user.email}", client_ip)

    return new_user

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    request: Request,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลผู้ใช้นี้")

    if data.email and data.email.strip().lower() != user.email:
        existing = db.query(User).filter(User.email == data.email.strip().lower(), User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว")
        user.email = data.email.strip().lower()

    if data.name: user.name = data.name.strip()
    if data.role_id is not None: user.role_id = data.role_id
    if data.department_id is not None: user.department_id = data.department_id
    if data.phone is not None: user.phone = data.phone.strip() if data.phone else None
    if data.status: user.status = data.status
    if data.password: user.password_hash = get_password_hash(data.password)

    db.commit()
    db.refresh(user)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "UPDATE_USER", "user", str(user.id), f"Updated user {user.email}", client_ip)

    return user

@router.patch("/{user_id}/status", response_model=UserOut)
def toggle_user_status(
    user_id: int,
    data: UserStatusUpdate,
    request: Request,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลผู้ใช้นี้")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="ไม่สามารถระงับการใช้งานบัญชีของตนเองได้")

    user.status = data.status.lower()
    db.commit()
    db.refresh(user)

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "TOGGLE_USER_STATUS", "user", str(user.id), f"User {user.email} status changed to {user.status}", client_ip)

    return user

@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    data: UserResetPassword,
    request: Request,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลผู้ใช้นี้")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร")

    user.password_hash = get_password_hash(data.new_password)
    db.commit()

    client_ip = request.client.host if request.client else "unknown"
    log_activity(db, current_user.id, "RESET_PASSWORD", "user", str(user.id), f"Reset password for {user.email}", client_ip)

    return {"message": f"รีเซ็ตรหัสผ่านสำหรับ {user.name} เรียบร้อยแล้ว"}
