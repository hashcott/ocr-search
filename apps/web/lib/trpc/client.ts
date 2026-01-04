import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@search-pdf/server/src/trpc";

export const trpc = createTRPCReact<AppRouter>();

