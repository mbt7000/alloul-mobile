'use client';
import { Plus } from 'lucide-react';
import ComingSoon from '@/components/ComingSoon';

export default function ComposePage() {
  return (
    <ComingSoon
      title="نشر منشور"
      icon={<Plus size={40} strokeWidth={2.5} />}
      description="اكتب منشورك، أضف صور، وانشره لكل متابعيك — أو استخدم AI لتوليد الأفكار"
      accentColor="#2E8BFF"
    />
  );
}
