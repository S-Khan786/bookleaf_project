import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

BOOKLEAF_KNOWLEDGE_BASE = """
BOOKLEAF PUBLISHING COMPANY & POLICY KNOWLEDGE BASE:

1. Company Overview:
- BookLeaf Publishing is a self-publishing company operating in India and the US.
- Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium paid package).
- Services: Cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
- In-house printing facility and warehouse are located in Delhi. Print partners include Repro India and Epitome Books.

2. Royalty Policy:
- 80/20 split: 80% of net profit goes to author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping charges.
- Royalties are calculated quarterly and paid within 45 days of the quarter ending.
- Minimum payout threshold: ₹1,000. If accumulated royalties are below ₹1,000, they roll over to the next quarter.
- Payouts are made via bank transfer to the account linked in the author's dashboard.
- Authors can view detailed sales and royalty breakdowns in their dashboard per platform.

3. ISBN Policy:
- Every book published gets a unique ISBN assigned by BookLeaf under BookLeaf's publisher imprint.
- If an author reports an ISBN error (duplicate, wrong book linked), treat as high priority and escalate to production team with a 48-hour resolution timeline.

4. Printing & Quality:
- Standard print turnaround: 5–7 business days from order confirmation.
- If an author reports quality issues (misprints, binding defects, blurry images, color issues), BookLeaf arranges a FREE reprint after verification. Ask the author to share photos of the defective copy.

5. Distribution & Availability:
- Listed on: Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.
- New listings go live within 7–10 business days after publication is complete.
- If a book shows "Currently Unavailable" on Amazon or other platforms, it is typically a stock sync issue. BookLeaf triggers a re-sync within 24–48 hours.

6. Production Stages:
- Stages: Manuscript Received -> Editing -> Cover Design -> Typesetting -> Proofreading -> ISBN Assignment -> Printing -> Distribution Setup -> Published & Live.
- Authors are updated at each stage via email. Delays typically happen at Cover Design (waiting for author approval) and Proofreading (revision rounds).

7. Communication Tone Guidelines:
- Always empathetic and professional. Authors are partners, not customers to be managed.
- Acknowledge the author's concern before jumping to solutions.
- Be specific: include actual numbers, dates, and statuses wherever possible.
- If something is BookLeaf's fault (delayed royalties, ISBN error), own it directly with no deflection.
- If an issue requires escalation, give a clear timeline ("Our team will resolve this within 48 hours").
- Always end with a clear next step for the author and/or the BookLeaf team.
"""

VALID_CATEGORIES = [
    "Royalty & Payments",
    "ISBN & Metadata Issues",
    "Printing & Quality",
    "Distribution & Availability",
    "Book Status & Production Updates",
    "General Inquiry"
]

VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"]


def get_ai_client() -> Optional[OpenAI]:
    """Initializes and returns the OpenAI client configured for the LLM endpoint."""
    if not settings.LLM_API_KEY:
        return None
    try:
        return OpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
            timeout=15.0
        )
    except Exception as e:
        logger.error(f"Failed to initialize AI client: {e}")
        return None


def analyze_ticket_and_draft_response(
    subject: str,
    description: str,
    author_name: str,
    book_info: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Analyzes an incoming ticket:
    1. Classifies it into one of the 6 exact categories.
    2. Assigns an automated priority score (Critical / High / Medium / Low).
    3. Drafts a polite, empathetic, policy-accurate response citing BookLeaf knowledge base.

    Includes graceful degradation fallback if LLM is unavailable.
    """
    # Fallback default values in case of API failure or timeout
    fallback_result = {
        "category": "General Inquiry",
        "priority": "Medium",
        "reason": "Default classification (AI service fallback)",
        "draft_response": (
            f"Dear {author_name},\n\n"
            "Thank you for contacting BookLeaf Publishing Support. We have received your query regarding:\n"
            f"\"{subject}\"\n\n"
            "Our operations team is reviewing your ticket and will update you shortly with a detailed resolution.\n\n"
            "Warm regards,\n"
            "BookLeaf Support Team"
        )
    }

    client = get_ai_client()
    if not client:
        logger.warning("No LLM API key provided. Using fallback defaults.")
        return fallback_result

    book_context_str = "No specific book selected (General query)."
    if book_info:
        book_context_str = (
            f"Book Title: {book_info.get('title')}\n"
            f"ISBN: {book_info.get('isbn', 'Not assigned yet')}\n"
            f"Status: {book_info.get('status')}\n"
            f"Copies Sold: {book_info.get('total_copies_sold', 0)}\n"
            f"Total Royalty Earned: Rs. {book_info.get('total_royalty_earned', 0)}\n"
            f"Royalty Paid: Rs. {book_info.get('royalty_paid', 0)}\n"
            f"Royalty Pending: Rs. {book_info.get('royalty_pending', 0)}\n"
            f"Last Payout Date: {book_info.get('last_royalty_payout_date', 'None')}\n"
        )

    system_prompt = f"""
You are the AI Operations Assistant for BookLeaf Publishing.
Your task is to analyze an incoming support ticket from an author and return a strictly valid JSON response.

KNOWLEDGE BASE:
{BOOKLEAF_KNOWLEDGE_BASE}

INSTRUCTIONS:
1. Category must be strictly ONE of:
   - "Royalty & Payments"
   - "ISBN & Metadata Issues"
   - "Printing & Quality"
   - "Distribution & Availability"
   - "Book Status & Production Updates"
   - "General Inquiry"

2. Priority must be strictly ONE of:
   - "Critical" (e.g. major payment delay over months, duplicate ISBN, serious print defects affecting all copies)
   - "High" (e.g. pending royalties above threshold, ISBN mismatched on Amazon, out of stock during active campaign)
   - "Medium" (e.g. production update request, minor typesetting questions, normal availability questions)
   - "Low" (e.g. general inquiries, author bio update, formatting general questions)

3. Draft Response Guidelines:
   - Greet author warmly: "Dear {author_name},"
   - Tone: Empathetic, professional, transparent, and direct.
   - Use the specific data from Book Context and Knowledge Base (e.g. exact royalty threshold Rs. 1000, 45-day window, 5-7 business days for reprints, 24-48 hours for stock sync).
   - If escalating, provide a concrete timeline (e.g., "within 48 hours").
   - Always state clear next steps.
   - Sign off as "Warm regards,\\nBookLeaf Operations Team".

FORMAT: Return ONLY a JSON object with this exact schema:
{{
  "category": "<one of the 6 categories>",
  "priority": "<Critical | High | Medium | Low>",
  "reason": "<one sentence explaining the classification and priority>",
  "draft_response": "<full formatted draft response>"
}}
"""

    user_prompt = f"""
Author Name: {author_name}
Subject: {subject}
Description: {description}

Book Context:
{book_context_str}
"""

    try:
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2
        )

        content = response.choices[0].message.content
        if not content:
            return fallback_result

        parsed = json.loads(content)

        category = parsed.get("category", "General Inquiry")
        if category not in VALID_CATEGORIES:
            category = "General Inquiry"

        priority = parsed.get("priority", "Medium")
        if priority not in VALID_PRIORITIES:
            priority = "Medium"

        draft_response = parsed.get("draft_response") or fallback_result["draft_response"]
        reason = parsed.get("reason", "Classified based on content matching BookLeaf policies.")

        return {
            "category": category,
            "priority": priority,
            "reason": reason,
            "draft_response": draft_response
        }

    except Exception as e:
        logger.error(f"Error during AI ticket analysis: {e}. Falling back gracefully.", exc_info=True)
        return fallback_result
