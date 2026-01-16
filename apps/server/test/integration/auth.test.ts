import { createCaller, createMockContext } from '../helpers';
import { User } from '../../src/db/models/User';

describe('Auth Router Integration', () => {
  const ctx = createMockContext();
  const caller = createCaller(ctx);

  it('should allow setting up the first admin user', async () => {
    const input = {
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User',
    };

    const result = await caller.auth.setupAdmin(input);

    expect(result).toHaveProperty('token');
    expect(result.user).toMatchObject({
      email: input.email,
      name: input.name,
      role: 'admin',
    });

    // Verify in DB
    const user = await User.findOne({ email: input.email });
    expect(user).toBeDefined();
    expect(user?.role).toBe('admin');
  });

  it('should prevent setting up admin if a user already exists', async () => {
    // Create a dummy user first (simulating an existing admin or user)
    await User.create({
      email: 'existing@example.com',
      password: 'hashedpassword',
      role: 'user',
    });

    const input = {
      email: 'newadmin@example.com',
      password: 'password123',
    };

    await expect(caller.auth.setupAdmin(input)).rejects.toThrow('Admin user already exists');
  });
});
