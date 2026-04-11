"""
Prompt Templates — AI Structuring Engine
==========================================
One template per business module.

Design principles:
1. Always ask for JSON-only output — no prose, no markdown, no explanation.
2. Include a concrete few-shot example inside the prompt itself.
3. Provide explicit field definitions so the model knows what to fill.
4. Use strict=True mode (extra instruction at the end) for retry attempts.
5. Never inject data from other companies — context is always request-scoped.
"""

from __future__ import annotations


# ─── Task Parser ─────────────────────────────────────────────────────────────

def task_prompt(text: str, user_context: dict | None = None, strict: bool = False) -> str:
    ctx = ""
    if user_context:
        if user_context.get("user_name"):
            ctx += f"\nThe user who submitted this is: {user_context['user_name']}."
        if user_context.get("company_name"):
            ctx += f"\nThis belongs to the company: {user_context['company_name']}."

    example = """
Example input: "Follow up with Ahmed tomorrow about the client pricing and prepare the revised quotation"
Example output:
{
  "title": "Follow up with Ahmed on client pricing",
  "description": "Prepare revised quotation for client pricing discussion",
  "assigned_to": "Ahmed",
  "due_date": "tomorrow",
  "priority": "high",
  "status": "todo",
  "related_client": null,
  "tags": ["follow-up", "quotation", "pricing"],
  "notes": null
}"""

    prompt = f"""You are a business operations AI assistant. Extract structured task data from the following text.
IMPORTANT: Always respond in English regardless of the input language.
{ctx}

Return ONLY a valid JSON object with these exact fields:
- title: short task title (string, required)
- description: more detail if present (string or null)
- assigned_to: person name to assign to (string or null)
- due_date: date if mentioned, YYYY-MM-DD format preferred (string or null)
- priority: one of "high", "medium", "low" (default "medium")
- status: one of "todo", "in_progress", "done" (default "todo")
- related_client: client or company name if mentioned (string or null)
- tags: relevant keyword tags (array of strings or null)
- notes: any additional context (string or null)
{example}

Input text:
\"\"\"{text}\"\"\"

JSON output:"""

    if strict:
        prompt += "\n\nIMPORTANT: Your entire response MUST be a single valid JSON object. Start with {{ and end with }}. No text before or after."

    return prompt


# ─── Handover Parser ─────────────────────────────────────────────────────────

def handover_prompt(text: str, user_context: dict | None = None, strict: bool = False) -> str:
    ctx = ""
    if user_context:
        if user_context.get("user_name"):
            ctx += f"\nThe user who submitted this is: {user_context['user_name']}."
        if user_context.get("company_name"):
            ctx += f"\nThis belongs to the company: {user_context['company_name']}."

    example = """
Example input: "Client X is waiting for final approval, Ahmed already spoke to them, 12,000 AED still pending, file is in Drive, next follow-up Sunday"
Example output:
{
  "handover_title": "Client X Final Approval Handover",
  "client_name": "Client X",
  "current_status": "in_progress",
  "from_person": null,
  "to_person": "Ahmed",
  "department": null,
  "pending_actions": ["Get final approval from client", "Follow up on Sunday"],
  "important_contacts": ["Ahmed"],
  "referenced_files": ["Drive file"],
  "flagged_amount": 12000.0,
  "currency": "AED",
  "deadline": "Sunday",
  "risk_level": "medium",
  "summary": "Client X is awaiting final approval with 12,000 AED pending. Ahmed has been in contact. File is in Drive.",
  "content": "Client X is waiting for final approval. Ahmed has already spoken with them. 12,000 AED is still pending. The relevant file is stored in Drive. Next follow-up is scheduled for Sunday.",
  "notes": null
}"""

    prompt = f"""You are a business operations AI assistant. Extract structured handover data from the following text.
IMPORTANT: Always respond in English regardless of the input language.
{ctx}

Return ONLY a valid JSON object with these exact fields:
- handover_title: descriptive title (string, required)
- client_name: client or counterparty name (string or null)
- current_status: one of "pending", "in_progress", "submitted", "accepted", "closed" (default "pending")
- from_person: person handing over (string or null)
- to_person: person receiving handover / next owner (string or null)
- department: department if mentioned (string or null)
- pending_actions: list of pending items (array of strings or null)
- important_contacts: list of relevant people (array of strings or null)
- referenced_files: files or document references mentioned (array of strings or null)
- flagged_amount: financial amount if mentioned (number or null)
- currency: currency code if mentioned e.g. AED, SAR, USD (string or null)
- deadline: deadline or next follow-up date (string or null)
- risk_level: one of "low", "medium", "high", "critical" (or null if unclear)
- summary: a short 1-2 sentence summary of the handover (string or null)
- content: the full handover body — rewrite the input text in clear professional English as a complete handover note (string or null)
- notes: any other relevant info (string or null)
{example}

Input text:
\"\"\"{text}\"\"\"

JSON output:"""

    if strict:
        prompt += "\n\nIMPORTANT: Your entire response MUST be a single valid JSON object. Start with {{ and end with }}. No text before or after."

    return prompt


