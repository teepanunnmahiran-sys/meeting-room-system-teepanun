# ระบบจองห้องประชุมองค์กร (Enterprise Meeting Room Booking System)

เว็บแอปพลิเคชันสำหรับบริหารจัดการและจองห้องประชุมแบบครบวงจร พัฒนาตามหลักสถาปัตยกรรมระดับองค์กร (Production-Ready) ด้วย **Python FastAPI**, **SQLAlchemy ORM**, **SQLite Database** (Enforced Foreign Keys & ACID), **WebSockets Real-Time Sync**, และ **Modern Corporate Dashboard UI** (Responsive Tailwind CSS, FullCalendar 6, Chart.js 4)

---

## 🌟 คุณสมบัติเด่นของระบบ (Key Features)

1. **ระบบบริหารจัดการห้องประชุม (Meeting Rooms Management)**
   - แสดงรายการห้องประชุมแบบ Responsive Cards พร้อมสถานะ Real-time:
     - 🟢 **Available (ว่าง)**
     - 🔴 **Occupied (กำลังใช้งาน)**
     - 🟡 **Reserved (จองแล้ว / เตรียมเริ่มใน 30 นาที)**
     - ⚫ **Maintenance (ปิดปรับปรุง)**
   - ตัวกรองขั้นสูง: กรองตามจำนวนคน (Capacity), สถานะห้อง, อุปกรณ์ที่ต้องการ, อาคาร/ชั้น
   - ดูตารางเวลาว่างของแต่ละห้องในแต่ละวันได้ทันที
   - ผู้ดูแลระบบ (Admin) สามารถเพิ่ม แก้ไข ปิดปรับปรุง หรือลบห้องประชุมได้

2. **ระบบตรวจสอบและป้องกันการจองซ้ำ (Zero-Conflict Booking Engine)**
   - ตรวจสอบความพร้อมของห้องและเวลาแบบ Real-time ทันทีขณะผู้ใช้กรอกฟอร์ม
   - ตรวจจับการทับซ้อนของเวลา: `(start_time < existing_end) AND (end_time > existing_start)`
   - ตรวจสอบความจุห้อง: ห้ามระบุจำนวนผู้เข้าร่วมเกินความจุที่ห้องรองรับ
   - ป้องกันการจองห้องที่อยู่ในสถานะ Maintenance
   - **Smart Recommendation:** หากห้องไม่ว่าง ระบบจะแสดงข้อความแจ้งเตือนพร้อมเสนอ **"ห้องอื่นที่ว่างในเวลาเดียวกัน"** และ **"ช่วงเวลาถัดไปที่ห้องนี้ว่างในวันเดียวกัน"** โดยสามารถกดสลับห้อง/เวลาได้ในคลิกเดียว

3. **ปฏิทินการจองแบบ Interactive (FullCalendar 6)**
   - รองรับ 4 มุมมอง: **Month View**, **Week View**, **Day View**, และ **Agenda/List View**
   - แสดงสี Event แยกตามสถานะการจอง (อนุมัติ, รออนุมัติ, เสร็จสิ้น)
   - คลิกที่ช่วงเวลาว่างในปฏิทินเพื่อเปิดฟอร์มจองห้องที่ระบุวันและเวลานั้นๆ ล่วงหน้าทันที
   - คลิกที่ Event เพื่อดูรายละเอียด, แก้ไข, ยกเลิก หรืออนุมัติการจอง

4. **การแจ้งเตือนแบบ Real-time (WebSockets Engine)**
   - การเชื่อมต่อ WebSocket แบบสองทาง (`/ws`)
   - แจ้งเตือนเมื่อมีการจองใหม่, การอนุมัติ, การปฏิเสธ, และการยกเลิก
   - กระดิ่งแจ้งเตือน (Notification Bell) บริเวณ Header พร้อมเลขนับ Unread Badge และ Dropdown แสดงรายการแจ้งเตือนล่าสุด
   - อัปเดตสถานะห้องและการเปลี่ยนแปลงในหน้าจอของผู้ใช้อื่นอัตโนมัติโดยไม่ต้อง Refresh หน้า

