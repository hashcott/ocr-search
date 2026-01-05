import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt";

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`🔌 WebSocket connected: User ${userId}`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
      console.log(`🔌 WebSocket disconnected: User ${userId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("WebSocket server not initialized. Call initializeWebSocket first.");
  }
  return io;
}

// Helper functions to emit notifications
export function emitDocumentProcessed(userId: string, data: {
  documentId: string;
  filename: string;
  status: "completed" | "failed";
  error?: string;
}) {
  const socketIO = getIO();
  socketIO.to(`user:${userId}`).emit("document:processed", data);
}

export function emitChatCompleted(userId: string, data: {
  chatId: string;
  message: string;
  sourcesCount: number;
}) {
  const socketIO = getIO();
  socketIO.to(`user:${userId}`).emit("chat:completed", data);
}

