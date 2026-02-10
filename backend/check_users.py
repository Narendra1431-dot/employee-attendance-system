from app.database import SessionLocal
from app.models.employee import Employee
from app.models.attendance import Attendance # Ensure metadata knows about all models

def list_users():
    db = SessionLocal()
    try:
        users = db.query(Employee).all()
        print("Total users in database:", len(users))
        for u in users:
            print(f"ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
