from typing import Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.websocket.manager import ws_manager

async def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    link: Optional[str] = None
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        link=link,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Push to user via WebSocket
    await ws_manager.send_personal_message(
        user_id=user_id,
        event_type="NOTIFICATION_RECEIVED",
        data={
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "type": notif.type,
            "link": notif.link,
            "created_at": notif.created_at.isoformat()
        }
    )
    return notif

async def notify_admins_and_managers(
    db: Session,
    title: str,
    message: str,
    notification_type: str = "booking_created",
    link: Optional[str] = None
):
    from app.models.user import User, Role
    # Find all users with admin or manager role
    managers = db.query(User).join(Role).filter(
        Role.name.in_(["admin", "manager"]),
        User.status == "active"
    ).all()

    for manager in managers:
        await create_notification(
            db=db,
            user_id=manager.id,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link
        )
