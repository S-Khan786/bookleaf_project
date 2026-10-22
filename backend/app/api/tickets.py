from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, case
from app.core.database import get_db
from app.models.ticket import Ticket
from app.models.message import Message
from app.models.book import Book
from app.models.user import User
from app.schemas.all_schemas import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketListResponse,
    MessageCreate,
    MessageResponse
)
from app.api.deps import get_current_user, get_current_admin
from app.services.ai_service import analyze_ticket_and_draft_response

router = APIRouter(prefix="/api/tickets", tags=["Tickets & AI Operations"])


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits a new support ticket.
    - Resolves book details if specified.
    - Immediately calls the AI engine for auto-classification, priority scoring, and draft generation.
    - Saves ticket and initial message.
    """
    book_info = None
    if ticket_in.book_id:
        book = db.query(Book).filter(Book.id == ticket_in.book_id).first()
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected book not found"
            )
        if current_user.role != "admin" and book.author_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot raise tickets for books you do not own"
            )
        book_info = {
            "title": book.title,
            "isbn": book.isbn,
            "status": book.status,
            "total_copies_sold": book.total_copies_sold,
            "total_royalty_earned": book.total_royalty_earned,
            "royalty_paid": book.royalty_paid,
            "royalty_pending": book.royalty_pending,
            "last_royalty_payout_date": book.last_royalty_payout_date
        }

    # Generate sequential unique ticket identifier (e.g. TCK-1002)
    last_ticket = db.query(Ticket).order_by(Ticket.id.desc()).first()
    next_num = (last_ticket.id + 1001) if last_ticket else 1001
    ticket_number = f"TCK-{next_num}"

    # AI Auto-classification, Priority scoring, and Draft generation
    ai_result = analyze_ticket_and_draft_response(
        subject=ticket_in.subject,
        description=ticket_in.description,
        author_name=current_user.name,
        book_info=book_info
    )

    new_ticket = Ticket(
        ticket_number=ticket_number,
        author_id=current_user.id,
        book_id=ticket_in.book_id,
        subject=ticket_in.subject,
        description=ticket_in.description,
        category=ai_result["category"],
        priority=ai_result["priority"],
        status="Open",
        ai_draft_response=ai_result["draft_response"],
        ai_classification_reason=ai_result.get("reason")
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # Initial message in the communication thread
    initial_message = Message(
        ticket_id=new_ticket.id,
        sender_id=current_user.id,
        sender_name=current_user.name,
        sender_role=current_user.role,
        content=ticket_in.description,
        is_internal_note=False
    )
    db.add(initial_message)
    db.commit()
    db.refresh(new_ticket)

    return TicketResponse.model_validate(new_ticket)


@router.get("", response_model=List[TicketListResponse])
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    sort_by: Optional[str] = Query("urgency", description="Sort order: 'urgency' or 'newest'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists support tickets with role-based filtering:
    - Authors only see their own tickets.
    - Admins see tickets across all authors, filterable by status, category, priority.
    - Urgency sort surfaces Critical/High and oldest unresolved tickets first.
    """
    query = db.query(Ticket)

    # Role restriction
    if current_user.role != "admin":
        query = query.filter(Ticket.author_id == current_user.id)
    else:
        # Admin filters
        if status_filter:
            query = query.filter(Ticket.status == status_filter)
        if category_filter:
            query = query.filter(Ticket.category == category_filter)
        if priority_filter:
            query = query.filter(Ticket.priority == priority_filter)

    # Sorting logic
    if sort_by == "urgency":
        # Custom SQL order for priority: Critical (1), High (2), Medium (3), Low (4)
        priority_order = case(
            (Ticket.priority == "Critical", 1),
            (Ticket.priority == "High", 2),
            (Ticket.priority == "Medium", 3),
            (Ticket.priority == "Low", 4),
            else_=5
        )
        # Oldest unresolved first
        query = query.order_by(priority_order.asc(), Ticket.created_at.asc())
    else:
        query = query.order_by(Ticket.created_at.desc())

    tickets = query.all()
    results = []

    for t in tickets:
        # Role-based count: Authors only see count of public messages (never leaking hidden internal notes)
        if current_user.role == "admin":
            visible_count = len(t.messages)
        else:
            visible_count = len([m for m in t.messages if not m.is_internal_note])

        results.append(TicketListResponse(
            id=t.id,
            ticket_number=t.ticket_number,
            author_id=t.author_id,
            author_name=t.author.name if t.author else "Unknown Author",
            book_title=t.book.title if t.book else "General / Account Level",
            subject=t.subject,
            category=t.category,
            priority=t.priority,
            status=t.status,
            created_at=t.created_at,
            updated_at=t.updated_at,
            messages_count=visible_count
        ))

    return results


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket_detail(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves full details of a specific ticket including message thread.
    Crucial Security Rule: Internal notes are filtered out if user is an author!
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if current_user.role != "admin" and ticket.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view this ticket"
        )

    # Filter messages based on viewer role
    if current_user.role == "admin":
        messages = ticket.messages
    else:
        # Strictly hide internal notes from authors
        messages = [m for m in ticket.messages if not m.is_internal_note]

    ticket_data = TicketResponse.model_validate(ticket)
    ticket_data.messages = [MessageResponse.model_validate(m) for m in messages]
    return ticket_data


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only ticket management:
    - Override AI category or priority
    - Change status (Open, In Progress, Resolved, Closed)
    - Assign ticket to an admin
    - Update AI draft response before sending
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket_update.category is not None:
        ticket.category = ticket_update.category
    if ticket_update.priority is not None:
        ticket.priority = ticket_update.priority
    if ticket_update.status is not None:
        ticket.status = ticket_update.status
    if ticket_update.assigned_admin_id is not None:
        ticket.assigned_admin_id = ticket_update.assigned_admin_id
    if ticket_update.ai_draft_response is not None:
        ticket.ai_draft_response = ticket_update.ai_draft_response

    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)

    return TicketResponse.model_validate(ticket)