5. **แดชบอร์ดผู้บริหาร (Executive Dashboard)**
   - แถวที่ 1: การ์ดสรุป KPI (ห้องทั้งหมด, ห้องที่ว่างขณะนี้, ห้องที่กำลังใช้งาน, การจองวันนี้, การจองรออนุมัติ)
   - แถวที่ 2: กราฟเส้นแนวโน้มการจองรายวัน (14 วันล่าสุด) และกราฟโดนัทสัดส่วนการใช้ห้องแต่ละห้อง
   - แถวที่ 3: ตารางการประชุมที่กำลังจะเริ่ม (Upcoming Meetings) และแถบเปอร์เซ็นต์อัตราการใช้งานห้อง (Utilization Rate)

6. **ระบบรายงานและส่งออกข้อมูล (Reports & Export)**
   - เลือกช่วงเวลาได้ทั้ง วันนี้, สัปดาห์นี้, เดือนนี้, ปีนี้, หรือกำหนดช่วงวันที่เอง (Custom Date Range)
   - สรุปจำนวนการจอง, ชั่วโมงการใช้งานรวม, อัตราการยกเลิก (Cancellation Rate), ห้องที่ถูกใช้มากที่สุด/น้อยที่สุด
   - สถิติแยกตามห้องประชุม และสถิติแยกตามผู้ใช้งาน/แผนก
   - ส่งออกข้อมูลเป็น **Excel (.xlsx)**, **CSV (.csv)**, และ **PDF (.pdf)** พร้อมพิมพ์

7. **ระบบความปลอดภัยและการจัดการสิทธิ์ (Role-Based Access Control - RBAC)**
   - **User:** จองห้อง, ดูปฏิทิน, จัดการการจองของตนเอง, รับการแจ้งเตือน
   - **Staff / Manager:** ดูการจองทั้งหมด, พิจารณาอนุมัติหรือปฏิเสธการจอง, เปลี่ยนสถานะห้อง, ดู Dashboard และรายงาน
   - **Admin:** สิทธิ์สูงสุด จัดการห้องประชุม, จัดการ User (เปิด/ปิดสถานะ, เปลี่ยน Role, รีเซ็ตรหัสผ่าน), ดู Audit Logs
   - รหัสผ่านเข้ารหัสด้วย **Bcrypt** และยืนยันตัวตนด้วย **JWT Token (Bearer)**
   - บันทึกประวัติการกระทำ (Audit & Activity Logs) ทุกรายการสำคัญ

---

## 🔑 บัญชีผู้ใช้งานสำหรับทดสอบ (Demo Accounts)

ระบบมีปุ่ม **Quick Demo Login** บนหน้า Login หรือสามารถกรอกเองได้ดังนี้:

