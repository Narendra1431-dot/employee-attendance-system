from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.employee import Employee
from ..models.user import User, UserRole
from ..schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeList
from ..core.dependencies import manager_required, admin_required
from typing import Optional

router = APIRouter()

@router.get("/", response_model=EmployeeList)
def get_employees(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    department: Optional[str] = None,
    _: User = Depends(manager_required)
):
    query = db.query(Employee)
    
    if search:
        query = query.filter(
            (Employee.name.ilike(f"%{search}%")) | 
            (Employee.employee_code.ilike(f"%{search}%"))
        )
    
    if department:
        query = query.filter(Employee.department == department)
        
    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db), _: User = Depends(manager_required)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(
    employee_id: int, 
    obj_in: EmployeeUpdate, 
    db: Session = Depends(get_db), 
    _: User = Depends(manager_required)
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check unique constraint if employee_code is changing
    if obj_in.employee_code and obj_in.employee_code != employee.employee_code:
        duplicate = db.query(Employee).filter(Employee.employee_code == obj_in.employee_code).first()
        if duplicate:
            raise HTTPException(status_code=400, detail="Employee code already exists")

    update_data = obj_in.model_dump(exclude_unset=True)
    for field in update_data:
        setattr(employee, field, update_data[field])
    
    db.commit()
    db.refresh(employee)
    return employee

@router.delete("/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db), _: User = Depends(admin_required)):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Also delete the associated user
    user = db.query(User).filter(User.id == employee.user_id).first()
    
    db.delete(employee)
    if user:
        db.delete(user)
        
    db.commit()
    return {"message": "Employee and associated user deleted"}
