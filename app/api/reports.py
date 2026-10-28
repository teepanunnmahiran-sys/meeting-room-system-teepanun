from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.booking import Booking
from app.models.user import User
from app.services.auth_service import require_roles
from app.services.report_service import (
    resolve_date_range, generate_report_summary, export_to_excel, export_to_csv, export_to_pdf
)

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/summary")
def get_report_summary(
    range_type: str = Query("month", pattern="^(today|week|month|year|custom)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_roles(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    start_time, end_time = resolve_date_range(range_type, start_date, end_date)
    return generate_report_summary(db, start_time, end_time)

@router.get("/export")
def export_report_file(
    format: str = Query("xlsx", pattern="^(xlsx|csv|pdf)$"),
    range_type: str = Query("month", pattern="^(today|week|month|year|custom)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(require_roles(["admin", "manager"])),
    db: Session = Depends(get_db)
):
    start_time, end_time = resolve_date_range(range_type, start_date, end_date)
    summary_data = generate_report_summary(db, start_time, end_time)

    bookings_list = db.query(Booking).filter(
        Booking.start_time >= start_time,
        Booking.start_time <= end_time
    ).order_by(Booking.start_time.asc()).all()

    filename_prefix = f"meeting_report_{start_time.strftime('%Y%m%d')}_{end_time.strftime('%Y%m%d')}"

    if format == "csv":
        csv_content = export_to_csv(bookings_list)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename_prefix}.csv"}
        )
    elif format == "pdf":
        pdf_buffer = export_to_pdf(summary_data, bookings_list)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename_prefix}.pdf"}
        )
    else:  # xlsx
        excel_buffer = export_to_excel(summary_data, bookings_list)
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename_prefix}.xlsx"}
        )
