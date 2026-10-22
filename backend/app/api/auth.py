from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.all_schemas import LoginRequest, TokenResponse, UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Unified JSON login endpoint for Author portal, Admin portal, and Swagger."""
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "email": user.email},
        expires_delta=access_token_expires
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Fetches profile details of the authenticated user."""
    return UserResponse.model_validate(current_user)


@router.get("/demo-accounts")
def get_demo_accounts(db: Session = Depends(get_db)):
    """Provides a list of seeded demo accounts for convenient one-click testing in the UI."""
    admin = db.query(User).filter(User.role == "admin").first()
    authors = db.query(User).filter(User.role == "author").limit(5).all()

    return {
        "admin": {
            "email": admin.email if admin else "admin@bookleaf.com",
            "role": "admin",
            "password": "admin123"
        },
        "authors": [
            {
                "id": a.id,
                "name": a.name,
                "email": a.email,
                "author_id": a.author_id,
                "role": "author",
                "password": "author123"
            }
            for a in authors
        ]
    }
