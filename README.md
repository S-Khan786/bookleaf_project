# BookLeaf Author Support & Communication Portal

An AI-powered support and communication portal for BookLeaf Publishing, connecting authors with operations staff through automated ticket classification, priority scoring, and AI-assisted response drafting.

## System Architecture

The project is structured into two main components:
- **Backend (`/backend`)**: Python FastAPI REST API with SQLite/PostgreSQL, SQLAlchemy ORM, Pydantic validation, JWT authentication, and AI service integration.
- **Frontend (`/frontend`)**: React application supporting both Author-Facing and Admin-Facing interfaces.

```
bookleaf_assignment/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers & endpoints
│   │   ├── core/         # Config, security, database session
│   │   ├── models/       # SQLAlchemy database models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   └── services/     # AI engine & knowledge base logic
│   ├── data/             # Sample dataset (bookleaf_sample_data.json)
│   ├── requirements.txt  # Python backend dependencies
│   └── .env.example      # Environment variables template
├── frontend/             # React application (Author & Admin dashboards)
└── README.md
```

## Quick Start (Development)

### Backend Setup
1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   - Windows PowerShell: `.\venv\Scripts\Activate.ps1`
   - Linux/macOS: `source venv/bin/activate`
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
5. Seed the database with the official dataset:
   ```bash
   python -m app.seed
   ```
6. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
7. Interactive Swagger API documentation will be available at:
   - `http://localhost:8000/docs`

---

## Progression Roadmap & Commits
- [x] Initial repository setup, virtual environment, and directory structure.
- [ ] Database models (User, Book, Ticket, Message) and seeding logic.
- [ ] Authentication middleware and Role-Based Access Control (RBAC).
- [ ] Ticket lifecycle and communication endpoints.
- [ ] AI Service integration with BookLeaf Knowledge Base.
- [ ] Frontend Author Portal & Admin Portal dashboards.
- [ ] Live demo deployment & comprehensive write-up.
