'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import ComingSoon from '@/components/ComingSoon';
import { FEATURES } from '@/config/features';

export default function ComposePage() {
  const router = useRouter();

  useEffect(() => {
    if (!FEATURES.MEDIA_WORLD) {
      router.replace('/workspace');
    }
  }, [router]);

  if (!FEATURES.MEDIA_WORLD) return null;

  return (
    <ComingSoon
      title="نشر منشور"
      icon={<Plus size={40} strokeWidth={2.5} />}
      description="اكتب منشورك، أضف صور، وانشره لكل متابعيك — أو استخدم AI لتوليد الأفكار"
      accentColor="#2E8BFF"
    />
  );
}
