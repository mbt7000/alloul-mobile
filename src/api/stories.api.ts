import { apiFetch } from "./client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StoryItem {
  id: number;
  user_id: number;
  media_url: string | null;
  media_type: string; // "image" | "video" | "live"
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

export interface StoryGroup {
  user_id: number;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  is_news_channel: boolean;
  is_live: boolean;
  live_url?: string | null;
  stories: StoryItem[];
  all_seen: boolean;
}

interface CreateStoryBody {
  media_url?: string | null;
  media_type?: string;
  caption?: string | null;
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const getStories = () => apiFetch<StoryItem[]>("/stories/");

export const createStory = (body: CreateStoryBody) =>
  apiFetch<StoryItem>("/stories/", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const deleteStory = (storyId: number) =>
  apiFetch<void>(`/stories/${storyId}`, { method: "DELETE" });

export const markStoryViewed = (storyId: number) =>
  apiFetch<void>(`/stories/${storyId}/view`, { method: "POST" });

// ─── Group stories by user ───────────────────────────────────────────────────

export function groupStoriesByUser(stories: StoryItem[], currentUserId: number): StoryGroup[] {
  const map = new Map<number, StoryGroup>();

  for (const s of stories) {
    if (!map.has(s.user_id)) {
      map.set(s.user_id, {
        user_id: s.user_id,
        author_name: s.author_name ?? "مستخدم",
        author_username: s.author_username ?? "",
        author_avatar: s.author_avatar ?? null,
        is_news_channel: s.is_news_channel ?? false,
        is_live: s.media_type === "live",
        live_url: s.live_url ?? null,
        stories: [],
        all_seen: true,
      });
    }
    const group = map.get(s.user_id)!;
    group.stories.push(s);
    if (!s.viewed_by_me) group.all_seen = false;
    if (s.media_type === "live") {
      group.is_live = true;
      group.live_url = s.live_url ?? null;
    }
  }

  // Sort: own story first, then live channels, then unseen, then seen
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    if (a.is_live && !b.is_live) return -1;
    if (!a.is_live && b.is_live) return 1;
    if (!a.all_seen && b.all_seen) return -1;
    if (a.all_seen && !b.all_seen) return 1;
    return 0;
  });

  return groups;
}
