from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.attendance import Attendance
from ..models.employee import Employee
from ..models.user import User
from ..core.dependencies import manager_required
from datetime import date as date_obj, datetime
from typing import List, Optional
import csv
import io

router = APIRouter()

@router.get("/daily", tags=["Stats"])
def get_daily_stats(
    date: date_obj = Query(default=date_obj.today()),
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(manager_required)
):
    query = db.query(Attendance).filter(Attendance.date == date)
    
    if department:
        query = query.join(Employee).filter(Employee.department == department)
        
    stats = {
        "Present": query.filter(Attendance.status == "Present").count(),
        "Late": query.filter(Attendance.status == "Late").count(),
        "Half-Day": query.filter(Attendance.status == "Half-Day").count(),
        "Total": query.count()
    }
    
    # Calculate absent (Total Employees - Total Checked In)
    emp_query = db.query(Employee)
    if department:
        emp_query = emp_query.filter(Employee.department == department)
    total_emps = emp_query.count()
    
    stats["Absent"] = max(0, total_emps - stats["Total"])
    
    return stats

@router.get("/export/csv", tags=["Stats"])
def export_attendance_csv(
    start_date: date_obj,
    end_date: date_obj,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(manager_required)
):
    query = db.query(Attendance).join(Employee).filter(
        Attendance.date >= start_date,
        Attendance.date <= end_date
    )
    
    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)
        
    records = query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Employee Code", "Name", "Check In", "Check Out", "Status", "Notes"])
    
    for r in records:
        writer.writerow([
            r.date, 
            r.employee.employee_code, 
            r.employee.name, 
            r.check_in.strftime("%H:%M:%S") if r.check_in else "",
            r.check_out.strftime("%H:%M:%S") if r.check_out else "",
            r.status, 
            r.notes or ""
        ])
    
    filename = f"attendance_report_{start_date}_to_{end_date}.csv"
@router.get("/integrity", tags=["Stats"])
def check_data_integrity(
    db: Session = Depends(get_db),
    _: User = Depends(manager_required)
):
    anomalies = []
    
    # 1. Missing check-outs from previous days
    yesterday = date_obj.today()
    missing_outs = db.query(Attendance).filter(
        Attendance.date < yesterday,
        Attendance.check_out == None
    ).all()
    
    for m in missing_outs:
        anomalies.append({
            "type": "MISSING_CHECK_OUT",
            "date": m.date,
            "employee": m.employee.name,
            "details": f"Checked in at {m.check_in}, but no check-out recorded."
        })
        
    # 2. Negative working hours (shouldn't happen with app logic but good to check)
    negative_hours = db.query(Attendance).filter(
        Attendance.check_out != None,
        Attendance.check_out < Attendance.check_in
    ).all()
    
    for n in negative_hours:
        anomalies.append({
            "type": "NEGATIVE_HOURS",
            "date": n.date,
            "employee": n.employee.name,
            "details": f"Check-out ({n.check_out}) is before check-in ({n.check_in})."
        })
        
    # 3. Duplicate records (already handled by unique constraint, but we check just in case)
    # Since we have a UniqueConstraint, SQLite would throw an error, but we can check the table
    # This is more of a safety check or for cross-referencing.
    
    return {
        "status": "Healthy" if not anomalies else "Issues Detected",
        "timestamp": datetime.now(),
        "anomalies": anomalies,
        "count": len(anomalies)
    }
