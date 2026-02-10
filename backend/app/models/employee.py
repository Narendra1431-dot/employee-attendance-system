from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    employee_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, nullable=True)
    designation = Column(String, nullable=True)

    user = relationship("User", back_populates="employee")
    attendances = relationship("Attendance", back_populates="employee")
