from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String, unique=True, index=True, nullable=False)  # e.g. TCK-1001
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=True)  # Null if general inquiry
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)

    # Classification & Priority (set by AI, editable by Admin)
    category = Column(String, default="General Inquiry", nullable=False)
    priority = Column(String, default="Medium", nullable=False)  # Critical, High, Medium, Low
    status = Column(String, default="Open", nullable=False)  # Open, In Progress, Resolved, Closed

    # AI Integration fields
    ai_draft_response = Column(Text, nullable=True)
    ai_classification_reason = Column(String, nullable=True)

    # Management
    assigned_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    author = relationship("User", back_populates="tickets_created", foreign_keys=[author_id])
    assigned_admin = relationship("User", back_populates="tickets_assigned", foreign_keys=[assigned_admin_id])
    book = relationship("Book", back_populates="tickets")
    messages = relationship("Message", back_populates="ticket", cascade="all, delete-orphan", order_by="Message.created_at")
