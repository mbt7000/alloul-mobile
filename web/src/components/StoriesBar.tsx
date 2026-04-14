'use client';

import { Plus, Radio } from 'lucide-react';

const STORIES = [
  { id: 'own',  name: 'قصتي',   own: true,  seen: false, color: '#2E8BFF' },
  { id: 's1',   name: 'Alloul News', live: true, color: '#FF4757' },
  { id: 's2',   name: 'أحمد',   seen: false, color: '#14E0A4' },
  { id: 's3',   name: 'سارة',   seen: false, color: '#00D4FF' },
  { id: 's4',   name: 'خالد',   seen: true,  color: '#8B5CF6' },
  { id: 's5',   name: 'نورة',   seen: false, color: '#F59E0B' },
  { id: 's6',   name: 'فيصل',   seen: true,  color: '#EF4444' },
  { id: 's7',   name: 'ريم',    seen: false, color: '#3B82F6' },
  { id: 's8',   name: 'محمد',   seen: false, color: '#10B981' },
];

export default function StoriesBar() {
  return (
    <div className="border-b border-primary/10 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/50 text-xs font-bold">القصص</span>
        <button className="text-accent text-xs font-bold hover:text-accent-400">+ أضف قصة</button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {STORIES.map((s) => {
          const ringColor = s.live ? '#FF4757' : s.seen ? '#374151' : s.color;
          return (
            <button key={s.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[66px] group">
              <div
                className="w-[66px] h-[66px] rounded-[22px] p-[2.5px] flex items-center justify-center relative"
                style={{
                  borderWidth: 2.5,
                  borderColor: ringColor,
                  borderStyle: 'solid',
                }}
              >
                <div
                  className="w-full h-full rounded-[18px] border-[2px] border-dark-bg-900 p-0.5 flex items-center justify-center"
                >
                  {s.own ? (
                    <div className="w-full h-full rounded-[14px] bg-primary/15 flex items-center justify-center">
                      <Plus size={20} className="text-primary" />
                    </div>
                  ) : (
                    <div
                      className="w-full h-full rounded-[14px] flex items-center justify-center"
                      style={{ background: `${s.color}22` }}
                    >
                      <span className="font-bold text-sm" style={{ color: s.color }}>
                        {s.name.slice(0, 1)}
                      </span>
                    </div>
                  )}
                </div>
                {s.live && (
                  <div className="absolute -top-0.5 -right-1 flex items-center gap-[2px] bg-danger px-[5px] py-[2px] rounded-md border-[1.5px] border-dark-bg-900">
                    <div className="w-[4px] h-[4px] rounded-full bg-white" />
                    <span className="text-white text-[7px] font-black leading-none">LIVE</span>
                  </div>
                )}
              </div>
              <span className={`text-[11px] truncate w-full text-center ${s.seen ? 'text-white/40' : 'text-white'}`}>
                {s.own ? 'قصتي' : s.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
