// ALLOUL&Q web — API client
// Connects to the SAME backend as the mobile app (https://api.alloul.app)
// Uses JWT stored in localStorage by /login page

import { getToken, clearToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new ApiError('timeout', 0);
    throw new ApiError('network', 0);
  }
  clearTimeout(timer);

  if (!res.ok) {
    if (res.status === 401 && token) {
      clearToken();
    }
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body.detail === 'string') msg = body.detail;
      else if (Array.isArray(body.detail)) msg = body.detail.map((d: any) => d?.msg || '').join('; ');
    } catch {}
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

// ─── Typed helpers (mirror the mobile app's API client) ────────────────────

export interface ApiPost {
  id: number;
  user_id: number;
  content: string;
  image_url?: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  author_name?: string | null;
  author_username?: string | null;
  author_avatar?: string | null;
  author_verified?: boolean;
  created_at?: string | null;
  liked_by_me: boolean;
  reposted_by_me: boolean;
  saved_by_me: boolean;
}

export interface StoryItem {
  id: number;
  user_id: number;
  media_url: string | null;
  media_type: string;
  caption: string | null;
  author_name: string | null;
  author_username: string | null;
  author_avatar: string | null;
  is_news_channel?: boolean;
  live_url?: string | null;
  views_count: number;
  viewed_by_me: boolean;
  created_at: string | null;
  expires_at: string | null;
}

export interface DashboardStats {
  total_memory_items?: number;
  total_handovers?: number;
  pending_tasks?: number;
  team_size?: number;
}

export interface DashboardActivityItem {
  type: string;
  title: string;
  time?: string | null;
}

// ─── Endpoints (identical to mobile app) ────────────────────────────────────

export const login = (email: string, password: string) =>
  apiFetch<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const getCurrentUser = () => apiFetch<import('./auth').AuthUser>('/auth/me');

export const getPosts = (limit = 30, offset = 0) =>
  apiFetch<ApiPost[]>(`/posts/?limit=${limit}&offset=${offset}`);

export const getStories = () => apiFetch<StoryItem[]>('/stories/');

export const getDashboardStats = () => apiFetch<DashboardStats>('/dashboard/stats');

export const getDashboardActivity = (limit = 20) =>
  apiFetch<DashboardActivityItem[]>(`/dashboard/activity?limit=${limit}`);

export const likePost = (id: number) => apiFetch(`/posts/${id}/like`, { method: 'POST' });
export const unlikePost = (id: number) => apiFetch(`/posts/${id}/like`, { method: 'DELETE' });
