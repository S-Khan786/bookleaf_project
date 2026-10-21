from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(String, unique=True, index=True, nullable=False)  # e.g. BK001
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    isbn = Column(String, nullable=True)  # Nullable for books in production
    genre = Column(String, nullable=True)
    publication_date = Column(String, nullable=True)
    status = Column(String, nullable=False)  # e.g. "Published & Live", "In Production - Typesetting"
    mrp = Column(Float, nullable=True)
    author_royalty_per_copy = Column(Float, nullable=True)
    total_copies_sold = Column(Integer, default=0)
    total_royalty_earned = Column(Float, default=0.0)
    royalty_paid = Column(Float, default=0.0)
    royalty_pending = Column(Float, default=0.0)
    last_royalty_payout_date = Column(String, nullable=True)
    print_partner = Column(String, nullable=True)
    available_on = Column(JSON, default=list)  # e.g. ["Amazon India", "Flipkart"]

    # Relationships
    author = relationship("User", back_populates="books")
    tickets = relationship("Ticket", back_populates="book")