| Role | Email | Password | สิทธิ์การเข้าถึง |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@company.com` | `admin1234` | สิทธิ์สูงสุด จัดการระบบ ห้อง ผู้ใช้ รายงาน Audit Log |
| **Manager / Staff** | `manager@company.com` | `manager1234` | อนุมัติ/ปฏิเสธการจอง จัดการสถานะห้อง ดูรายงานและ Dashboard |
| **General User** | `user@company.com` | `user1234` | ค้นหาห้อง จองห้องประชุม และดูการจองของตนเอง |

---

## 🚀 วิธีการติดตั้งและเปิดใช้งาน (Getting Started)

### 1. เข้าสู่ไดเรกทอรีโครงการ
```powershell
cd C:\Users\TL\.gemini\antigravity\scratch\meeting_room_system
```

### 2. รันระบบผ่าน Virtual Environment
```powershell
# รัน Web Server บน http://localhost:8000
& ".\venv\Scripts\python.exe" "scripts\run_server.py"
```

เปิดเบราว์เซอร์ไปที่: **http://localhost:8000**  
(หรือดูเอกสาร API แบบ Interactive ที่: **http://localhost:8000/docs**)

### 3. คำสั่งอื่นๆ ที่สำคัญ

- **สร้างฐานข้อมูลและเพิ่มข้อมูลตัวอย่างใหม่ (Seed Database):**
  ```powershell
  & ".\venv\Scripts\python.exe" "scripts\seed_data.py"
  ```

- **รันชุดทดสอบระบบอัตโนมัติ (Automated Test Suite):**
  ```powershell
  & ".\venv\Scripts\python.exe" "scripts\test_system.py"
  ```

---

## 📁 โครงสร้างโปรเจกต์ (Folder Structure)

```
meeting_room_system/
├── app/
│   ├── main.py                  # FastAPI Entry point & WebSocket endpoint
│   ├── config.py                # System Settings & Database Path
│   ├── database.py              # SQLAlchemy Engine with PRAGMA foreign_keys=ON
│   ├── models/                  # SQLAlchemy ORM Models
│   │   ├── user.py              # Role, Department, User
│   │   ├── room.py              # Equipment, Room, RoomEquipment
│   │   ├── booking.py           # Booking, BookingParticipant, BookingEquipment
│   │   ├── notification.py      # Notification Model
│   │   └── audit.py             # AuditLog Model
│   ├── schemas/                 # Pydantic v2 Validation Schemas
│   ├── api/                     # RESTful API Endpoints
│   │   ├── auth.py              # Login, Logout, Profile, Change Password
│   │   ├── rooms.py             # Room CRUD, Filter & Live Availability
│   │   ├── bookings.py          # Booking CRUD, Conflict Check, Approval
│   │   ├── calendar.py          # FullCalendar Event Feeder
│   │   ├── dashboard.py         # KPI Summary & Charts Data
│   │   ├── reports.py           # Reports Aggregator & File Exporter
│   │   ├── users.py             # User Management & Status Toggle
│   │   ├── notifications.py     # User Notifications & Mark as Read
│   │   └── audit_logs.py        # System Activity Logs
│   ├── services/                # Business Logic Services
│   │   ├── auth_service.py      # Bcrypt hashing & JWT verification
│   │   ├── booking_service.py   # Conflict Detection Algorithm & Recommendations
│   │   ├── notification_service.py # Event dispatcher
│   │   ├── report_service.py    # Excel, CSV, PDF generator
│   │   └── audit_service.py     # Activity Logger
│   └── websocket/
│       └── manager.py           # Connection Hub & Event Broadcaster
├── static/
│   ├── css/styles.css           # Corporate Tailwind Palette
│   └── js/
│       ├── api.js               # API Client with Bearer token
│       ├── ws.js                # WebSocket Live Sync Manager
│       ├── app.js               # Central Application Controller
│       ├── utils/               # Alerts, Toasts, Thai Date Formatters
│       └── views/               # Modular UI Views (Dashboard, Rooms, Calendar, etc.)
├── templates/
│   └── index.html               # Single-Page Corporate Shell
├── scripts/
│   ├── seed_data.py             # Enterprise Demo Data Seeder
│   ├── run_server.py            # Web Server Launcher
│   └── test_system.py           # Comprehensive Test Suite
├── meeting_room.db              # SQLite Database (Foreign keys enforced)
└── requirements.txt             # Project Dependencies
```

---

## 🛡️ Business Rules & Validation

1. **การตรวจสอบการทับซ้อน (Interval Overlap):**
   ไม่อนุญาตให้มีการจองในห้องเดียวกันที่มีช่วงเวลาทับซ้อนกับการจองที่มีสถานะ `pending`, `approved`, หรือ `reserved`
2. **การตรวจสอบความจุ (Capacity Check):**
   จำนวนผู้เข้าร่วม (`attendees_count`) ต้องไม่เกินขนาดความจุสูงสุดของห้องประชุม
3. **การตรวจสอบการปิดปรับปรุง (Maintenance Lock):**
   ห้ามทำการจองห้องประชุมที่ถูกกำหนดสถานะเป็น `maintenance`
4. **การตรวจสอบสิทธิ์ (Ownership & RBAC):**
   ผู้ใช้ทั่วไปสามารถแก้ไขหรือยกเลิกได้เฉพาะการจองของตนเองเท่านั้น ส่วน Staff และ Admin สามารถจัดการและอนุมัติการจองของผู้อื่นได้
