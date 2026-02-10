import pytest
from datetime import datetime, time, date

def calculate_status_logic(check_in_dt, office_start_dt, grace_mins):
    grace_limit = office_start_dt.replace(hour=office_start_dt.hour, minute=office_start_dt.minute + grace_mins)
    # This is a simplified version for testing the logic independently
    if check_in_dt > grace_limit:
        return "Late"
    return "Present"

def test_on_time_attendance():
    office_start = datetime.combine(date.today(), time(9, 0))
    check_in = datetime.combine(date.today(), time(9, 5))
    assert calculate_status_logic(check_in, office_start, 15) == "Present"

def test_late_attendance():
    office_start = datetime.combine(date.today(), time(9, 0))
    check_in = datetime.combine(date.today(), time(9, 20))
    assert calculate_status_logic(check_in, office_start, 15) == "Late"

def test_exact_grace_attendance():
    office_start = datetime.combine(date.today(), time(9, 0))
    check_in = datetime.combine(date.today(), time(9, 15))
    assert calculate_status_logic(check_in, office_start, 15) == "Present"
