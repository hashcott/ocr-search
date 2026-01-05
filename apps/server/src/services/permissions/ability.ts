import { AbilityBuilder, createMongoAbility, MongoAbility, ForcedSubject } from "@casl/ability";
import { IMembership, MemberRole, DEFAULT_ROLE_PERMISSIONS, PermissionAction, ResourceType } from "../../db/models/Membership";

// Define subjects (resources) that can be acted upon
type Subjects = 
  | "Organization"
  | "Document"
  | "Chat"
  | "Member"
  | "Settings"
  | "all";

// Define actions
type Actions = PermissionAction;

// Define the ability type
export type AppAbility = MongoAbility<[Actions, Subjects | ForcedSubject<Subjects>]>;

// User context for ability building
export interface AbilityContext {
  userId: string;
  memberships: {
    organizationId: string;
    role: MemberRole;
    customPermissions?: IMembership["customPermissions"];
  }[];
}

// Map resource types to subjects
const resourceToSubject: Record<ResourceType, Subjects> = {
  all: "all",
  organization: "Organization",
  document: "Document",
  chat: "Chat",
  member: "Member",
  settings: "Settings",
};

/**
 * Build ability (permissions) for a user based on their memberships
 */
export function defineAbilityFor(context: AbilityContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // For each organization the user is a member of
  for (const membership of context.memberships) {
    const { organizationId, role, customPermissions } = membership;

    // Get default permissions for the role
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];

    // Apply role-based permissions
    for (const permission of rolePermissions) {
      const subject = resourceToSubject[permission.resource];
      
      for (const action of permission.actions) {
        if (action === "manage") {
          // "manage" grants all actions on the resource
          can("manage", subject, { organizationId } as any);
        } else {
          can(action, subject, { organizationId } as any);
        }
      }
    }

    // Apply custom permissions (overrides)
    if (customPermissions) {
      for (const permission of customPermissions) {
        const subject = resourceToSubject[permission.resource];
        
        for (const action of permission.actions) {
          can(action, subject, { organizationId } as any);
        }
      }
    }
  }

  // Users can always read their own data (regardless of organization)
  can("read", "Document", { userId: context.userId } as any);
  can("read", "Chat", { userId: context.userId } as any);
  can("manage", "Chat", { userId: context.userId } as any);

  return build();
}

/**
 * Check if user has permission for an action on a resource
 */
export function checkPermission(
  ability: AppAbility,
  action: Actions,
  resource: Subjects,
  resourceData?: Record<string, any>
): boolean {
  return ability.can(action, resource, resourceData as any);
}

/**
 * Get all permissions for a user in a specific organization
 */
export function getOrganizationPermissions(
  ability: AppAbility,
  organizationId: string
): Record<Subjects, Actions[]> {
  const subjects: Subjects[] = ["Organization", "Document", "Chat", "Member", "Settings"];
  const actions: Actions[] = ["manage", "create", "read", "update", "delete", "share", "export", "invite"];
  
  const permissions: Record<string, Actions[]> = {};

  for (const subject of subjects) {
    const allowedActions: Actions[] = [];
    
    for (const action of actions) {
      if (ability.can(action, subject, { organizationId } as any)) {
        allowedActions.push(action);
      }
    }
    
    permissions[subject] = allowedActions;
  }

  return permissions as Record<Subjects, Actions[]>;
}

/**
 * Create a simple ability for public/unauthenticated users
 */
export function definePublicAbility(): AppAbility {
  const { cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  
  // Public users cannot do anything by default
  cannot("manage", "all");
  
  return build();
}

