from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserRole
from ..models.employee import Employee
from ..schemas.user import UserCreate, Token, UserOut
from ..core.security import verify_password, create_access_token, get_password_hash
from ..core.dependencies import get_current_user
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter()

@router.post("/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pass = get_password_hash(user_in.password)
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_pass,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # If the user is an employee, create the employee profile
    if new_user.role == UserRole.EMPLOYEE:
        # Generate a simple employee code if not provided or handled elsewhere
        emp_code = f"EMP-{new_user.id:04d}"
        new_employee = Employee(
            user_id=new_user.id,
            employee_code=emp_code,
            name=new_user.name
        )
        db.add(new_employee)
        db.commit()
    
    return new_user

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "id": user.id, 
        "role": user.role, 
        "name": user.name
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
