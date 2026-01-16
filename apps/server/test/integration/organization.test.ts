import { createCaller, createAuthenticatedContext } from '../helpers';
import { Organization } from '../../src/db/models/Organization';
import { Membership } from '../../src/db/models/Membership';
import { User } from '../../src/db/models/User';
import mongoose from 'mongoose';

describe('Organization Router Integration', () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();
  
  let orgId: string;

  beforeEach(async () => {
    // Create users
    await User.create({
      _id: adminId,
      email: 'admin@example.com',
      password: 'password',
      name: 'Admin User',
      role: 'admin'
    });

    await User.create({
      _id: userId,
      email: 'user@example.com',
      password: 'password',
      name: 'Normal User',
      role: 'user'
    });

    await User.create({
      _id: otherUserId,
      email: 'other@example.com',
      password: 'password',
      name: 'Other User',
      role: 'user'
    });

    // Create a test organization owned by adminId
    const org = await Organization.create({
      name: 'Test Org',
      slug: 'test-org',
      ownerId: adminId,
    });
    orgId = org._id.toString();

    // Add admin membership
    await Membership.create({
      userId: adminId,
      organizationId: orgId,
      role: 'owner',
      status: 'active',
    });
  });

  it('should allow owner to update organization settings', async () => {
    const ctx = createAuthenticatedContext(adminId, 'admin');
    const caller = createCaller(ctx);

    const result = await caller.organization.update({
      id: orgId,
      name: 'Updated Org Name',
      settings: {
        allowPublicDocuments: true,
      },
    });

    expect(result.name).toBe('Updated Org Name');
    expect(result.updated).toBe(true);

    const updatedOrg = await Organization.findById(orgId);
    expect(updatedOrg?.name).toBe('Updated Org Name');
    expect(updatedOrg?.settings?.allowPublicDocuments).toBe(true);
  });

  it('should allow owner to invite a member', async () => {
    const ctx = createAuthenticatedContext(adminId, 'admin');
    const caller = createCaller(ctx);
    
    // Create a user first to invite
    await User.create({
      email: 'newmember@example.com',
      password: 'password',
      name: 'New Member',
      role: 'user',
    });

    const result = await caller.organization.inviteMember({
      organizationId: orgId,
      email: 'newmember@example.com',
      role: 'member',
    });

    expect(result.email).toBe('newmember@example.com');

    const membership = await Membership.findOne({ 
      organizationId: orgId, 
      userId: result.userId
    });
    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('member');
  });

  it('should list members of an organization', async () => {
    // Add another member directly to DB
    await Membership.create({
      userId: userId,
      organizationId: orgId,
      role: 'member',
      status: 'active',
      email: 'member@example.com',
    });

    const ctx = createAuthenticatedContext(adminId, 'admin');
    const caller = createCaller(ctx);

    const members = await caller.organization.listMembers({
      organizationId: orgId,
    });

    expect(members).toHaveLength(2); // Owner + Member
    expect(members.some(m => m.userId === userId)).toBe(true);
    expect(members.some(m => m.userId === adminId)).toBe(true);
  });

  it('should update member role', async () => {
     // Add another member directly to DB
     await Membership.create({
        userId: userId,
        organizationId: orgId,
        role: 'member',
        status: 'active',
        email: 'member@example.com',
      });
  
      const ctx = createAuthenticatedContext(adminId, 'admin');
      const caller = createCaller(ctx);

      const result = await caller.organization.updateMemberRole({
          organizationId: orgId,
          userId: userId,
          role: 'editor'
      });

      expect(result.newRole).toBe('editor');

      const membership = await Membership.findOne({ userId: userId, organizationId: orgId });
      expect(membership?.role).toBe('editor');
  });

  it('should remove a member', async () => {
      // Add another member directly to DB
     await Membership.create({
        userId: otherUserId,
        organizationId: orgId,
        role: 'member',
        status: 'active',
        email: 'other@example.com',
      });

      const ctx = createAuthenticatedContext(adminId, 'admin');
      const caller = createCaller(ctx);

      await caller.organization.removeMember({
          organizationId: orgId,
          userId: otherUserId
      });

      const membership = await Membership.findOne({ userId: otherUserId, organizationId: orgId });
      expect(membership).toBeNull();
  });
});
