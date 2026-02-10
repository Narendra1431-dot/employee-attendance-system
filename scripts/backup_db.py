import shutil
import os
from datetime import datetime
from pathlib import Path

# Paths
DB_PATH = Path("backend/attendance.db")
BACKUP_DIR = Path("backups")

def run_backup():
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        return

    BACKUP_DIR.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"attendance_backup_{timestamp}.db"
    
    try:
        shutil.copy2(DB_PATH, backup_file)
        print(f"Success: Backup created at {backup_file}")
        
        # Keep only last 5 backups
        backups = sorted(BACKUP_DIR.glob("*.db"), key=os.path.getmtime)
        if len(backups) > 5:
            for old_backup in backups[:-5]:
                old_backup.unlink()
                print(f"Removed old backup: {old_backup}")
                
    except Exception as e:
        print(f"Error during backup: {e}")

if __name__ == "__main__":
    run_backup()
