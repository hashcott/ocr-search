import { defineAbilityFor } from '../../../src/services/permissions/ability';
import { subject } from '@casl/ability';

describe('Permissions Ability Unit Test', () => {
  const userId = 'user-123';
  const orgId = 'org-456';

  it('should grant full access to owner', () => {
    const ability = defineAbilityFor({
      userId,
      memberships: [
        {
          organizationId: orgId,
          role: 'owner',
        },
      ],
    });

    // Check generic access
    expect(ability.can('manage', 'Organization')).toBe(true);
    expect(ability.can('create', 'Document')).toBe(true);
    
    // Check specific resource access
    const doc = subject('Document', { organizationId: orgId });
    expect(ability.can('read', doc)).toBe(true);
    expect(ability.can('delete', doc)).toBe(true);
  });

  it('should restrict viewer to read-only', () => {
    const ability = defineAbilityFor({
      userId,
      memberships: [
        {
          organizationId: orgId,
          role: 'viewer',
        },
      ],
    });

    // Viewers can read documents
    expect(ability.can('read', 'Document')).toBe(true);

    // Viewers cannot create or delete
    expect(ability.can('create', 'Document')).toBe(false);
    expect(ability.can('delete', 'Document')).toBe(false);

    // Check on specific object
    const doc = subject('Document', { organizationId: orgId });
    expect(ability.can('read', doc)).toBe(true);
    expect(ability.can('update', doc)).toBe(false);
  });

  it('should allow custom permissions to override role', () => {
    const ability = defineAbilityFor({
      userId,
      memberships: [
        {
          organizationId: orgId,
          role: 'viewer',
          customPermissions: [
            {
              resource: 'document',
              actions: ['create'], // Grant create permission to a viewer
            },
          ],
        },
      ],
    });

    expect(ability.can('create', 'Document')).toBe(true);
    // Still shouldn't be able to delete
    expect(ability.can('delete', 'Document')).toBe(false);
  });
});
