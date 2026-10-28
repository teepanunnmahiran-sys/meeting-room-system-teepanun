from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.services.auth_service import require_roles

router = APIRouter(prefix="/audit-logs", tags=["Audit & Activity Logs"])

@router.get("")
def get_audit_logs(
    search: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)

    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(AuditLog.details.ilike(s), AuditLog.action.ilike(s), AuditLog.ip_address.ilike(s)))

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_name": l.user.name if l.user else "System / Guest",
            "user_email": l.user.email if l.user else "-",
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": l.details,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]
