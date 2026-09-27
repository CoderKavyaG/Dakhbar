import { redirect } from 'next/navigation';

export default function ForYouRedirectPage() {
  redirect('/?tab=following');
}
