import { createCaller, createAuthenticatedContext } from '../helpers';
import { User } from '../../src/db/models/User';
import { SystemConfig } from '../../src/db/models/SystemConfig';

describe('Config Router Integration', () => {
  
  it('should check initialization status', async () => {
    const ctx = createAuthenticatedContext('admin-id', 'admin');
    const caller = createCaller(ctx);

    const result = await caller.config.isInitialized();
    expect(result.isInitialized).toBe(false);

    // Create a user
    await User.create({
        email: 'test@test.com',
        password: 'hash',
        role: 'admin'
    });

    const resultAfter = await caller.config.isInitialized();
    expect(resultAfter.isInitialized).toBe(true);
  });

  it('should get system config', async () => {
     // Create a config
     await SystemConfig.create({
         isSetupComplete: true,
         storage: { provider: 'local', local: { path: '/tmp' } },
         vectorDB: { provider: 'qdrant', url: 'http://localhost' },
         llm: { provider: 'openai', model: 'gpt-3.5' },
         embedding: { provider: 'openai', model: 'text-embedding-3-small' }
     });

     const ctx = createAuthenticatedContext('user-1', 'member');
     const caller = createCaller(ctx);

     const config = await caller.config.get();
     expect(config.isSetupComplete).toBe(true);
  });
});
