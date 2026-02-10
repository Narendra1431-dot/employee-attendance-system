from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.attendance import Attendance
from ..models.employee import Employee
from ..models.user import User
from ..models.config import SystemConfig
from ..models.audit_log import AuditLog
from ..schemas.attendance import AttendanceCreate, Attendance as AttendanceSchema, AttendanceUpdate, AttendanceManualCreate
from ..core.dependencies import get_current_user, manager_required

from datetime import datetime, date as date_obj, time, timedelta
from typing import List, Optional

router = APIRouter()

def get_config_val(db: Session, key: str, default: any):
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    return config.value if config else default

@router.post("/clock", response_model=AttendanceSchema)
def clock_action(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    today = date_obj.today()
    now = datetime.now()
    
    existing = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.date == today
    ).first()

    office_start_str = get_config_val(db, "office_start", "09:00")
    grace_mins = int(get_config_val(db, "grace_period", 15))
    
    office_start_time = time.fromisoformat(office_start_str)
    office_start_dt = datetime.combine(today, office_start_time)
    grace_limit = office_start_dt + timedelta(minutes=grace_mins)

    if existing:
        if existing.check_out:
            raise HTTPException(status_code=400, detail="Already checked out for today")
        
        # Clock Out
        existing.check_out = now
        
        # Recalculate status for Half-Day if necessary
        duration = (existing.check_out - existing.check_in).total_seconds()
        if duration < 4 * 3600:
            existing.status = "Half-Day"
        # If it was Late, it stays Late unless we want to prioritize Half-Day?
        # Let's say: if Late and < 4h -> Half-Day. If Late and > 4h -> Late.
        
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Clock In
        status = "Present"
        if now > grace_limit:
            status = "Late"
            
        new_attendance = Attendance(
            employee_id=employee.id,
            date=today,
            check_in=now,
            status=status
        )
        db.add(new_attendance)
        db.commit()
        db.refresh(new_attendance)
        return new_attendance

@router.get("/", response_model=List[AttendanceSchema])
def get_history(
    employee_id: Optional[int] = None, 
    start_date: Optional[date_obj] = None,
    end_date: Optional[date_obj] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Attendance)
    
    # If not manager/admin, can only see own history
    if current_user.role == "EMPLOYEE":
        employee = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        query = query.filter(Attendance.employee_id == employee.id)
    elif employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
        
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)
        
    return query.order_by(Attendance.date.desc()).all()

@router.patch("/{attendance_id}", response_model=AttendanceSchema)
def update_attendance(
    attendance_id: int,
    obj_in: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(manager_required)
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    # Record the action in AuditLog
    details = f"User {current_user.email} corrected attendance {attendance_id}. Reason: {obj_in.reason}. "
    details += f"Changes: "
    
    update_data = obj_in.model_dump(exclude_unset=True, exclude={"reason"})
    for field in update_data:
        old_val = getattr(attendance, field)
        new_val = update_data[field]
        details += f"{field}: {old_val} -> {new_val}; "
        setattr(attendance, field, new_val)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="ATTENDANCE_CORRECTION",
        details=details
    )
    db.add(audit)
    db.commit()
    db.refresh(attendance)
    return attendance

@router.post("/manual", response_model=AttendanceSchema)
def create_manual_attendance(
    obj_in: AttendanceManualCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(manager_required)
):
    # Check if record already exists
    existing = db.query(Attendance).filter(
        Attendance.employee_id == obj_in.employee_id,
        Attendance.date == obj_in.date
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Attendance record already exists for this date")
    
    new_record = Attendance(
        employee_id=obj_in.employee_id,
        date=obj_in.date,
        check_in=obj_in.check_in,
        check_out=obj_in.check_out,
        status=obj_in.status,
        notes=obj_in.notes
    )
    db.add(new_record)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="MANUAL_ATTENDANCE_ENTRY",
        details=f"Admin {current_user.email} manually added attendance for employee {obj_in.employee_id} on {obj_in.date}"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(new_record)
    return new_record

@router.delete("/{attendance_id}")
def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(manager_required)
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    # Audit log before deletion
    details = f"Admin {current_user.email} deleted attendance ID {attendance_id} (Employee: {attendance.employee_id}, Date: {attendance.date})"
    audit = AuditLog(
        user_id=current_user.id,
        action="ATTENDANCE_DELETION",
        details=details
    )
    db.add(audit)
    
    db.delete(attendance)
    db.commit()
    return {"detail": "Attendance record deleted successfully"}

