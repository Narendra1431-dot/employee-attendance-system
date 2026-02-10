from pydantic import BaseModel
from typing import Optional, Dict, Any

class ConfigBase(BaseModel):
    key: str
    value: Any
    description: Optional[str] = None

class ConfigCreate(ConfigBase):
    pass

class ConfigOut(ConfigBase):
    id: int

    class Config:
        from_attributes = True
