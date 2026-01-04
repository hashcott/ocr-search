import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@search-pdf/server";

export const trpc = createTRPCReact<AppRouter>();

