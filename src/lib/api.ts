import * as SecureStore from "expo-secure-store";
import i18n from "../i18n";
import { getApiBaseUrl, getApiDocsUrl, getApiOpenapiUrl } from "./apiConfig";

export { getApiBaseUrl, getApiDocsUrl, getApiOpenapiUrl };

/** Base URL for this request — always read from Expo config (not cached at module load). */
function apiBaseUrl(): string {
  return getApiBaseUrl();
}

/** Quick check — no auth. Backend must expose GET /health */
export async function pingApiHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${apiBaseUrl()}/health`, { method: "GET" });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const j = await res.json().catch(() => ({}));
    return { ok: true, detail: typeof j?.status === "string" ? j.status : "ok" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return { ok: false, detail: msg };
  }
}

// ── Token Management ──
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("access_token");
}
export async function setToken(token: string) {
  await SecureStore.setItemAsync("access_token", token);
}
export async function removeToken() {
  await SecureStore.deleteItemAsync("access_token");
}

// ── Base API ──
export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": i18n.language || "en",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl()}${endpoint}`, { ...options, headers });
  } catch {
    throw { message: "NETWORK_UNREACHABLE", status: 0 };
  }

  if (!res.ok) {
    if (res.status === 401) await removeToken();
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    let msg: string;
    if (typeof err.detail === "string") msg = err.detail;
    else if (Array.isArray(err.detail))
      msg = err.detail.map((d: { msg?: string }) => d?.msg || JSON.stringify(d)).join("; ");
    else msg = err.message || "Request failed";
    throw { message: msg, status: res.status };
  }
  if (res.status === 204) return null as T;
  return res.json();
}

// ── Auth ──
export interface AuthUser {
  id: number;
  email: string;
  username: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  i_code?: string;
  verified?: number;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  created_at?: string;
}

export async function login(email: string, password: string) {
  const res = await apiFetch<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await setToken(res.access_token);
  return res;
}

