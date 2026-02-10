from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from ..database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default=UserRole.EMPLOYEE, nullable=False)

    employee = relationship("Employee", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")
