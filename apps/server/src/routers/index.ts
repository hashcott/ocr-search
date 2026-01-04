import { router } from "../trpc";
import { authRouter } from "./auth";
import { documentRouter } from "./document";
import { searchRouter } from "./search";
import { configRouter } from "./config";

export const appRouter = router({
  auth: authRouter,
  document: documentRouter,
  search: searchRouter,
  config: configRouter,
});

export type AppRouter = typeof appRouter;

