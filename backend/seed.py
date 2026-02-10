from app.database import SessionLocal, engine, Base
from app.models.employee import Employee
from app.core.security import get_password_hash
from datetime import date

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if admin exists
    admin = db.query(Employee).filter(Employee.email == "admin@company.com").first()
    if not admin:
        admin = Employee(
            name="Admin User",
            email="admin@company.com",
            hashed_password=get_password_hash("admin123"),
            role="ADMIN"
        )
        db.add(admin)
        db.commit()
        print("Admin user created: admin@company.com / admin123")
    else:
        print("Admin user already exists")
    
    db.close()

if __name__ == "__main__":
    seed()
