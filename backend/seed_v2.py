import sys
import os
from pathlib import Path

# Add the current directory to sys.path
sys.path.append(os.path.abspath(os.curdir))

from app.database import SessionLocal, engine, Base
from app.models.employee import Employee
from app.core.security import get_password_hash

def seed_manual():
    print("Starting manual seed...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        email = "admin@company.com"
        password = "admin123"
        
        admin = db.query(Employee).filter(Employee.email == email).first()
        if not admin:
            print(f"Creating admin user: {email}")
            hashed_pw = get_password_hash(password)
            print(f"Hashed password generated: {hashed_pw[:10]}...")
            
            admin = Employee(
                name="Admin User",
                email=email,
                hashed_password=hashed_pw,
                role="ADMIN"
            )
            db.add(admin)
            db.commit()
            print("Admin user created successfully!")
        else:
            print("Admin user already exists.")
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_manual()
