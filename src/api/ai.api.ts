/**
 * Alloul AI Structuring Engine — API Client
 * ==========================================
 * Preview-then-confirm flow:
 *   1. User writes free-form text
 *   2. Client calls parse-* → gets structured preview (no DB write)
 *   3. User reviews and optionally edits fields
 *   4. Client calls confirm-* → saves to correct company-scoped table
 *
 * All parse-* endpoints are preview-only.
 * All confirm-* endpoints require the user to be a company member.
 */

import { apiFetch } from "./client";

// ─── Shared ────────────────────────────────────────────────────────────────

export interface ParseRequest {
  text: string;
}

/** Envelope returned by every parse-* endpoint */
export interface ParseResponse {
  success: boolean;
  module: string;
  extracted: Record<string, unknown>;
  warnings: string[];
  org_id: number | null;
  submitted_by_user_id: number;
  processing_ms: number | null;
}

// ─── Task ──────────────────────────────────────────────────────────────────

export interface AITaskExtracted {
  title?: string | null;
  description?: string | null;
  assigned_to?: string | null;          // person name
  due_date?: string | null;             // YYYY-MM-DD
  priority?: "high" | "medium" | "low" | null;
  status?: "todo" | "in_progress" | "done" | null;
  related_client?: string | null;
  tags?: string[] | null;
  notes?: string | null;
}

export interface AITaskParseResponse extends Omit<ParseResponse, "extracted"> {
  extracted: AITaskExtracted;
}

export const parseTaskText = (text: string) =>
  apiFetch<AITaskParseResponse>("/ai/parse-task", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

// Confirm payload mirrors ConfirmTaskPayload on the backend
export interface ConfirmTaskBody {
  extraction: {
    title: string;
    description?: string | null;
    priority?: string | null;
    status?: string | null;
    due_date?: string | null;
    assigned_to?: string | null;
    assignee_id?: number | null;
    related_client?: string | null;
    tags?: string[] | null;
    notes?: string | null;
    project_id?: number | null;
  };
}

export interface ConfirmTaskResponse {
  task_id: number;
  project_id: number;
  company_id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  saved_at: string;
}

export const confirmAITask = (body: ConfirmTaskBody) =>
  apiFetch<ConfirmTaskResponse>("/ai/confirm-task", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ─── Handover ─────────────────────────────────────────────────────────────

export interface AIHandoverExtracted {
  handover_title?: string | null;
  client_name?: string | null;
  current_status?: string | null;
  from_person?: string | null;
  to_person?: string | null;
  department?: string | null;
  pending_actions?: string[] | null;
  important_contacts?: string[] | null;
  referenced_files?: string[] | null;
  flagged_amount?: number | null;
  currency?: string | null;
  deadline?: string | null;
  risk_level?: "low" | "medium" | "high" | "critical" | null;
  summary?: string | null;
  notes?: string | null;
}

export interface AIHandoverParseResponse extends Omit<ParseResponse, "extracted"> {
  extracted: AIHandoverExtracted;
}

export const parseHandoverText = (text: string) =>
  apiFetch<AIHandoverParseResponse>("/ai/parse-handover", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export interface ConfirmHandoverBody {
  extraction: {
    handover_title: string;
    client_name?: string | null;
    current_status?: string | null;
    from_person?: string | null;
    to_person?: string | null;
    department?: string | null;
    pending_actions?: string[] | null;
    important_contacts?: string[] | null;
    referenced_files?: string[] | null;
    flagged_amount?: number | null;
    currency?: string | null;
    deadline?: string | null;
    risk_level?: string | null;
    summary?: string | null;
    content?: string | null;
    notes?: string | null;
  };
}

export interface ConfirmHandoverResponse {
  handover_id: number;
  company_id: number;
  title: string;
  status: string;
  risk_level: string | null;
  saved_at: string;
}

export const confirmAIHandover = (body: ConfirmHandoverBody) =>
  apiFetch<ConfirmHandoverResponse>("/ai/confirm-handover", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ─── Transaction (Sales / Purchase) ───────────────────────────────────────

export interface AITransactionExtracted {
  transaction_type?: "income" | "expense" | "invoice" | "payment" | null;
  counterparty_name?: string | null;
  item_name?: string | null;
  quantity?: number | null;
  amount?: number | null;
  currency?: string | null;
  transaction_date?: string | null;     // YYYY-MM-DD
  payment_status?: "pending" | "paid" | "overdue" | "cancelled" | null;
  category?: string | null;
  invoice_number?: string | null;
  notes?: string | null;
}

export interface AITransactionParseResponse extends Omit<ParseResponse, "extracted"> {
  extracted: AITransactionExtracted;
}

export const parseTransactionText = (text: string) =>
  apiFetch<AITransactionParseResponse>("/ai/parse-transaction", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export interface ConfirmTransactionBody {
  extraction: {
    amount: number;
    currency?: string | null;
    transaction_type?: string | null;
    payment_status?: string | null;
    counterparty_name?: string | null;
    item_name?: string | null;
    quantity?: number | null;
    transaction_date?: string | null;
    invoice_number?: string | null;
    category?: string | null;
    notes?: string | null;
  };
}

export interface ConfirmTransactionResponse {
  transaction_id: number;
  company_id: number;
  amount: number;
  currency: string;
  transaction_type: string;
  payment_status: string;
  saved_at: string;
}

export const confirmAITransaction = (body: ConfirmTransactionBody) =>
  apiFetch<ConfirmTransactionResponse>("/ai/confirm-transaction", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ─── Note Summarizer ──────────────────────────────────────────────────────

export interface AINoteSummaryExtracted {
  summary?: string | null;
  action_items?: string[] | null;
  key_entities?: string[] | null;
  deadlines?: string[] | null;
  risk_flags?: string[] | null;
}

export interface AINoteSummaryResponse extends Omit<ParseResponse, "extracted"> {
  extracted: AINoteSummaryExtracted;
}

export const summarizeNoteText = (text: string) =>
  apiFetch<AINoteSummaryResponse>("/ai/summarize-note", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

// ─── Health ───────────────────────────────────────────────────────────────

export interface AIHealthResult {
  ok: boolean;
  engine?: string;
}

export const getAIHealth = () =>
  apiFetch<AIHealthResult>("/ai/health").catch(() => ({ ok: false }));
