from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(String, unique=True, index=True, nullable=True)  # e.g. AUTH001 (null for admins)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="author", nullable=False)  # "author" or "admin"
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    joined_date = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    books = relationship("Book", back_populates="author", cascade="all, delete-orphan")
    tickets_created = relationship(
        "Ticket",
        back_populates="author",
        foreign_keys="Ticket.author_id",
        cascade="all, delete-orphan"
    )
    tickets_assigned = relationship(
        "Ticket",
        back_populates="assigned_admin",
        foreign_keys="Ticket.assigned_admin_id"
    )
    messages = relationship("Message", back_populates="sender")
