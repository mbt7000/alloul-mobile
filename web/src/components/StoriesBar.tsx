'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { getStories, type StoryItem } from '@/lib/api-client';

interface StoryGroup {
  user_id: number;
  author_name: string;
  author_avatar: string | null;
  is_news_channel: boolean;
  is_live: boolean;
  all_seen: boolean;
  items: StoryItem[];
}

function groupByUser(stories: StoryItem[]): StoryGroup[] {
  const map = new Map<number, StoryGroup>();
  for (const s of stories) {
    if (!map.has(s.user_id)) {
      map.set(s.user_id, {
        user_id: s.user_id,
        author_name: s.author_name ?? 'مستخدم',
        author_avatar: s.author_avatar ?? null,
        is_news_channel: !!s.is_news_channel,
        is_live: s.media_type === 'live',
        all_seen: true,
        items: [],
      });
    }
    const g = map.get(s.user_id)!;
    g.items.push(s);
    if (!s.viewed_by_me) g.all_seen = false;
    if (s.media_type === 'live') g.is_live = true;
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.is_live && !b.is_live) return -1;
    if (!a.is_live && b.is_live) return 1;
    if (!a.all_seen && b.all_seen) return -1;
    if (a.all_seen && !b.all_seen) return 1;
    return 0;
  });
}

const STORY_COLORS = ['#2E8BFF', '#14E0A4', '#00D4FF', '#8B5CF6', '#F59E0B', '#FF4757'];

export default function StoriesBar() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getStories();
        if (mounted) setGroups(groupByUser(Array.isArray(data) ? data : []));
      } catch {
        // Empty stories OK
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="border-b border-primary/10 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/50 text-xs font-bold">القصص</span>
        <button className="text-accent text-xs font-bold hover:text-accent-400">+ أضف قصة</button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {/* Add own story */}
        <button className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[66px] group">
          <div
            className="w-[66px] h-[66px] rounded-[22px] p-[2.5px] flex items-center justify-center"
            style={{ borderWidth: 2.5, borderColor: '#2E8BFF', borderStyle: 'solid' }}
          >
            <div className="w-full h-full rounded-[18px] border-[2px] border-dark-bg-900 p-0.5 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-primary/15 flex items-center justify-center">
                <Plus size={20} className="text-primary" />
              </div>
            </div>
          </div>
          <span className="text-[11px] text-white truncate w-full text-center">قصتي</span>
        </button>

        {loading ? (
          <div className="flex items-center justify-center w-[66px]">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : groups.map((g, idx) => {
          const color = g.is_live ? '#FF4757' : STORY_COLORS[idx % STORY_COLORS.length];
          const ringColor = g.is_live ? '#FF4757' : g.all_seen ? '#374151' : color;
          return (
            <button key={g.user_id} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[66px] group">
              <div
                className="w-[66px] h-[66px] rounded-[22px] p-[2.5px] flex items-center justify-center relative"
                style={{ borderWidth: 2.5, borderColor: ringColor, borderStyle: 'solid' }}
              >
                <div className="w-full h-full rounded-[18px] border-[2px] border-dark-bg-900 p-0.5 flex items-center justify-center overflow-hidden">
                  {g.author_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.author_avatar} alt={g.author_name} className="w-full h-full object-cover rounded-[14px]" />
                  ) : (
                    <div className="w-full h-full rounded-[14px] flex items-center justify-center" style={{ background: `${color}22` }}>
                      <span className="font-bold text-sm" style={{ color }}>
                        {g.author_name.slice(0, 1)}
                      </span>
                    </div>
                  )}
                </div>
                {g.is_live && (
                  <div className="absolute -top-0.5 -right-1 flex items-center gap-[2px] bg-danger px-[5px] py-[2px] rounded-md border-[1.5px] border-dark-bg-900">
                    <div className="w-[4px] h-[4px] rounded-full bg-white" />
                    <span className="text-white text-[7px] font-black leading-none">LIVE</span>
                  </div>
                )}
              </div>
              <span className={`text-[11px] truncate w-full text-center ${g.all_seen && !g.is_live ? 'text-white/40' : 'text-white'}`}>
                {g.author_name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
