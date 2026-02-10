from sqlalchemy import Column, Integer, String, Time, JSON
from ..database import Base

class SystemConfig(Base):
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False) # e.g., 'office_timings'
    value = Column(JSON, nullable=False) # e.g., {"start": "09:00", "end": "18:00"}
    description = Column(String, nullable=True)
