'use client';
import { Search } from 'lucide-react';
import ComingSoon from '@/components/ComingSoon';

export default function ExplorePage() {
  return (
    <ComingSoon
      title="استكشاف"
      icon={<Search size={40} strokeWidth={2} />}
      description="اكتشف مجتمعات، هاشتاقات، ومحتوى جديد من كل منصة ALLOUL&Q"
      accentColor="#00D4FF"
    />
  );
}
