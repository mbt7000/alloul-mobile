import { apiFetch } from "./client";

// ─── Shared ────────────────────────────────────────────────────────────────

export interface AIParseRequest {
  text: string;
}

// ─── Task ──────────────────────────────────────────────────────────────────

export interface AITaskExtraction {
  title?: string | null;
  description?: string | null;
  priority?: "high" | "medium" | "low" | null;
  status?: "todo" | "in_progress" | "done" | null;
  due_date?: string | null;         // ISO date string
  assignee_name?: string | null;
  project_name?: string | null;
  tags?: string[] | null;
}

export interface AITaskParseResult {
  extracted: AITaskExtraction;
  raw_text: string;
}

export const parseTaskText = (text: string) =>
  apiFetch<AITaskParseResult>("/ai/parse-task", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export interface AIConfirmTaskBody {
  extraction: AITaskExtraction;
  project_id?: number | null;        // link to existing project if known
}

export interface AIConfirmedTask {
  task_id: number;
  project_id: number;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
  saved_at: string;
}

export const confirmAITask = (body: AIConfirmTaskBody) =>
  apiFetch<AIConfirmedTask>("/ai/confirm-task", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ─── Handover ─────────────────────────────────────────────────────────────

export interface AIHandoverExtraction {
  title?: string | null;
  from_person?: string | null;
  to_person?: string | null;
  department?: string | null;
  status?: string | null;
  content?: string | null;
  risk_level?: "low" | "medium" | "high" | "critical" | null;
  tasks_mentioned?: string[] | null;
  pending_items?: string[] | null;
}

export interface AIHandoverParseResult {
  extracted: AIHandoverExtraction;
  raw_text: string;
}

export const parseHandoverText = (text: string) =>
  apiFetch<AIHandoverParseResult>("/ai/parse-handover", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export interface AIConfirmHandoverBody {
  extraction: AIHandoverExtraction;
}

export interface AIConfirmedHandover {
  handover_id: number;
  title: string;
  status: string;
  saved_at: string;
}

export const confirmAIHandover = (body: AIConfirmHandoverBody) =>
  apiFetch<AIConfirmedHandover>("/ai/confirm-handover", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ─── Sales / Transaction ───────────────────────────────────────────────────

export interface AISalesExtraction {
  amount?: number | null;
  currency?: string | null;
  type?: "income" | "expense" | "invoice" | "payment" | null;
  status?: "pending" | "paid" | "overdue" | "cancelled" | null;
  counterparty?: string | null;
  description?: string | null;
  date?: string | null;              // ISO date string
  invoice_number?: string | null;
  notes?: string | null;
}

export interface AISalesParseResult {
  extracted: AISalesExtraction;
  raw_text: string;
}

export const parseSalesText = (text: string) =>
  apiFetch<AISalesParseResult>("/ai/parse-sales", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export interface AIConfirmTransactionBody {
  extraction: AISalesExtraction;
}

export interface AIConfirmedTransaction {
  transaction_id: number;
  amount: number;
  type: string;
  status: string;
  saved_at: string;
}

export const confirmAITransaction = (body: AIConfirmTransactionBody) =>
  apiFetch<AIConfirmedTransaction>("/ai/confirm-transaction", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ─── Note Summarizer ──────────────────────────────────────────────────────

export interface AINoteSummary {
  summary?: string | null;
  key_points?: string[] | null;
  action_items?: string[] | null;
  sentiment?: "positive" | "neutral" | "negative" | null;
}

export interface AINoteSummaryResult {
  summary: AINoteSummary;
  raw_text: string;
}

export const summarizeNoteText = (text: string) =>
  apiFetch<AINoteSummaryResult>("/ai/summarize-note", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

// ─── Health ───────────────────────────────────────────────────────────────

export interface AIHealthResult {
  ok: boolean;
  model?: string | null;
  latency_ms?: number | null;
}

export const getAIHealth = () =>
  apiFetch<AIHealthResult>("/ai/health").catch(() => ({ ok: false }));
