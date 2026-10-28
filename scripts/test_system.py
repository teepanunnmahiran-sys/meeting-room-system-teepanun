import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("==================================================")
    print("[TEST] STARTING COMPREHENSIVE AUTOMATED TEST SUITE")
    print("==================================================")

    # 1. Health & Docs
    print("\n1. Testing Documentation & Health Endpoints...")
    res = client.get("/docs")
    assert res.status_code == 200, f"Docs failed: {res.status_code}"
    print("[PASS] Swagger UI /docs is accessible (HTTP 200)")

    # 2. Authentication Test
    print("\n2. Testing Authentication & RBAC...")
    # Admin login
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@company.com",
        "password": "admin1234"
    })
    assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] Admin login successful (JWT token acquired)")

    # User login
    user_res = client.post("/api/auth/login", json={
        "email": "user@company.com",
        "password": "user1234"
    })
    assert user_res.status_code == 200, f"User login failed: {user_res.text}"
    user_token = user_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}
    print("[PASS] General User login successful")

    # Manager login
    mgr_res = client.post("/api/auth/login", json={
        "email": "manager@company.com",
        "password": "manager1234"
    })
    assert mgr_res.status_code == 200, f"Manager login failed: {mgr_res.text}"
    print("[PASS] Manager login successful")

    # Invalid login test
    bad_res = client.post("/api/auth/login", json={
        "email": "admin@company.com",
        "password": "wrong_password"
    })
    assert bad_res.status_code == 401, "Expected 401 on bad password"
    print("[PASS] Invalid password correctly rejected (HTTP 401)")

    # 3. Room Management Test
    print("\n3. Testing Meeting Rooms API...")
    rooms_res = client.get("/api/rooms")
    assert rooms_res.status_code == 200
    rooms = rooms_res.json()
    assert len(rooms) >= 6, f"Expected 6 rooms, got {len(rooms)}"
    print(f"[PASS] Found {len(rooms)} meeting rooms with rich details & dynamic status")

    maint_room = next(r for r in rooms if r["code"] == "RM-601")
    assert maint_room["status"] == "maintenance"
    print("[PASS] Room RM-601 correctly flagged as 'maintenance'")

    # 4. Conflict Engine Validation Test
    print("\n4. Testing Zero-Conflict Booking Engine...")
    today = datetime.utcnow().date()
    room1 = next(r for r in rooms if r["code"] == "RM-101")
    room_id = room1["id"]

    # Conflict check 1: Overlapping with morning meeting (09:00 - 11:30)
    conflict_res = client.post("/api/bookings/check-conflict", json={
        "room_id": room_id,
        "start_time": f"{today}T09:30:00",
        "end_time": f"{today}T10:30:00",
        "attendees_count": 10
    })
    assert conflict_res.status_code == 200
    cf_data = conflict_res.json()
    assert cf_data["is_available"] is False, "Expected conflict not detected!"
    assert len(cf_data["alternative_rooms"]) > 0 or len(cf_data["alternative_slots"]) > 0
    print("[PASS] Conflict Engine successfully detected overlapping meeting and recommended alternatives!")

    # Conflict check 2: Capacity check
    cap_res = client.post("/api/bookings/check-conflict", json={
        "room_id": room_id,
        "start_time": f"{today}T18:00:00",
        "end_time": f"{today}T19:00:00",
        "attendees_count": 999  # Capacity is 30
    })
    assert cap_res.json()["is_available"] is False
    assert cap_res.json()["conflict_reason"] == "capacity"
    print("[PASS] Capacity validation successfully caught attendee count exceeding room limit")

    # Conflict check 3: Maintenance room check
    maint_check = client.post("/api/bookings/check-conflict", json={
        "room_id": maint_room["id"],
        "start_time": f"{today}T14:00:00",
        "end_time": f"{today}T15:00:00",
        "attendees_count": 10
    })
    assert maint_check.json()["is_available"] is False
    assert maint_check.json()["conflict_reason"] == "maintenance"
    print("[PASS] Maintenance check successfully blocked booking attempt on maintenance room")

    # 5. Create Booking Flow Test
    print("\n5. Testing End-to-End Booking Creation & Approval...")
    room4 = next(r for r in rooms if r["code"] == "RM-401")
    tomorrow = today + timedelta(days=2)

    new_b_res = client.post("/api/bookings", json={
        "room_id": room4["id"],
        "title": "Automated End-to-End Verification Meeting",
        "description": "Verifying database write, notification push, and approval workflow",
        "start_time": f"{tomorrow}T14:00:00",
        "end_time": f"{tomorrow}T15:30:00",
        "attendees_count": 4,
        "organizer_name": "สมชาย พัฒนาไทย",
        "organizer_contact": "083-777-0003",
        "equipment_ids": [1],
        "participants": [
            {"name": "สมชาย พัฒนาไทย", "email": "user@company.com", "role": "host"},
            {"name": "วิภาดา สิทธิการ", "email": "manager@company.com", "role": "attendee"}
        ]
    }, headers=user_headers)

    assert new_b_res.status_code == 201, f"Create booking failed: {new_b_res.text}"
    created_booking = new_b_res.json()
    b_id = created_booking["id"]
    assert created_booking["status"] == "pending"
    print(f"[PASS] User successfully created booking {created_booking['booking_code']} (Status: pending)")

    # Admin approves booking
    appr_res = client.post(f"/api/bookings/{b_id}/approve", headers=admin_headers)
    assert appr_res.status_code == 200, f"Approval failed: {appr_res.text}"
    assert appr_res.json()["status"] == "approved"
    print(f"[PASS] Admin approved booking {b_id} (Status: approved)")

    # 6. Calendar Events Test
    print("\n6. Testing Calendar Events API...")
    cal_res = client.get(f"/api/calendar/events?start={today}T00:00:00&end={tomorrow + timedelta(days=1)}T23:59:59")
    assert cal_res.status_code == 200
    events = cal_res.json()
    assert any(e["id"] == str(b_id) for e in events)
    print(f"[PASS] Calendar returned {len(events)} events including the newly approved booking")

    # 7. Dashboard Stats & Charts Test
    print("\n7. Testing Executive Dashboard API...")
    summary_res = client.get("/api/dashboard/summary")
    assert summary_res.status_code == 200
    s_data = summary_res.json()
    print(f"[PASS] Dashboard summary loaded: Total Rooms={s_data['total_rooms']}, Today's Bookings={s_data['today_bookings']}")

    charts_res = client.get("/api/dashboard/charts")
    assert charts_res.status_code == 200
    c_data = charts_res.json()
    assert "daily_trends" in c_data and "room_usage" in c_data
    print("[PASS] Dashboard analytical charts computed successfully")

    # 8. Reports & Exports Test
    print("\n8. Testing Reports Summary and File Exports...")
    rep_res = client.get("/api/reports/summary?range_type=month", headers=admin_headers)
    assert rep_res.status_code == 200
    r_data = rep_res.json()
    print(f"[PASS] Monthly report calculated: {r_data['total_bookings']} bookings, {r_data['total_hours']} hours")

    # Export Excel
    excel_res = client.get("/api/reports/export?format=xlsx&range_type=month", headers=admin_headers)
    assert excel_res.status_code == 200
    assert len(excel_res.content) > 1000
    print(f"[PASS] Export Excel (.xlsx) generated successfully ({len(excel_res.content)} bytes)")

    # Export CSV
    csv_res = client.get("/api/reports/export?format=csv&range_type=month", headers=admin_headers)
    assert csv_res.status_code == 200
    assert "Booking Code" in csv_res.text
    print("[PASS] Export CSV generated successfully")

    # Export PDF
    pdf_res = client.get("/api/reports/export?format=pdf&range_type=month", headers=admin_headers)
    assert pdf_res.status_code == 200
    assert len(pdf_res.content) > 1000
    print(f"[PASS] Export PDF generated successfully ({len(pdf_res.content)} bytes)")

    # 9. Audit Logs Test
    print("\n9. Testing Security & Audit Trail...")
    logs_res = client.get("/api/audit-logs", headers=admin_headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) > 0
    print(f"[PASS] Audit trail verified with {len(logs)} activity records logged")

    # RBAC protection test: User cannot access audit logs
    user_log_res = client.get("/api/audit-logs", headers=user_headers)
    assert user_log_res.status_code == 403
    print("[PASS] RBAC security verified: Normal user is forbidden from audit logs (HTTP 403)")

    print("\n==================================================")
    print("[SUCCESS] ALL TEST SUITES PASSED FLAWLESSLY! 100% SUCCESS")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
