import { createCaller, createMockContext, createAuthenticatedContext } from '../helpers';
import mongoose from 'mongoose';

describe('Permissions Integration', () => {
  it('should throw UNAUTHORIZED when calling protected procedure without context', async () => {
    const ctx = createMockContext(); // No user
    const caller = createCaller(ctx);

    // Try to create an organization (protected)
    await expect(
      caller.organization.create({
        name: 'Test Org',
        slug: 'test-org',
      })
    ).rejects.toThrow('UNAUTHORIZED');
  });

  it('should deny non-admin to create organization', async () => {
    const ctx = createAuthenticatedContext(new mongoose.Types.ObjectId().toString(), 'member');
    const caller = createCaller(ctx);

    await expect(
      caller.organization.create({
        name: 'Test Org',
        slug: 'test-org',
      })
    ).rejects.toThrow('Only admin users can create organizations');
  });

  it('should allow admin to create organization', async () => {
    const ctx = createAuthenticatedContext(new mongoose.Types.ObjectId().toString(), 'admin');
    const caller = createCaller(ctx);
    
    const result = await caller.organization.create({
      name: 'Test Org',
      slug: 'test-org',
    });

    expect(result).toHaveProperty('id');
    expect(result.name).toBe('Test Org');
  });
});
