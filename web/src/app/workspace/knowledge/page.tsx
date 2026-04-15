'use client';

import { BookOpen } from 'lucide-react';
import WorkspaceComingSoon from '@/components/WorkspaceComingSoon';

export default function KnowledgePage() {
  return (
    <WorkspaceComingSoon
      title="قاعدة المعرفة"
      icon={BookOpen}
      color="#8B5CF6"
      tagline="وثائق الشركة ومعرفتها الداخلية — ابحث فيها مع المساعد الذكي."
      features={[
        'رفع وتنظيم مستندات الشركة (PDF, Word, صور)',
        'بحث دلالي ذكي (RAG) يفهم السياق',
        'أسئلة وأجوبة تلقائية من محتوى المستندات',
        'تصنيف تلقائي للوثائق حسب المشروع والفريق',
        'سجل تغييرات كامل لكل ملف',
      ]}
    />
  );
}
