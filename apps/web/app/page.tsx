import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to dashboard or setup based on system state
  redirect('/dashboard');
}
