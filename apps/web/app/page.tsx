'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

export default function Home() {
  const router = useRouter();
  const { data: initData, isLoading } = trpc.config.isInitialized.useQuery();

  useEffect(() => {
    if (!isLoading) {
      if (!initData?.isInitialized) {
        router.push('/setup');
      } else {
        router.push('/dashboard');
      }
    }
  }, [initData, isLoading, router]);

  // Show loading state while checking
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="border-primary mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
