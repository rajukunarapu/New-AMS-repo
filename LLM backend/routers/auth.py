"""
routers/auth.py - Optional direct login helper.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from ams_api import AMSApi

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str = Field(..., description="User AMS email address", example="user@neovatic.com")
    password: str = Field(..., description="User AMS password", example="SecurePass123!")


class LoginResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    token_type: str = "Bearer"
    data: Optional[Dict[str, Any]] = None


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login to AMS and generate Bearer token (Optional utility)",
    description="Authenticates against the backend AMS server using email and password, returning the JWT Bearer token."
)
def login(request: LoginRequest):
    try:
        ams = AMSApi(email=request.email, password=request.password)
        token = ams.authenticate()
        return LoginResponse(
            success=True,
            message="Login successful.",
            token=token,
            token_type=ams.token_type or "Bearer",
            data={"email": request.email}
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(err)}"
        )
