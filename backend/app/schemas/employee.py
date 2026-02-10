from pydantic import BaseModel
from typing import Optional, List

class EmployeeBase(BaseModel):
    employee_code: str
    name: str
    department: Optional[str] = None
    designation: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    user_id: int

class EmployeeUpdate(BaseModel):
    employee_code: Optional[str] = None
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class EmployeeList(BaseModel):
    items: List[EmployeeOut]
    total: int
    page: int
    size: int
