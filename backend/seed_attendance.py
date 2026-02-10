from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.core.security import get_password_hash
from datetime import datetime, date, timedelta
import random

def seed_attendance():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Get admin user
        admin_user = db.query(User).filter(User.email == "admin@company.com").first()
        if not admin_user:
            # Create admin user if not exists
            admin_user = User(
                email="admin@company.com",
                hashed_password=get_password_hash("admin123"),
                role="ADMIN"
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

            # Create employee profile
            admin_employee = Employee(
                user_id=admin_user.id,
                employee_code="ADM001",
                name="Admin User",
                department="IT",
                designation="Administrator"
            )
            db.add(admin_employee)
            db.commit()
            db.refresh(admin_employee)
        else:
            admin_employee = db.query(Employee).filter(Employee.user_id == admin_user.id).first()

        # Generate attendance data for February 2026
        current_year = 2026
        current_month = 2  # February

        # Get the first day of February 2026
        first_day = date(current_year, current_month, 1)
        # Get the last day of February 2026
        if current_month == 2:
            last_day = date(current_year, current_month, 28)  # 2026 is not leap year
        else:
            last_day = date(current_year, current_month + 1, 1) - timedelta(days=1)

        # Clear existing attendance for this month
        db.query(Attendance).filter(
            Attendance.employee_id == admin.id,
            Attendance.date >= first_day,
            Attendance.date <= last_day
        ).delete()
        db.commit()

        # Generate attendance for each day
        current_date = first_day
        while current_date <= last_day:
            # Skip weekends (Saturday=5, Sunday=6)
            if current_date.weekday() >= 5:
                current_date += timedelta(days=1)
                continue

            # Randomly decide attendance status
            rand = random.random()
            if rand < 0.1:  # 10% absent
                status = "Absent"
                check_in = None
                check_out = None
            elif rand < 0.2:  # 10% half-day
                status = "Half-Day"
                check_in = datetime.combine(current_date, datetime.strptime("09:00", "%H:%M").time())
                check_out = datetime.combine(current_date, datetime.strptime("13:00", "%H:%M").time())
            elif rand < 0.3:  # 10% late
                status = "Late"
                check_in = datetime.combine(current_date, datetime.strptime("09:30", "%H:%M").time())
                check_out = datetime.combine(current_date, datetime.strptime("18:00", "%H:%M").time())
            else:  # 70% present
                status = "Present"
                check_in = datetime.combine(current_date, datetime.strptime("08:45", "%H:%M").time())
                check_out = datetime.combine(current_date, datetime.strptime("17:30", "%H:%M").time())

            if status != "Absent":
                attendance = Attendance(
                    employee_id=admin.id,
                    date=current_date,
                    check_in=check_in,
                    check_out=check_out,
                    status=status
                )
                db.add(attendance)

            current_date += timedelta(days=1)

        db.commit()
        print(f"Attendance data seeded for February {current_year}")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_attendance()
