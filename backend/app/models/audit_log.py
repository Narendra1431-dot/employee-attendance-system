from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    details = Column(String, nullable=True) # JSON-like string for extra context

    user = relationship("User", back_populates="audit_logs")
