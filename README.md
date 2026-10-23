# BookLeaf Author Support & Communication Portal

An intelligent, AI-powered support and communication portal built for **BookLeaf Publishing**. It streamlines operational communication by allowing authors to review book royalties and submit queries, while empowering the internal operations team with automated ticket classification, priority scoring, and policy-accurate draft responses powered by LLM integration.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │            REACT FRONTEND (Vite)             │
                      │  - Author Portal (Books, Royalties, Tickets) │
                      │  - Admin Portal (Queue, AI Draft Editor)     │
                      └──────────────────────┬───────────────────────┘
                                             │ HTTP / REST (/api)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │            FASTAPI BACKEND (Python)          │
                      │  - JWT Authentication & RBAC Middleware      │
                      │  - BookLeaf Knowledge Base Grounding         │
                      │  - Auto-generated Swagger Docs (/docs)       │
                      └──────────────┬───────────────────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                     ▼
     ┌─────────────────────────┐           ┌─────────────────────────┐
     │        DATABASE         │           │        AI ENGINE        │
     │  - SQLAlchemy ORM       │           │  - Gemini / OpenAI      │
     │  - SQLite (Pre-seeded)  │           │  - Structured JSON      │
     │  - 10 Authors, 18 Books │           │  - Graceful Fallback    │
     └─────────────────────────┘           └─────────────────────────┘
```

---

## Pre-Seeded Test Credentials

The database is pre-seeded with all 10 authors and 18 books from the official dataset. Use these credentials to test:

| Role | Name | Email | Password | Notable Test Scenario |
| :--- | :--- | :--- | :--- | :--- |
| **Admin (Ops Lead)** | BookLeaf Ops | `admin@bookleaf.com` | `admin123` | Full access to ticket queue, AI drafts, internal notes, category/priority override |
| **Author (Priya)** | Priya Sharma | `priya.sharma@email.com` | `author123` | Has ₹3,570 pending royalty (above ₹1,000 threshold); seeded with ticket `TCK-1001` |
| **Author (Rohit)** | Rohit Kapoor | `rohit.kapoor@email.com` | `author123` | High-volume bestseller author (₹57k+ earned, 1200+ copies sold) |
| **Author (Sneha)** | Sneha Kulkarni | `sneha.kulkarni@email.com` | `author123` | Edge case: Book in production (*"Midnight in Mysore"* — no ISBN, zero sales) |

*(Note: The login screen also features **1-Click Quick Demo Login** buttons for instant testing).*

---

## AI Integration Details

### 1. Prompt Engineering & Knowledge Base Grounding
The AI engine embeds BookLeaf's exact operating policies directly into the system prompt:
- **80/20 Royalty Split**: 80% net profit to author, 20% to BookLeaf.
- **Payout Threshold**: ₹1,000 minimum; quarterly cycle paid within 45 days.
- **Printing Turnaround**: 5–7 business days; free reprints for verified defects.
- **Stock Sync**: 24–48 hours for Amazon/Flipkart sync issues.
- **Tone Guidelines**: Empathetic, transparent, concrete dates, direct ownership.

### 2. Token & Cost Efficiency
Instead of sending entire customer histories or unfiltered databases, the prompt sends **only the relevant book context** (title, status, copies sold, royalty pending) alongside the author's message. Structured JSON output (`response_format={"type": "json_object"}`) prevents wasted generation tokens.

### 3. Graceful Degradation
If the LLM endpoint is unreachable, rate-limited, or times out:
- Ticket creation **never fails**.
- The system automatically applies safe fallback defaults: Category = `General Inquiry`, Priority = `Medium`.
- A clean template response is generated, and admins can immediately compose a manual response.

### 4. API Key Security
API keys are loaded through environment variables (`.env`) via Pydantic `BaseSettings`. No secrets are exposed to the frontend or committed to Git.

### 5. Model Choice Justification
We selected **Google Gemini (`gemini-3.5-flash-lite`)** via its OpenAI-compatible endpoint for this implementation:
- **Ultra-Low Latency & High Throughput:** Sub-second response times ensure ticket submission feels snappy and near real-time.
- **Cost Consciousness:** At approximately \$0.075 per million tokens, it provides high-tier reasoning at a fraction of the cost of flagship frontier models, perfectly balancing production scalability with cost awareness.
- **Structured JSON Fidelity:** Demonstrates strict prompt compliance with native `json_object` enforcement, eliminating schema parsing errors.
- **Universal Provider Portability:** Utilizing the standardized OpenAI client interface allows switching to `gpt-4o-mini` or Claude with zero code refactoring.

---

## Known Limitations & Future Improvements

Given additional time and high-scale enterprise requirements, the following enhancements would be prioritized:
1. **Cloud File Storage for Attachments:** While the ticket form includes file attachment UI (as requested), actual file uploads currently mock the client state. Production integration with AWS S3 pre-signed URLs would enable persistent photo storage for print defect verification.
2. **Asynchronous Task Queue (Celery / Redis):** Decoupling LLM inference from the HTTP request cycle using background workers would improve API response times from ~1.5s down to <50ms.
3. **Enterprise Vector Search (RAG):** As publisher contracts and regional policies expand, embedding documentation into a vector database (e.g., pgvector / Pinecone) would allow dynamic policy retrieval based on author locale and package tier.
4. **Author Sentiment & SLA Tracking:** Real-time sentiment analysis on incoming replies to automatically flag escalating author frustration to team leads before SLA breach.

---

## Quick Start Guide

### Option 1: 1-Command Startup via Docker (Recommended) 🐳

If you have Docker installed, you can launch the entire stack (FastAPI Backend + Database Seeding + React Frontend) with one single command:

```bash
docker compose up --build
```
- **Web Application:** [http://localhost:5173](http://localhost:5173)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Option 2: Local Manual Setup (Without Docker)

#### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ & npm

#### 1. Backend Setup
```bash
# 1. Navigate to backend
cd backend

