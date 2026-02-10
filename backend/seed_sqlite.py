import sqlite3
import bcrypt
import os

db_path = "backend/attendance.db"

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed_direct():
    print(f"Opening database at {db_path}...")
    if not os.path.exists(db_path):
        print("Database file doesn't exist yet. Creating...")
        # We assume the table 'employees' is already created by SQLAlchemy Base.metadata.create_all
        # If not, we might need to create it here too, but uvicorn should have done it.
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='employees';")
    if not cursor.fetchone():
        print("Table 'employees' doesn't exist. Creating manually...")
        cursor.execute("""
            CREATE TABLE employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                hashed_password TEXT,
                role TEXT
            );
        """)

    email = "admin@company.com"
    password = "admin123"
    
    cursor.execute("SELECT id FROM employees WHERE email = ?", (email,))
    if not cursor.fetchone():
        print(f"Inserting admin user: {email}")
        hashed_pw = get_password_hash(password)
        cursor.execute("""
            INSERT INTO employees (name, email, hashed_password, role)
            VALUES (?, ?, ?, ?)
        """, ("Admin User", email, hashed_pw, "ADMIN"))
        conn.commit()
        print("Admin user inserted successfully!")
    else:
        print("Admin user already exists in SQLite.")
    
    conn.close()

if __name__ == "__main__":
    seed_direct()
