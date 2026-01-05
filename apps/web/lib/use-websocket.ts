"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { authService } from "./auth";
import { playSuccessSound, playErrorSound } from "./notification-sound";

interface WebSocketEvents {
  "document:processed": (data: {
    documentId: string;
    filename: string;
    status: "completed" | "failed";
    error?: string;
  }) => void;
  "chat:completed": (data: {
    chatId: string;
    message: string;
    sourcesCount: number;
  }) => void;
}

export function useWebSocket(
  onDocumentProcessed?: (data: {
    documentId: string;
    filename: string;
    status: "completed" | "failed";
    error?: string;
  }) => void,
  onChatCompleted?: (data: {
    chatId: string;
    message: string;
    sourcesCount: number;
  }) => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = authService.getToken();
    if (!token) return;

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_API_URL?.replace("/trpc", "") || "http://localhost:3001";

    // Initialize socket connection
    const socket = io(serverUrl, {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("🔌 WebSocket connected");
    });

    socket.on("disconnect", () => {
      console.log("🔌 WebSocket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    // Document processed event
    socket.on("document:processed", (data) => {
      console.log("📄 Document processed:", data);

      if (data.status === "completed") {
        playSuccessSound();
        
        // Browser notification
        if (typeof window !== "undefined" && Notification.permission === "granted") {
          new Notification("Document Ready", {
            body: `${data.filename} has been processed successfully!`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
          });
        }
      } else {
        playErrorSound();
        
        if (typeof window !== "undefined" && Notification.permission === "granted") {
          new Notification("Processing Failed", {
            body: `Failed to process ${data.filename}: ${data.error || "Unknown error"}`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
          });
        }
      }

      // Call custom handler
      onDocumentProcessed?.(data);
    });

    // Chat completed event
    socket.on("chat:completed", (data) => {
      console.log("💬 Chat completed:", data);

      playSuccessSound();

      // Browser notification
      if (typeof window !== "undefined" && Notification.permission === "granted") {
        new Notification("RAG Search Complete", {
          body: `Found ${data.sourcesCount} relevant sources. Response ready!`,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
        });
      }

      // Call custom handler
      onChatCompleted?.(data);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [onDocumentProcessed, onChatCompleted]);

  return socketRef.current;
}

