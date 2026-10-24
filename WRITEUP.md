# Technical Approach & Architectural Write-Up

**Candidate:** Full-Stack Developer Position  
**Project:** BookLeaf Author Support & Communication Portal  

---

### 1. Approach & Strategic Priorities

When building a communication portal for a publishing house managing 22,000+ titles and thousands of authors, the biggest day-to-day bottleneck isn't rendering UI components—it's **ticket triaging lag and inconsistent, off-policy answers**. Authors worry about their hard-earned royalties and print deliveries, while support teams spend hours checking spreadsheets and typing repetitive emails.

My engineering priorities centered on solving those core operational pain points:

1. **Grounded AI Over Generic Text Generation:**  
   LLMs tend to generate vague, overly apologetic responses unless strictly constrained. I anchored the system prompt directly to BookLeaf's operating rules: the 80/20 royalty split, the ₹1,000 payout threshold, 45-day quarterly payout windows, and 5–7 day reprint SLAs. By injecting the author's live book statistics (units sold, royalties paid, and pending balances) directly into the prompt context, the AI cites exact numbers and concrete dates rather than making empty promises.

2. **Thread-Aware Context for Real Conversations:**  
   Author conversations are rarely one-and-done. In practice, after receiving a payment date confirmation, an author like Priya immediately follows up asking for a channel breakdown (e.g. Amazon vs. Flipkart). I implemented thread-aware drafting so the backend evaluates the latest author message in the conversation rather than perpetually answering the original ticket description.

3. **Defensive AI Engineering & Fault Tolerance:**  
   Third-party AI endpoints can suffer from network timeouts, rate limits, or unexpected schema changes. Support operations cannot grind to a halt just because an external API is down. Ticket creation never fails: if the LLM call times out, the backend gracefully catches the exception, assigns sensible default triage values (`General Inquiry`, `Medium` priority), and generates a clean fallback message so the human admin can step in without disruption.

4. **Data Isolation & Confidentiality (RBAC):**  
   In publishing, financial numbers and internal operations notes are sensitive. I enforced role-based access control at the database query level rather than relying on frontend filtering. Confidential internal notes (`is_internal_note = True`) and their message counts are stripped from the response payload before reaching an author's client, preventing operational disclosures like payment gateway batch delays.

5. **Pragmatic Real-Time Feel:**  
   Authors waiting for answers shouldn't need to manually refresh their browser. Lightweight 3.5-second polling on open ticket threads delivers a responsive, chat-like experience without unnecessary infrastructure overhead.

---

### 2. Practical Trade-Offs Made

* **HTTP Polling vs. WebSockets:**  
  While WebSockets offer true bi-directional streaming, they introduce stateful connection management, reconnect logic on mobile sleep, and state-synchronization complexity across load-balanced instances. For a ticket support desk where messages arrive over minutes rather than milliseconds, a simple 3.5s polling loop provided near real-time responsiveness with zero infrastructure headaches and predictable server load.
* **SQLite + SQLAlchemy vs. Dedicated Cloud PostgreSQL:**  
  For clean local evaluation and 1-command Docker testing, SQLite eliminated external database setup friction. Because the entire data layer is written with SQLAlchemy ORM models, transitioning to PostgreSQL in staging or production requires changing only the `DATABASE_URL` environment variable—no queries or models need rewriting.
* **Single-Pass Structured Completion vs. Multi-Agent Chains:**  
  Rather than chaining three sequential LLM calls (one to classify category, one for priority, and one for the draft), I engineered a single prompt returning a strict JSON object. This reduced latency by ~65%, kept token usage minimal (~350 tokens per ticket), and eliminated multiple points of API failure.

---

### 3. How I Would Evolve This System with More Time

Given additional time and high-scale production requirements, I would prioritize these architectural additions:

1. **Decoupled Asynchronous Workers (Celery / Redis / BullMQ):**  
   Right now, LLM inference runs synchronously during ticket submission (~1.2s round trip). In high-volume production, I would offload AI classification to an async worker queue. The ticket would persist immediately (<40ms), and the worker would stream the AI draft and priority score back to the admin dashboard via Server-Sent Events (SSE).
2. **Retrieval-Augmented Generation (RAG) with Vector Search:**  
   As BookLeaf expands author tiers, distribution agreements, and print specifications, the knowledge base will outgrow prompt injection limits. Storing policy documentation in a vector database (like `pgvector` or Pinecone) would allow dynamic retrieval of only the specific clauses relevant to an author's question.
3. **SLA Timers & Smart Escalation:**  
   Add priority-based SLA countdowns (e.g. Critical tickets must receive human review within 2 hours). Automated background jobs would alert senior ops leads on Slack or email when a ticket approaches an SLA breach.
4. **Cloud Object Storage for Print Defect Photos:**  
   Replace mocked client-side attachments with AWS S3 pre-signed URLs so authors can upload photos of damaged book shipments for direct inspection by the production team.
