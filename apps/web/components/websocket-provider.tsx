"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/lib/use-websocket";

/**
 * Global WebSocket provider that initializes the connection
 * and handles global notifications
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  // Initialize WebSocket connection globally
  useWebSocket(
    // Document processed handler
    (data) => {
      // Global handler - individual pages can also handle this
      console.log("📄 Document processed globally:", data);
    },
    // Chat completed handler
    (data) => {
      // Global handler - individual pages can also handle this
      console.log("💬 Chat completed globally:", data);
    }
  );

  return <>{children}</>;
}

