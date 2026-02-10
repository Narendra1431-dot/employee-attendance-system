from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.config import SystemConfig
from ..models.user import User
from ..schemas.config import ConfigCreate, ConfigOut
from ..core.dependencies import admin_required
from typing import List

router = APIRouter()

@router.get("/", response_model=List[ConfigOut])
def get_all_config(db: Session = Depends(get_db), _: User = Depends(admin_required)):
    return db.query(SystemConfig).all()

@router.get("/{key}", response_model=ConfigOut)
def get_config(key: str, db: Session = Depends(get_db)):
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if not config:
        raise HTTPException(status_code=404, detail=f"Configuration '{key}' not found")
    return config

@router.post("/", response_model=ConfigOut)
def set_config(obj_in: ConfigCreate, db: Session = Depends(get_db), _: User = Depends(admin_required)):
    config = db.query(SystemConfig).filter(SystemConfig.key == obj_in.key).first()
    if config:
        config.value = obj_in.value
        config.description = obj_in.description
    else:
        config = SystemConfig(**obj_in.model_dump())
        db.add(config)
    
    db.commit()
    db.refresh(config)
    return config
