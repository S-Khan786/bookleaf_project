import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "BookLeaf" in data["app"]


def test_author_login():
    response = client.post("/api/auth/login", json={
        "email": "priya.sharma@email.com",
        "password": "author123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "priya.sharma@email.com"
    assert data["user"]["role"] == "author"


def test_admin_login():
    response = client.post("/api/auth/login", json={
        "email": "admin@bookleaf.com",
        "password": "admin123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"


def test_books_rbac_isolation():
    # Login as Priya
    author_resp = client.post("/api/auth/login", json={
        "email": "priya.sharma@email.com",
        "password": "author123"
    })
    token = author_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Author gets only their books
    books_resp = client.get("/api/books", headers=headers)
    assert books_resp.status_code == 200
    author_books = books_resp.json()
    assert len(author_books) == 2  # Priya has 2 books: BK001, BK002
    assert all("Whispers" in b["title"] or "Saffron" in b["title"] for b in author_books)

    # Login as Admin
    admin_resp = client.post("/api/auth/login", json={
        "email": "admin@bookleaf.com",
        "password": "admin123"
    })
    admin_token = admin_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin gets all books in catalog
    all_books_resp = client.get("/api/books", headers=admin_headers)
    assert all_books_resp.status_code == 200
    assert len(all_books_resp.json()) == 18


def test_ticket_creation_and_ai_draft():
    # Login as Priya
    author_resp = client.post("/api/auth/login", json={
        "email": "priya.sharma@email.com",
        "password": "author123"
    })
    token = author_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get Priya's first book
    books_resp = client.get("/api/books", headers=headers)
    first_book_id = books_resp.json()[0]["id"]

    # Submit ticket
    ticket_payload = {
        "book_id": first_book_id,
        "subject": "Missing Royalty for Q3",
        "description": "I have not received my quarterly payout of Rs. 3570 for Whispers of the Ganges. Please assist."
    }
    create_resp = client.post("/api/tickets", json=ticket_payload, headers=headers)
    assert create_resp.status_code == 201
    ticket = create_resp.json()
    assert ticket["category"] == "Royalty & Payments"
    assert ticket["priority"] in ["Critical", "High", "Medium"]
    assert ticket["ai_draft_response"] is not None
    assert len(ticket["ai_draft_response"]) > 20


def test_internal_note_privacy():
    # Login as Admin
    admin_resp = client.post("/api/auth/login", json={
        "email": "admin@bookleaf.com",
        "password": "admin123"
    })
    admin_token = admin_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Fetch existing ticket TCK-1001
    tickets_resp = client.get("/api/tickets", headers=admin_headers)
    ticket_id = tickets_resp.json()[0]["id"]

    # Admin posts an internal note
    note_payload = {
        "content": "CONFIDENTIAL NOTE: Bank transfer delayed by payment gateway batch failure on Oct 16.",
        "is_internal_note": True
    }
    note_resp = client.post(f"/api/tickets/{ticket_id}/messages", json=note_payload, headers=admin_headers)
    assert note_resp.status_code == 201

    # Admin views ticket: Internal note is visible
    admin_view = client.get(f"/api/tickets/{ticket_id}", headers=admin_headers).json()
    admin_messages = admin_view["messages"]
    assert any(m["is_internal_note"] is True for m in admin_messages)

    # Login as Author (Priya)
    author_resp = client.post("/api/auth/login", json={
        "email": "priya.sharma@email.com",
        "password": "author123"
    })
    author_token = author_resp.json()["access_token"]
    author_headers = {"Authorization": f"Bearer {author_token}"}

    # Author views ticket: Internal note MUST BE HIDDEN
    author_view = client.get(f"/api/tickets/{ticket_id}", headers=author_headers).json()
    author_messages = author_view["messages"]
    assert all(m["is_internal_note"] is False for m in author_messages)

    # Verify messages_count isolation in ticket list
    admin_list = client.get("/api/tickets", headers=admin_headers).json()
    admin_t1 = next(t for t in admin_list if t["id"] == ticket_id)
    assert admin_t1["messages_count"] > 1  # Admin sees full count including internal notes

    author_list = client.get("/api/tickets", headers=author_headers).json()
    author_t1 = next(t for t in author_list if t["id"] == ticket_id)
    assert author_t1["messages_count"] == 1  # Author only sees count of public messages
