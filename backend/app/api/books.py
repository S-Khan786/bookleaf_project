from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.book import Book
from app.models.user import User
from app.schemas.all_schemas import BookResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/books", tags=["Books & Royalties"])


@router.get("", response_model=List[BookResponse])
def get_books(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves books based on role:
    - Authors only receive their own books with royalty stats.
    - Admins receive the full catalog across all authors.
    """
    if current_user.role == "admin":
        books = db.query(Book).all()
    else:
        books = db.query(Book).filter(Book.author_id == current_user.id).all()
    
    return [BookResponse.model_validate(b) for b in books]


@router.get("/{book_id}", response_model=BookResponse)
def get_book_by_id(
    book_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetches details of a specific book with role-based ownership validation."""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with id {book_id} not found"
        )

    # Role validation: Authors cannot view other authors' book royalty data
    if current_user.role != "admin" and book.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not own this book"
        )

    return BookResponse.model_validate(book)
