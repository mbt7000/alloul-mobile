'use client';
import { Bookmark } from 'lucide-react';
import ComingSoon from '@/components/ComingSoon';

export default function BookmarksPage() {
  return (
    <ComingSoon
      title="المحفوظات"
      icon={<Bookmark size={40} strokeWidth={2} />}
      description="كل المنشورات والتسليمات التي حفظتها — متاحة في مكان واحد"
      accentColor="#8B5CF6"
    />
  );
}
