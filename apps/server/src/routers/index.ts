import { router } from '../trpc';
import { authRouter } from './auth';
import { documentRouter } from './document';
import { searchRouter } from './search';
import { configRouter } from './config';
import { chatRouter } from './chat';
import { organizationRouter } from './organization';
import { notificationRouter } from './notification';

export const appRouter = router({
  auth: authRouter,
  document: documentRouter,
  search: searchRouter,
  config: configRouter,
  chat: chatRouter,
  organization: organizationRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
