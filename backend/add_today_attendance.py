import sqlite3
from datetime import datetime, date

def add_today_attendance():
    # Connect to the database
    conn = sqlite3.connect('attendance.db')
    cursor = conn.cursor()

    try:
        # Get today's date (February 11, 2026 for demo)
        today = date(2026, 2, 11)

        # Check if admin user exists
        cursor.execute("SELECT id FROM users WHERE email = ?", ("admin@company.com",))
        user_result = cursor.fetchone()

        if not user_result:
            # Create admin user
            cursor.execute("""
                INSERT INTO users (name, email, password_hash, role)
                VALUES (?, ?, ?, ?)
            """, ("Admin User", "admin@company.com", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeK8JcKpYPzVzVzO", "ADMIN"))
            user_id = cursor.lastrowid

            # Create employee profile
            cursor.execute("""
                INSERT INTO employees (user_id, employee_code, name, department, designation)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, "ADM001", "Admin User", "IT", "Administrator"))
            employee_id = cursor.lastrowid
        else:
            user_id = user_result[0]
            cursor.execute("SELECT id FROM employees WHERE user_id = ?", (user_id,))
            employee_result = cursor.fetchone()
            if employee_result:
                employee_id = employee_result[0]
            else:
                # Create employee profile if missing
                cursor.execute("""
                    INSERT INTO employees (user_id, employee_code, name, department, designation)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, "ADM001", "Admin User", "IT", "Administrator"))
                employee_id = cursor.lastrowid

        # Delete existing attendance for today
        cursor.execute("DELETE FROM attendance WHERE employee_id = ? AND date = ?", (employee_id, today.isoformat()))

        # Add today's attendance - Present status
        check_in = datetime.combine(today, datetime.strptime("08:45", "%H:%M").time())
        check_out = datetime.combine(today, datetime.strptime("17:30", "%H:%M").time())

        cursor.execute("""
            INSERT INTO attendance (employee_id, date, check_in, check_out, status)
            VALUES (?, ?, ?, ?, ?)
        """, (employee_id, today.isoformat(), check_in.isoformat(), check_out.isoformat(), "Present"))

        # Add some historical data for February 2026
        import random
        for day in range(1, 12):  # Feb 1-11
            if day == 11:  # Skip today, already added
                continue

            current_date = date(2026, 2, day)

            # Skip weekends
            if current_date.weekday() >= 5:
                continue

            # Random attendance
            rand = random.random()
            if rand < 0.1:
                status = "Absent"
                check_in_time = None
                check_out_time = None
            elif rand < 0.2:
                status = "Half-Day"
                check_in_time = datetime.combine(current_date, datetime.strptime("09:00", "%H:%M").time())
                check_out_time = datetime.combine(current_date, datetime.strptime("13:00", "%H:%M").time())
            elif rand < 0.3:
                status = "Late"
                check_in_time = datetime.combine(current_date, datetime.strptime("09:30", "%H:%M").time())
                check_out_time = datetime.combine(current_date, datetime.strptime("18:00", "%H:%M").time())
            else:
                status = "Present"
                check_in_time = datetime.combine(current_date, datetime.strptime("08:45", "%H:%M").time())
                check_out_time = datetime.combine(current_date, datetime.strptime("17:30", "%H:%M").time())

            # Delete existing
            cursor.execute("DELETE FROM attendance WHERE employee_id = ? AND date = ?", (employee_id, current_date.isoformat()))

            if status != "Absent":
                cursor.execute("""
                    INSERT INTO attendance (employee_id, date, check_in, check_out, status)
                    VALUES (?, ?, ?, ?, ?)
                """, (employee_id, current_date.isoformat(), check_in_time.isoformat(), check_out_time.isoformat(), status))

        conn.commit()
        print("Attendance data added successfully for February 2026!")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_today_attendance()
