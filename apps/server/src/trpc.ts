import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

// Context type
export interface Context {
  userId?: string;
  userRole?: string;
}

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Middleware for authentication
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      userId: ctx.userId,
      userRole: ctx.userRole,
    },
  });
});

// Middleware for admin only
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || ctx.userRole !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      userId: ctx.userId,
      userRole: ctx.userRole,
    },
  });
});

// Export procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const adminProcedure = t.procedure.use(isAdmin);

// Export types
export type AppRouter = ReturnType<typeof router>;

