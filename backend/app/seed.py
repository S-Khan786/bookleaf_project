import json
import os
import sys
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.user import User
from app.models.book import Book
from app.models.ticket import Ticket
from app.models.message import Message


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "bookleaf_sample_data.json"


def seed_database():
    """Initializes the database schema and loads the BookLeaf sample data."""
    print("=" * 60)
    print("Seeding BookLeaf Support Portal Database...")
    print("=" * 60)

    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 2. Create Admin user
        admin_email = "admin@bookleaf.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                name="BookLeaf Ops Lead",
                email=admin_email,
                hashed_password=hash_password("admin123"),
                role="admin",
                city="Delhi",
                phone="+91-11-2345-6789",
                joined_date="2022-01-01"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"[OK] Created Admin: {admin.email} (Password: admin123)")
        else:
            print(f"[INFO] Admin {admin_email} already exists.")

        # 3. Load Sample Data JSON
        if not DATA_FILE.exists():
            print(f"[ERROR] Data file not found at {DATA_FILE}")
            return

        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        authors_data = data.get("authors", [])
        total_authors_created = 0
        total_books_created = 0

        for author_dict in authors_data:
            email = author_dict["email"]
            user = db.query(User).filter(User.email == email).first()

            if not user:
                user = User(
                    author_id=author_dict["author_id"],
                    name=author_dict["name"],
                    email=email,
                    hashed_password=hash_password("author123"),
                    role="author",
                    phone=author_dict.get("phone"),
                    city=author_dict.get("city"),
                    joined_date=author_dict.get("joined_date")
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                total_authors_created += 1

            # Insert author's books
            for book_dict in author_dict.get("books", []):
                book_id = book_dict["book_id"]
                existing_book = db.query(Book).filter(Book.book_id == book_id).first()
                if not existing_book:
                    book = Book(
                        book_id=book_id,
                        author_id=user.id,
                        title=book_dict["title"],
                        isbn=book_dict.get("isbn"),
                        genre=book_dict.get("genre"),
                        publication_date=book_dict.get("publication_date"),
                        status=book_dict.get("status", "Draft"),
                        mrp=book_dict.get("mrp"),
                        author_royalty_per_copy=book_dict.get("author_royalty_per_copy"),
                        total_copies_sold=book_dict.get("total_copies_sold", 0),
                        total_royalty_earned=book_dict.get("total_royalty_earned", 0.0),
                        royalty_paid=book_dict.get("royalty_paid", 0.0),
                        royalty_pending=book_dict.get("royalty_pending", 0.0),
                        last_royalty_payout_date=book_dict.get("last_royalty_payout_date"),
                        print_partner=book_dict.get("print_partner"),
                        available_on=book_dict.get("available_on", [])
                    )
                    db.add(book)
                    total_books_created += 1

        db.commit()
        print(f"[OK] Authors registered: {total_authors_created} (Default password: author123)")
        print(f"[OK] Books imported: {total_books_created}")

        # 4. Create sample initial tickets if none exist
        if db.query(Ticket).count() == 0:
            priya = db.query(User).filter(User.email == "priya.sharma@email.com").first()
            priya_book = db.query(Book).filter(Book.book_id == "BK001").first()

            if priya:
                t1 = Ticket(
                    ticket_number="TCK-1001",
                    author_id=priya.id,
                    book_id=priya_book.id if priya_book else None,
                    subject="Inquiry regarding pending royalty disbursement",
                    description="I published my book 4 months ago and still haven't received my pending royalty of Rs.3,570. Could you please check when the next payout will occur?",
                    category="Royalty & Payments",
                    priority="High",
                    status="Open",
                    ai_draft_response=(
                        "Dear Priya,\n\n"
                        "Thank you for contacting BookLeaf Support. We understand your concern regarding the pending royalty of Rs. 3,570 for 'Whispers of the Ganges'.\n\n"
                        "As per BookLeaf policy, royalties are calculated quarterly and disbursed within 45 days of the quarter ending. Since your pending balance exceeds our minimum payout threshold of Rs. 1,000, your payment is scheduled for the upcoming cycle on November 15th via bank transfer.\n\n"
                        "Please verify that your bank details in your account profile are up-to-date. If you need any further assistance, feel free to reply directly.\n\n"
                        "Warm regards,\nBookLeaf Operations Team"
                    ),
                    ai_classification_reason="Query explicitly references delayed royalty payment of 4 months and pending balance."
                )
                db.add(t1)
                db.commit()
                db.refresh(t1)

                m1 = Message(
                    ticket_id=t1.id,
                    sender_id=priya.id,
                    sender_name=priya.name,
                    sender_role="author",
                    content=t1.description,
                    is_internal_note=False
                )
                db.add(m1)
                db.commit()
                print("[OK] Seeded initial sample ticket: TCK-1001 (Priya Sharma)")

        print("=" * 60)
        print("Database seeding completed successfully!")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database seeding failed: {e}")
        raise
    finally:
        db.close()



if __name__ == "__main__":
    seed_database()
