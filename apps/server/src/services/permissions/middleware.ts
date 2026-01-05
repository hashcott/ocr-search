import { TRPCError } from "@trpc/server";
import { Membership } from "../../db/models/Membership";
import { defineAbilityFor, AppAbility, AbilityContext } from "./ability";

/**
 * Get user's ability (permissions) based on their memberships
 */
export async function getUserAbility(userId: string): Promise<AppAbility> {
  // Fetch all active memberships for the user
  const memberships = await Membership.find({
    userId,
    status: "active",
  }).lean();

  const context: AbilityContext = {
    userId,
    memberships: memberships.map((m) => ({
      organizationId: m.organizationId.toString(),
      role: m.role,
      customPermissions: m.customPermissions,
    })),
  };

  return defineAbilityFor(context);
}

/**
 * Check if user can perform action on a resource
 * Throws TRPCError if not authorized
 */
export async function authorize(
  userId: string,
  action: string,
  resource: string,
  resourceData?: Record<string, any>
): Promise<void> {
  const ability = await getUserAbility(userId);

  if (!ability.can(action as any, resource as any, resourceData as any)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have permission to ${action} this ${resource.toLowerCase()}`,
    });
  }
}

/**
 * Get user's memberships with organization details
 */
export async function getUserMemberships(userId: string) {
  return Membership.find({
    userId,
    status: "active",
  })
    .populate("organizationId", "name slug type logo")
    .lean();
}

/**
 * Check if user is member of an organization
 */
export async function isMemberOf(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    status: "active",
  });
  
  return !!membership;
}

/**
 * Get user's role in an organization
 */
export async function getUserRole(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    status: "active",
  });
  
  return membership?.role || null;
}