# 2. Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment configuration
cp .env.example .env
# (Your LLM API credentials are configured in .env)

# 5. Seed the database with the official dataset
python -m app.seed

# 6. Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
- **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Frontend Setup
```bash
# 1. Open a new terminal and navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite development server
npm run dev
```
- **Frontend Application:** [http://localhost:5173](http://localhost:5173)

### 3. Running Automated Tests
```bash
cd backend
$env:PYTHONPATH = "."
.\venv\Scripts\pytest.exe -v tests/test_api.py
```

---

## API Documentation (Interactive OpenAPI / Swagger)

FastAPI generates interactive Swagger documentation automatically at `http://localhost:8000/docs`:

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token (used for Web UI & Swagger) |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |
| `GET` | `/api/auth/demo-accounts` | Public | Helper list of pre-seeded accounts |
| `GET` | `/api/books` | Author / Admin | List books (Authors see own; Admins see all) |
| `POST` | `/api/tickets` | Author / Admin | Submit ticket & trigger AI analysis |
| `GET` | `/api/tickets` | Author / Admin | List tickets (with urgency, status, category filters) |
| `GET` | `/api/tickets/{id}` | Author / Admin | Ticket detail & message thread (internal notes stripped for authors) |
| `PATCH` | `/api/tickets/{id}` | Admin | Update status, override category/priority, assign admin |
| `POST` | `/api/tickets/{id}/messages` | Author / Admin | Send public message or private internal note |
| `POST` | `/api/tickets/{id}/regenerate-draft`| Admin | Re-run AI draft response generation |
| `GET` | `/api/health` | Public | System and LLM health status |

---

## Commit Progression History

```text
7d18524 feat(frontend): connect App routing, live polling, and verified production build
7c9a00a feat(frontend): implement Admin Portal with filterable ticket queue and AI draft review
b4bccb0 feat(frontend): implement Author Portal with book royalties and ticket submission
c6cc04b feat(frontend): create AuthContext, global design system, and login with 1-click demo accounts
ccca1dc chore(frontend): scaffold React Vite project and configure API client
9b2e148 test(api): add test suite for auth, catalog isolation, AI drafts, and internal notes
512eb83 feat(server): initialize FastAPI application with CORS middleware and health checks
536a2f2 feat(api): implement ticket queue, priority sorting, and message thread endpoints
2fe6293 feat(api): implement author book catalog and royalty tracking endpoints
b651844 feat(api): add JWT authentication and role-based access control middleware
c6f2bdf feat(ai): integrate BookLeaf knowledge base and automated ticket analysis service
bc579bb feat(schemas): define Pydantic validation schemas for auth, books, and tickets
58a4272 feat: implement database configuration, models, and seed script
5f101d3 chore: configure LLM environment variables for Gemini endpoint
56568da chore: initialize repository structure and backend environment
```
