import sys
import os

# Add the root directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.database import SessionLocal
from backend.app.models.employee import Employee
from backend.app.core.security import verify_password

def verify_admin():
    db = SessionLocal()
    admin = db.query(Employee).filter(Employee.email == "admin@company.com").first()
    if not admin:
        print("Admin user NOT found in database.")
        db.close()
        return

    password_to_check = "admin123"
    print(f"User: {admin.email}")
    print(f"Hashed Password in DB: {admin.hashed_password}")
    
    try:
        is_correct = verify_password(password_to_check, admin.hashed_password)
        print(f"Verification for '{password_to_check}': {'SUCCESS' if is_correct else 'FAILED'}")
    except Exception as e:
        print(f"Error during verification: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_admin()
