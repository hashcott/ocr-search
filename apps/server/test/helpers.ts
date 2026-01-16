import { appRouter } from '../src/routers';
import { createCallerFactory } from '../src/trpc';
import { Context } from '../src/trpc';

export const createCaller = createCallerFactory(appRouter);

export const createMockContext = (overrides?: Partial<Context>): Context => {
  return {
    userId: undefined,
    userRole: undefined,
    ...overrides,
  };
};

export const createAuthenticatedContext = (userId: string, userRole: string = 'member'): Context => {
  return {
    userId,
    userRole,
  };
};
