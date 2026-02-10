from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

class AttendanceBase(BaseModel):
    date: date
    check_in: datetime
    check_out: Optional[datetime] = None
    status: str
    notes: Optional[str] = None

class AttendanceCreate(BaseModel):
    employee_id: int

class AttendanceManualCreate(BaseModel):
    employee_id: int
    date: date
    check_in: datetime
    check_out: Optional[datetime] = None
    status: str
    notes: Optional[str] = None

class Attendance(AttendanceBase):
    id: int
    employee_id: int

    class Config:
        from_attributes = True

class AttendanceUpdate(BaseModel):
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    reason: str # Required for audit trail

