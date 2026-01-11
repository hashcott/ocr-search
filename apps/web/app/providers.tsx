'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore, useWebSocketStore } from '@/lib/stores';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const token = useAuthStore((state) => state.token);
  const connect = useWebSocketStore((state) => state.connect);

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/trpc',
            headers() {
              // Get auth token from Zustand store (dynamic on each request)
              const currentToken = useAuthStore.getState().token;

              return {
                authorization: currentToken ? `Bearer ${currentToken}` : '',
              };
            },
          }),
        ],
      }),
    []
  );

  // Initialize WebSocket connection when token is available
  useEffect(() => {
    if (token) {
      connect(token);
    }
  }, [token, connect]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
