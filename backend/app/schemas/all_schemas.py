from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ==========================================
# Auth & User Schemas
# ==========================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    author_id: Optional[str] = None
    name: str
    email: EmailStr
    role: str
    phone: Optional[str] = None
    city: Optional[str] = None
    joined_date: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Book Schemas
# ==========================================

class BookResponse(BaseModel):
    id: int
    book_id: str
    author_id: int
    title: str
    isbn: Optional[str] = None
    genre: Optional[str] = None
    publication_date: Optional[str] = None
    status: str
    mrp: Optional[float] = None
    author_royalty_per_copy: Optional[float] = None
    total_copies_sold: int
    total_royalty_earned: float
    royalty_paid: float
    royalty_pending: float
    last_royalty_payout_date: Optional[str] = None
    print_partner: Optional[str] = None
    available_on: List[str] = []

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Message Schemas
# ==========================================

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    is_internal_note: bool = False


class MessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_id: int
    sender_name: str
    sender_role: str
    content: str
    is_internal_note: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Ticket Schemas
# ==========================================

class TicketCreate(BaseModel):
    book_id: Optional[int] = None  # None for General / Account Level
    subject: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)


class TicketUpdate(BaseModel):
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_admin_id: Optional[int] = None
    ai_draft_response: Optional[str] = None


class TicketResponse(BaseModel):
    id: int
    ticket_number: str
    author_id: int
    book_id: Optional[int] = None
    subject: str
    description: str
    category: str
    priority: str
    status: str
    ai_draft_response: Optional[str] = None
    ai_classification_reason: Optional[str] = None
    assigned_admin_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested relations
    author: Optional[UserResponse] = None
    book: Optional[BookResponse] = None
    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)


class TicketListResponse(BaseModel):
    id: int
    ticket_number: str
    author_id: int
    author_name: str
    book_title: Optional[str] = None
    subject: str
    category: str
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime
    messages_count: int = 0

    model_config = ConfigDict(from_attributes=True)
