import { redirect } from 'next/navigation';

export default function BriefRedirectPage() {
  redirect('/?tab=following');
}