@router.post("/{ticket_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def post_ticket_message(
    ticket_id: int,
    msg_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sends a message in the ticket thread.
    - Authors can only post public replies (is_internal_note is forced to False).
    - Admins can choose to post a public response or a private internal note.
    - If admin posts a public reply to an Open ticket, status auto-transitions to 'In Progress'.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if current_user.role != "admin" and ticket.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden")

    # Author cannot create internal notes
    is_internal = msg_in.is_internal_note if current_user.role == "admin" else False

    new_msg = Message(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        sender_name=current_user.name,
        sender_role=current_user.role,
        content=msg_in.content,
        is_internal_note=is_internal
    )
    db.add(new_msg)

    # Status update convenience: when admin replies publicly to an open ticket
    if current_user.role == "admin" and not is_internal and ticket.status == "Open":
        ticket.status = "In Progress"

    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(new_msg)

    return MessageResponse.model_validate(new_msg)


@router.post("/{ticket_id}/regenerate-draft", response_model=TicketResponse)
def regenerate_ai_draft(
    ticket_id: int,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Allows an admin to request a regenerated AI response draft on demand."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    book_info = None
    if ticket.book:
        b = ticket.book
        book_info = {
            "title": b.title,
            "isbn": b.isbn,
            "status": b.status,
            "total_copies_sold": b.total_copies_sold,
            "total_royalty_earned": b.total_royalty_earned,
            "royalty_paid": b.royalty_paid,
            "royalty_pending": b.royalty_pending,
            "last_royalty_payout_date": b.last_royalty_payout_date
        }

    ai_result = analyze_ticket_and_draft_response(
        subject=ticket.subject,
        description=ticket.description,
        author_name=ticket.author.name if ticket.author else "Author",
        book_info=book_info
    )

    ticket.ai_draft_response = ai_result["draft_response"]
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)

    return TicketResponse.model_validate(ticket)
