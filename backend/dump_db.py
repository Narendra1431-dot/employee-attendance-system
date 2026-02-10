import sqlite3
import os

db_path = "backend/attendance.db"

def dump_employees():
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM employees;")
        rows = cursor.fetchall()
        print(f"Total rows in employees table: {len(rows)}")
        for row in rows:
            print(row)
    except Exception as e:
        print(f"Error reading employees table: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    dump_employees()
