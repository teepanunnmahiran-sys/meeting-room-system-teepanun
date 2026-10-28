import sys
import os
from datetime import datetime, timedelta

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, Base, engine
from app.models.user import Role, Department, User
from app.models.room import Equipment, Room, RoomEquipment
from app.models.booking import Booking, BookingParticipant, BookingEquipment
from app.models.notification import Notification
from app.models.audit import AuditLog
from app.services.auth_service import get_password_hash

def seed_database():
    print("Dropping and re-creating all database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding Roles...")
        role_admin = Role(name="admin", description="ผู้ดูแลระบบสูงสุด (System Administrator)")
        role_manager = Role(name="manager", description="ผู้จัดการ / เจ้าหน้าที่ (Staff & Room Manager)")
        role_user = Role(name="user", description="พนักงานทั่วไป (General Employee)")
        db.add_all([role_admin, role_manager, role_user])
        db.commit()

        print("Seeding Departments...")
        dept_it = Department(name="เทคโนโลยีสารสนเทศ (IT & Engineering)", code="IT")
        dept_hr = Department(name="ทรัพยากรบุคคล (Human Resources)", code="HR")
        dept_mkt = Department(name="การตลาดและพัฒนาธุรกิจ (Marketing & Sales)", code="MKT")
        dept_fin = Department(name="การเงินและบัญชี (Finance & Accounting)", code="FIN")
        dept_exec = Department(name="คณะผู้บริหาร (Executive Board)", code="EXEC")
        db.add_all([dept_it, dept_hr, dept_mkt, dept_fin, dept_exec])
        db.commit()

        print("Seeding Users...")
        default_pwd_hash = get_password_hash("admin1234")
        mgr_pwd_hash = get_password_hash("manager1234")
        user_pwd_hash = get_password_hash("user1234")

        admin_user = User(
            name="ณัฐพล บริหารกิจ (Admin)",
            email="admin@company.com",
            password_hash=default_pwd_hash,
            role_id=role_admin.id,
            department_id=dept_it.id,
            phone="081-999-0001",
            status="active",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        )
        manager_user = User(
            name="วิภาดา สิทธิการ (Manager)",
            email="manager@company.com",
            password_hash=mgr_pwd_hash,
            role_id=role_manager.id,
            department_id=dept_hr.id,
            phone="082-888-0002",
            status="active",
            avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"
        )
        staff_user = User(
            name="สมชาย พัฒนาไทย (User)",
            email="user@company.com",
            password_hash=user_pwd_hash,
            role_id=role_user.id,
            department_id=dept_it.id,
            phone="083-777-0003",
            status="active",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        )
        sarah_user = User(
            name="ศิริพร วงศ์สว่าง (Sarah)",
            email="sarah@company.com",
            password_hash=user_pwd_hash,
            role_id=role_user.id,
            department_id=dept_mkt.id,
            phone="084-666-0004",
            status="active",
            avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
        )
        wichai_user = User(
            name="วิชัย เกียรติคุณ (Wichai)",
            email="wichai@company.com",
            password_hash=user_pwd_hash,
            role_id=role_user.id,
            department_id=dept_fin.id,
            phone="085-555-0005",
            status="active",
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
        )
        db.add_all([admin_user, manager_user, staff_user, sarah_user, wichai_user])
        db.commit()

        print("Seeding Equipment...")
        eq_projector = Equipment(name="4K Laser Projector", icon="projector", description="โปรเจกเตอร์ความคมชัดสูง 4K รองรับ HDMI & AirPlay")
        eq_tv = Equipment(name="Smart TV 75 นิ้ว", icon="tv", description="จอสมาร์ททีวี 4K พร้อมระบบ Cast ไร้สาย")
        eq_video_conf = Equipment(name="ระบบ Video Conference", icon="video", description="กล้อง AI 4K ติดตามใบหน้าและไมโครโฟนตัดเสียงรบกวน")
        eq_mic = Equipment(name="ไมโครโฟนไร้สาย (Wireless Mic)", icon="mic", description="ชุดไมค์ลอยคู่ พร้อมชุดลำโพงเสียงรอบทิศทาง")
        eq_whiteboard = Equipment(name="กระดานกระจก Whiteboard", icon="clipboard", description="กระดานแก้วเขียนลื่นพร้อมชุดปากกา 4 สี")
        eq_wifi = Equipment(name="High-Speed Wi-Fi 6", icon="wifi", description="สัญญาณอินเทอร์เน็ตความเร็วสูงเฉพาะห้องประชุม")
        eq_soundbar = Equipment(name="Soundbar & Speakerphone", icon="volume-2", description="ชุดลำโพงห้องประชุม Conference Speaker")
        db.add_all([eq_projector, eq_tv, eq_video_conf, eq_mic, eq_whiteboard, eq_wifi, eq_soundbar])
        db.commit()

        print("Seeding Meeting Rooms...")
        room1 = Room(
            code="RM-101",
            name="Grand Horizon Boardroom",
            building="อาคาร A (Executive Tower)",
            floor="ชั้น 10",
            capacity=30,
            description="ห้องประชุมผู้บริหารขนาดใหญ่ วิวพาโนรามา ตกแต่งหรูหรา เหมาะสำหรับการประชุมกรรมการ ผู้ถือหุ้น และงานแถลงข่าวสำคัญ",
            image_url="https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800",
            status="available",
            is_active=True
        )
        room2 = Room(
            code="RM-201",
            name="Agile Innovation Lab",
            building="อาคาร B (Tech Center)",
            floor="ชั้น 3",
            capacity=16,
            description="ห้องทำงานร่วมและประชุมเชิงปฏิบัติการ พร้อมกระดานไอเดีย เหมาะสำหรับทีม Tech, Sprint Planning และ Design Thinking",
            image_url="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
            status="available",
            is_active=True
        )
        room3 = Room(
            code="RM-301",
            name="Executive Suite Alpha",
            building="อาคาร A (Executive Tower)",
            floor="ชั้น 5",
            capacity=10,
            description="ห้องประชุมระดับผู้บริหาร บรรยากาศเงียบสงบ เก็บเสียงดีเยี่ยม พร้อมระบบประชุมทางไกลระหว่างประเทศ",
            image_url="https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800",
            status="available",
            is_active=True
        )
        room4 = Room(
            code="RM-401",
            name="Focus Room Blue",
            building="อาคาร B (Tech Center)",
            floor="ชั้น 2",
            capacity=6,
            description="ห้องประชุมขนาดเล็ก เหมาะสำหรับการสัมภาษณ์งาน คุยโปรเจกต์กลุ่มย่อย หรือ 1-on-1 Review",
            image_url="https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800",
            status="available",
            is_active=True
        )
        room5 = Room(
            code="RM-501",
            name="Creative Pod Green",
            building="อาคาร C (Creative Studio)",
            floor="ชั้น 1",
            capacity=4,
            description="พ็อดห้องประชุมสำหรับทีมสร้างสรรค์ บรรยากาศโปร่งสบาย มีแสงธรรมชาติ เหมาะกับการระดมสมอง",
            image_url="https://images.unsplash.com/photo-1505409859467-3a796fd5798e?w=800",
            status="available",
            is_active=True
        )
        room6 = Room(
            code="RM-601",
            name="Workshop & Seminar Hall",
            building="อาคาร A (Executive Tower)",
            floor="ชั้น 1",
            capacity=50,
            description="ห้องประชุมเอนกประสงค์ขนาดใหญ่สำหรับจัดอบรม สัมมนา และ Town Hall (ปัจจุบันปิดปรับปรุงระบบเครื่องปรับอากาศ)",
            image_url="https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800",
            status="maintenance",
            is_active=True
        )
        db.add_all([room1, room2, room3, room4, room5, room6])
        db.commit()

        print("Attaching Room Equipment...")
        db.add_all([
            RoomEquipment(room_id=room1.id, equipment_id=eq_projector.id),
            RoomEquipment(room_id=room1.id, equipment_id=eq_video_conf.id),
            RoomEquipment(room_id=room1.id, equipment_id=eq_mic.id),
            RoomEquipment(room_id=room1.id, equipment_id=eq_wifi.id),

            RoomEquipment(room_id=room2.id, equipment_id=eq_tv.id),
            RoomEquipment(room_id=room2.id, equipment_id=eq_video_conf.id),
            RoomEquipment(room_id=room2.id, equipment_id=eq_whiteboard.id),
            RoomEquipment(room_id=room2.id, equipment_id=eq_wifi.id),

            RoomEquipment(room_id=room3.id, equipment_id=eq_tv.id),
            RoomEquipment(room_id=room3.id, equipment_id=eq_soundbar.id),
            RoomEquipment(room_id=room3.id, equipment_id=eq_video_conf.id),
            RoomEquipment(room_id=room3.id, equipment_id=eq_wifi.id),

            RoomEquipment(room_id=room4.id, equipment_id=eq_tv.id),
            RoomEquipment(room_id=room4.id, equipment_id=eq_whiteboard.id),
            RoomEquipment(room_id=room4.id, equipment_id=eq_wifi.id),

            RoomEquipment(room_id=room5.id, equipment_id=eq_whiteboard.id),
            RoomEquipment(room_id=room5.id, equipment_id=eq_wifi.id),

            RoomEquipment(room_id=room6.id, equipment_id=eq_projector.id),
            RoomEquipment(room_id=room6.id, equipment_id=eq_mic.id),
            RoomEquipment(room_id=room6.id, equipment_id=eq_wifi.id),
        ])
        db.commit()

        print("Seeding Sample Bookings...")
        now = datetime.utcnow()
        today = now.date()

        # 1. Today morning meeting (Approved)
        b1 = Booking(
            booking_code="BK-20261028-00101",
            room_id=room1.id,
            user_id=admin_user.id,
            title="Q4 Strategic Planning & Executive Alignment",
            description="ประชุมคณะกรรมการบริหารเพื่อทบทวนผลการดำเนินงานและเป้าหมายประจำปี 2026",
            start_time=datetime.combine(today, datetime.strptime("09:00", "%H:%M").time()),
            end_time=datetime.combine(today, datetime.strptime("11:30", "%H:%M").time()),
            attendees_count=20,
            organizer_name="ณัฐพล บริหารกิจ",
            organizer_contact="081-999-0001",
            status="approved",
            approved_by_id=admin_user.id,
            approved_at=now - timedelta(days=1)
        )

        # 2. Today afternoon meeting (Pending approval)
        b2 = Booking(
            booking_code="BK-20261028-00102",
            room_id=room2.id,
            user_id=staff_user.id,
            title="Sprint Review & Tech Demo (System v2.0)",
            description="นำเสนอระบบจองห้องประชุมและรับฟีดแบ็กจากตัวแทนฝ่ายต่างๆ",
            start_time=datetime.combine(today, datetime.strptime("14:00", "%H:%M").time()),
            end_time=datetime.combine(today, datetime.strptime("16:00", "%H:%M").time()),
            attendees_count=12,
            organizer_name="สมชาย พัฒนาไทย",
            organizer_contact="083-777-0003",
            status="pending"
        )

        # 3. Tomorrow meeting (Approved)
        tomorrow = today + timedelta(days=1)
        b3 = Booking(
            booking_code="BK-20261029-00103",
            room_id=room3.id,
            user_id=sarah_user.id,
            title="Global Marketing Campaign Launch 2027",
            description="ประชุมร่วมกับเอเจนซี่และพันธมิตรต่างประเทศผ่านระบบ Video Conference",
            start_time=datetime.combine(tomorrow, datetime.strptime("10:00", "%H:%M").time()),
            end_time=datetime.combine(tomorrow, datetime.strptime("12:00", "%H:%M").time()),
            attendees_count=8,
            organizer_name="ศิริพร วงศ์สว่าง",
            organizer_contact="084-666-0004",
            status="approved",
            approved_by_id=manager_user.id,
            approved_at=now - timedelta(hours=5)
        )

        # 4. Past meeting (Completed)
        yesterday = today - timedelta(days=1)
        b4 = Booking(
            booking_code="BK-20261027-00104",
            room_id=room4.id,
            user_id=manager_user.id,
            title="Interview: Senior Backend Engineer Candidate",
            description="สัมภาษณ์รอบสุดท้ายสำหรับตำแหน่ง Senior Python Developer",
            start_time=datetime.combine(yesterday, datetime.strptime("13:30", "%H:%M").time()),
            end_time=datetime.combine(yesterday, datetime.strptime("15:00", "%H:%M").time()),
            attendees_count=4,
            organizer_name="วิภาดา สิทธิการ",
            organizer_contact="082-888-0002",
            status="completed"
        )

        # 5. Later this week (Approved)
        later = today + timedelta(days=3)
        b5 = Booking(
            booking_code="BK-20261031-00105",
            room_id=room5.id,
            user_id=staff_user.id,
            title="Design System & UI Components Sync",
            description="สรุป Guideline สำหรับ Modern Corporate Palette และ UX Components",
            start_time=datetime.combine(later, datetime.strptime("11:00", "%H:%M").time()),
            end_time=datetime.combine(later, datetime.strptime("12:00", "%H:%M").time()),
            attendees_count=3,
            organizer_name="สมชาย พัฒนาไทย",
            organizer_contact="083-777-0003",
            status="approved",
            approved_by_id=manager_user.id,
            approved_at=now - timedelta(hours=2)
        )

        db.add_all([b1, b2, b3, b4, b5])
        db.commit()

        print("Seeding Participants & Equipment Requests...")
        db.add_all([
            BookingParticipant(booking_id=b1.id, name="กมล ประธานกรรมการ", email="kamon@board.com", role="host"),
            BookingParticipant(booking_id=b1.id, name="ดร.สมบัติ นวัตกรรม", email="sombat@board.com", role="attendee"),
            BookingParticipant(booking_id=b2.id, name="สมชาย พัฒนาไทย", email="user@company.com", role="host"),
            BookingParticipant(booking_id=b2.id, name="ศิริพร วงศ์สว่าง", email="sarah@company.com", role="attendee"),
            BookingEquipment(booking_id=b1.id, equipment_id=eq_video_conf.id),
            BookingEquipment(booking_id=b1.id, equipment_id=eq_mic.id),
            BookingEquipment(booking_id=b2.id, equipment_id=eq_tv.id)
        ])
        db.commit()

        print("Seeding Initial Notifications...")
        db.add_all([
            Notification(
                user_id=admin_user.id,
                title="มีการจองห้องประชุมใหม่รออนุมัติ",
                message="สมชาย พัฒนาไทย ได้จองห้อง Agile Innovation Lab สำหรับวันที่ 28/10/2026",
                type="booking_created",
                link="/bookings",
                is_read=False
            ),
            Notification(
                user_id=manager_user.id,
                title="มีการจองห้องประชุมใหม่รออนุมัติ",
                message="สมชาย พัฒนาไทย ได้จองห้อง Agile Innovation Lab สำหรับวันที่ 28/10/2026",
                type="booking_created",
                link="/bookings",
                is_read=False
            ),
            Notification(
                user_id=sarah_user.id,
                title="การจองห้องประชุมของคุณได้รับการอนุมัติแล้ว",
                message="การจองห้อง Executive Suite Alpha วันที่ 29/10/2026 ได้รับการอนุมัติเรียบร้อย",
                type="booking_approved",
                link="/my-bookings",
                is_read=True
            ),
            Notification(
                user_id=staff_user.id,
                title="ยินดีต้อนรับสู่ระบบจองห้องประชุม",
                message="คุณสามารถตรวจสอบห้องว่าง จองห้องประชุม และติดตามสถานะได้ทันที",
                type="system",
                link="/rooms",
                is_read=False
            )
        ])
        db.commit()

        print("Seeding Initial Audit Logs...")
        db.add_all([
            AuditLog(user_id=admin_user.id, action="SYSTEM_INIT", resource_type="system", details="Database initialized with enterprise seed data", ip_address="127.0.0.1"),
            AuditLog(user_id=admin_user.id, action="CREATE_BOOKING", resource_type="booking", resource_id=str(b1.id), details=f"Created booking {b1.booking_code}", ip_address="127.0.0.1"),
            AuditLog(user_id=staff_user.id, action="CREATE_BOOKING", resource_type="booking", resource_id=str(b2.id), details=f"Created booking {b2.booking_code}", ip_address="127.0.0.1"),
            AuditLog(user_id=manager_user.id, action="APPROVE_BOOKING", resource_type="booking", resource_id=str(b3.id), details=f"Approved booking {b3.booking_code}", ip_address="127.0.0.1"),
        ])
        db.commit()

        print("Database seed completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
