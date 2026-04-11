import { apiFetch } from "./client";

export interface ConversationRow {
  id: number;
  other_user_id: number;
  other_user_name?: string | null;
  other_user_username?: string | null;
  other_user_avatar?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
}

export interface DirectMessageRow {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name?: string | null;
  sender_avatar?: string | null;
  content: string;
  read_at?: string | null;
  created_at?: string | null;
  is_mine: boolean;
}

export const listConversations = () =>
  apiFetch<ConversationRow[]>("/messages/");

export const startConversation = (userId: number) =>
  apiFetch<ConversationRow>(`/messages/${userId}`, { method: "POST" });

export const listMessages = (conversationId: number, afterId = 0, limit = 50) =>
  apiFetch<DirectMessageRow[]>(
    `/messages/${conversationId}/messages?after_id=${afterId}&limit=${limit}`
  );

export const sendMessage = (conversationId: number, content: string) =>
  apiFetch<DirectMessageRow>(`/messages/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

export const deleteDirectMessage = (conversationId: number, messageId: number) =>
  apiFetch(`/messages/${conversationId}/messages/${messageId}`, { method: "DELETE" });
