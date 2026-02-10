from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from ..database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    check_in = Column(DateTime, nullable=False)
    check_out = Column(DateTime, nullable=True)
    status = Column(String, nullable=False) # Present, Late, Half-Day, Absent
    notes = Column(String, nullable=True)

    employee = relationship("Employee", back_populates="attendances")

    __table_args__ = (
        UniqueConstraint('employee_id', 'date', name='_employee_date_uc'),
    )
