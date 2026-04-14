import { redirect } from 'next/navigation';

// Legacy page — redirects to pricing
export default function SubscribePage() {
  redirect('/pricing');
}
