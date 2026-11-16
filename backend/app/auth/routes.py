
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional

from .database import (
    get_user_by_username,
    get_user_by_email,
    create_user
)
from .security import (
    verify_password,
    hash_password,
    create_access_token
)
from .dependencies import get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Request models
class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=8)
    role: str = "store_manager"
    store_id: Optional[str] = None


# Login
@router.post("/login")
def login(request: LoginRequest):

    user = get_user_by_username(request.username)

    if not user or not verify_password(
        request.password,
        user["hashed_password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )

    access_token = create_access_token({
        "sub": user["username"],
        "role": user["role"]
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "store_id": user["store_id"]
        }
    }


# Get logged-in user's profile
@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):

    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"],
        "role": current_user["role"],
        "store_id": current_user["store_id"]
    }


# Admin-only user registration
@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED
)
def register(
    request: RegisterRequest,
    admin: dict = Depends(require_admin)
):

    if request.role not in ["admin", "store_manager"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid user role"
        )

    if get_user_by_username(request.username):
        raise HTTPException(
            status_code=409,
            detail="Username already exists"
        )

    if get_user_by_email(request.email):
        raise HTTPException(
            status_code=409,
            detail="Email already exists"
        )

    hashed_password = hash_password(request.password)

    user_id = create_user(
        username=request.username,
        email=request.email,
        hashed_password=hashed_password,
        role=request.role,
        store_id=request.store_id
    )

    return {
        "message": "User created successfully",
        "user_id": user_id,
        "username": request.username,
        "role": request.role
    }