# ─── Transaction Parser ───────────────────────────────────────────────────────

def transaction_prompt(text: str, user_context: dict | None = None, strict: bool = False) -> str:
    ctx = ""
    if user_context:
        if user_context.get("user_name"):
            ctx += f"\nThe user who submitted this is: {user_context['user_name']}."
        if user_context.get("company_name"):
            ctx += f"\nThis belongs to the company: {user_context['company_name']}."

    example = """
Example input 1: "I sold annual support package to Al Noor Company today for 5000 AED"
Example output 1:
{
  "transaction_type": "income",
  "counterparty_name": "Al Noor Company",
  "item_name": "Annual Support Package",
  "quantity": 1.0,
  "amount": 5000.0,
  "currency": "AED",
  "transaction_date": "today",
  "payment_status": "pending",
  "category": "services",
  "invoice_number": null,
  "notes": null
}

Example input 2: "We purchased 3 monitors from Gulf Supplier for 2400 AED"
Example output 2:
{
  "transaction_type": "expense",
  "counterparty_name": "Gulf Supplier",
  "item_name": "Monitor",
  "quantity": 3.0,
  "amount": 2400.0,
  "currency": "AED",
  "transaction_date": null,
  "payment_status": "pending",
  "category": "equipment",
  "invoice_number": null,
  "notes": null
}"""

    prompt = f"""You are a business operations AI assistant. Extract structured financial transaction data from the following text.
IMPORTANT: Always respond in English regardless of the input language.
{ctx}

Return ONLY a valid JSON object with these exact fields:
- transaction_type: one of "income", "expense", "invoice", "payment" (required — use "income" for sales, "expense" for purchases)
- counterparty_name: client/supplier/company name (string or null)
- item_name: product or service name (string or null)
- quantity: numeric quantity if mentioned (number or null)
- amount: numeric amount, no currency symbol (number or null)
- currency: currency code e.g. AED, SAR, USD (string, default "SAR" if unclear)
- transaction_date: date in YYYY-MM-DD format if mentioned (string or null)
- payment_status: one of "pending", "paid", "overdue", "cancelled" (default "pending")
- category: business category such as "services", "equipment", "software", "rent", etc. (string or null)
- invoice_number: invoice number if mentioned (string or null)
- notes: any additional context (string or null)
{example}

Input text:
\"\"\"{text}\"\"\"

JSON output:"""

    if strict:
        prompt += "\n\nIMPORTANT: Your entire response MUST be a single valid JSON object. Start with {{ and end with }}. No text before or after."

    return prompt


# ─── Note Summarizer ─────────────────────────────────────────────────────────

def note_prompt(text: str, user_context: dict | None = None, strict: bool = False) -> str:
    ctx = ""
    if user_context and user_context.get("company_name"):
        ctx = f"\nThis note is from the company: {user_context['company_name']}."

    example = """
Example input: "Met with client today, they want changes to the proposal, Khaled to send revised version by Wednesday, budget concern around 50k, need legal review before signing"
Example output:
{
  "summary": "Client meeting held. Client requests proposal changes. Legal review needed before signing. Budget concern around 50k.",
  "action_items": ["Khaled to send revised proposal by Wednesday", "Schedule legal review before contract signing"],
  "key_entities": ["client", "Khaled"],
  "deadlines": ["Wednesday — revised proposal"],
  "risk_flags": ["Budget concern around 50k", "Legal review not yet completed"]
}"""

    prompt = f"""You are a business operations AI assistant. Summarize and extract key information from this operational note.
IMPORTANT: Always respond in English regardless of the input language.
{ctx}

Return ONLY a valid JSON object with these exact fields:
- summary: concise 2-3 sentence summary of the note (string or null)
- action_items: list of concrete action items found (array of strings or null)
- key_entities: people, companies, or projects mentioned (array of strings or null)
- deadlines: any deadlines or time-sensitive items (array of strings or null)
- risk_flags: anything that poses a risk or needs urgent attention (array of strings or null)
{example}

Input text:
\"\"\"{text}\"\"\"

JSON output:"""

    if strict:
        prompt += "\n\nIMPORTANT: Your entire response MUST be a single valid JSON object. Start with {{ and end with }}. No text before or after."

    return prompt
