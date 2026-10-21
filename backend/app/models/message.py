from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_name = Column(String, nullable=False)
    sender_role = Column(String, nullable=False)  # "author", "admin", "system"
    content = Column(Text, nullable=False)
    
    # Internal notes are strictly for BookLeaf operations staff (hidden from authors)
    is_internal_note = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    ticket = relationship("Ticket", back_populates="messages")
    sender = relationship("User", back_populates="messages")
