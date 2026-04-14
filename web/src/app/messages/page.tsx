'use client';
import { MessageSquare } from 'lucide-react';
import ComingSoon from '@/components/ComingSoon';

export default function MessagesPage() {
  return (
    <ComingSoon
      title="الرسائل"
      icon={<MessageSquare size={40} strokeWidth={2} />}
      description="دردشة مباشرة مع كل من تتابعهم أو أعضاء فريقك في الشركة"
      accentColor="#14E0A4"
    />
  );
}