export async function register(username: string, email: string, password: string) {
  const res = await apiFetch<{ access_token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  await setToken(res.access_token);
  return res;
}

export async function loginWithFirebase(idToken: string) {
  const res = await apiFetch<{ access_token: string }>("/auth/firebase", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  await setToken(res.access_token);
  return res;
}

export async function loginWithAzureAd(idToken: string) {
  const res = await apiFetch<{ access_token: string }>("/auth/azure-ad", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  await setToken(res.access_token);
  return res;
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}

// ── Posts ──
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

export const getPosts = (limit = 20, offset = 0) =>
  apiFetch<ApiPost[]>(`/posts/?limit=${limit}&offset=${offset}`);

export const getFollowingPosts = (limit = 20, offset = 0) =>
  apiFetch<ApiPost[]>(`/posts/?following=true&limit=${limit}&offset=${offset}`);

export const createPost = (content: string, image_url?: string) =>
  apiFetch<ApiPost>("/posts/", { method: "POST", body: JSON.stringify({ content, image_url }) });

export const likePost = (id: number) => apiFetch(`/posts/${id}/like`, { method: "POST" });
export const unlikePost = (id: number) => apiFetch(`/posts/${id}/unlike`, { method: "POST" });
export const deletePost = (id: number) => apiFetch(`/posts/${id}`, { method: "DELETE" });

// ── Notifications ──
export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  reference_id?: string;
  actor_name?: string;
  actor_avatar?: string;
  created_at?: string;
}

export const getNotifications = (limit = 50) =>
  apiFetch<NotificationItem[]>(`/notifications/?limit=${limit}`);

export const getUnreadCount = () =>
  apiFetch<{ count: number }>("/notifications/unread-count").then((r) => r.count);

export const markRead = (id: number) =>
  apiFetch(`/notifications/${id}/read`, { method: "PATCH" });

// ── Company ──
export interface CompanyInfo {
  id: number;
  name: string;
  logo_url?: string;
  i_code: string;
}

export const getMyCompany = () =>
  apiFetch<CompanyInfo | null>("/companies/me").catch(() => null);

export const getSubscriptionStatus = () =>
  apiFetch<{ status: string | null; plan_id: string | null }>("/companies/subscription-status").catch(() => ({ status: null, plan_id: null }));

// ── Profile ──
export interface UserProfile {
  id: number;
  username: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  i_code?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
  is_self: boolean;
}

export const getUserProfile = (id: number | string) =>
  apiFetch<UserProfile>(`/follows/users/${id}/profile`);

export const followUser = (id: number) => apiFetch(`/follows/${id}`, { method: "POST" });
export const unfollowUser = (id: number) => apiFetch(`/follows/${id}`, { method: "DELETE" });

// ── Dashboard & workspace ──
export interface DashboardStats {
  total_memory_items?: number;
  total_handovers?: number;
  pending_tasks?: number;
  critical_risks?: number;
  team_size?: number;
  knowledge_health_score?: number;
  handover_completion_rate?: number;
  documentation_rate?: number;
  team_stability_score?: number;
}

export interface DashboardActivityItem {
  type: string;
  title: string;
  time?: string | null;
}

export const getDashboardStats = () => apiFetch<DashboardStats>("/dashboard/stats");

export const getDashboardActivity = (limit = 20) =>
  apiFetch<DashboardActivityItem[]>(`/dashboard/activity?limit=${limit}`);

export interface ProjectRow {
  id: number;
  user_id: number;
  company_id?: number | null;
  name: string;
  description?: string | null;
  status: string;
  tasks_count?: number;
  completed_count?: number;
  created_at?: string | null;
}

export const getProjects = () => apiFetch<ProjectRow[]>("/projects/");

export interface CompanyStats {
  total_members: number;
  total_departments: number;
  plan_id?: string | null;
  subscription_status?: string | null;
  max_employees?: number | null;
}

export const getCompanyStats = () => apiFetch<CompanyStats>("/companies/stats");

export const markAllNotificationsRead = () =>
  apiFetch("/notifications/read-all", { method: "POST" });

// ── Search (explore) ──
export interface SearchResultItem {
  type: string;
  id: string;
  title: string;
  description?: string;
  avatar_url?: string | null;
  relevance_score?: number;
}

export const unifiedSearch = (q: string) => {
  const trimmed = q.trim();
  if (!trimmed) return Promise.resolve([] as SearchResultItem[]);
  return apiFetch<SearchResultItem[]>(`/search?q=${encodeURIComponent(trimmed)}`);
};

// ── Company team ──
export interface CompanyMemberRow {
  id: number;
  company_id: number;
  user_id: number;
  role: string;
  department_id?: number | null;
  i_code: string;
  manager_id?: number | null;
  job_title?: string | null;
}

export const getCompanyMembers = () => apiFetch<CompanyMemberRow[]>("/companies/members");

// ── Handover ──
export interface HandoverRow {
  id: number;
  user_id: number;
  title: string;
  from_person?: string | null;
  to_person?: string | null;
  department?: string | null;
  status: string;
  content?: string | null;
  score: number;
  tasks: number;
  completed_tasks: number;
  created_at?: string | null;
}

export const getHandovers = () => apiFetch<HandoverRow[]>("/handover/");

// ── Deals ──
export interface DealRow {
  id: number;
  user_id: number;
  company: string;
  value: number;
  stage: string;
  probability: number;
  contact?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export const getDeals = () => apiFetch<DealRow[]>("/deals/");

export const getSavedPosts = (limit = 30, offset = 0) =>
  apiFetch<ApiPost[]>(`/posts/saved?limit=${limit}&offset=${offset}`);

// ── Communities ──
export interface CommunityRow {
  id: number;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  creator_id: number;
  creator_name?: string | null;
  members_count?: number;
  is_member?: boolean;
  created_at?: string | null;
}

export const getCommunities = (limit = 20, offset = 0) =>
  apiFetch<CommunityRow[]>(`/communities/?limit=${limit}&offset=${offset}`);

// ── Marketplace ──
export interface MarketplaceCompanyRow {
  id: string;
  name: string;
  industry?: string | null;
  size?: string | null;
  location?: string | null;
  verified?: boolean;
  description?: string | null;
}

export const getMarketplaceCompanies = (search?: string) => {
  const s = search?.trim();
  return apiFetch<MarketplaceCompanyRow[]>(
    s ? `/marketplace/?search=${encodeURIComponent(s)}` : "/marketplace/"
  );
};

// ── Workspace ads ──
export interface AdRow {
  id: number;
  company_id: number;
  ad_type: string;
  content?: string | null;
  image_url?: string | null;
  status: string;
  impressions: number;
  company_name?: string | null;
}

export const getWorkspaceAds = () => apiFetch<AdRow[]>("/ads/");

// ── AI assistant (history) ──
export interface AgentMessageRow {
  id: string;
  role: string;
  content: string;
  created_at?: string | null;
}

export const getAgentHistory = (mode?: string) => {
  const q = mode?.trim() ? `?mode=${encodeURIComponent(mode.trim())}` : "";
  return apiFetch<AgentMessageRow[]>(`/agent/history${q}`);
};
