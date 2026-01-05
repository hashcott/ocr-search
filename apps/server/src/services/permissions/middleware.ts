import { TRPCError } from "@trpc/server";
import { Membership, PermissionAction } from "../../db/models/Membership";
import { defineAbilityFor, AppAbility, AbilityContext } from "./ability";
import { Document, IDocument } from "../../db/models/Document";
import mongoose from "mongoose";

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
    memberships: memberships.map((m) => {
      // Ensure organizationId is always a string
      const orgId = m.organizationId instanceof mongoose.Types.ObjectId 
        ? m.organizationId.toString() 
        : String(m.organizationId);
      
      return {
        organizationId: orgId,
        role: m.role,
        customPermissions: m.customPermissions,
      };
    }),
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

  // For MongoAbility, when we define: can(action, "Document", { organizationId: "123" })
  // We check by passing a subject object that matches the conditions
  let canAccess: boolean;
  
  if (resourceData && resourceData.organizationId) {
    // Ensure organizationId is a string to match the definition
    const orgId = String(resourceData.organizationId);
    // Create subject object that matches the conditions we defined
    // MongoAbility will match the subject object against the defined conditions
    const subject = {
      __typename: resource,
      organizationId: orgId,
    };
    canAccess = ability.can(action as any, subject);
  } else {
    // No conditions - check without conditions
    canAccess = ability.can(action as any, resource as any);
  }

  if (!canAccess) {
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

/**
 * Get all organization IDs that the user is a member of
 */
export async function getUserOrganizations(userId: string): Promise<string[]> {
  const memberships = await Membership.find({
    userId,
    status: "active",
  }).lean();
  
  return memberships.map((m) => m.organizationId.toString());
}

/**
 * Get document access context (organization membership info)
 */
export async function getDocumentAccessContext(
  userId: string,
  document: IDocument
): Promise<{
  isPersonal: boolean;
  organizationId: string | null;
  membership: any | null;
  isOwner: boolean;
}> {
  const isPersonal = !document.organizationId;
  const organizationId = document.organizationId?.toString() || null;
  
  let membership = null;
  if (organizationId) {
    membership = await Membership.findOne({
      userId,
      organizationId,
      status: "active",
    }).lean();
  }
  
  const isOwner = document.userId === userId;
  
  return {
    isPersonal,
    organizationId,
    membership,
    isOwner,
  };
}

/**
 * Get user's share permissions for a document
 */
export function getUserSharePermissions(
  userId: string,
  document: IDocument,
  userOrgs: string[]
): {
  fromUserShare: string[] | null;
  fromOrgShare: string[] | null;
  fromPublicShare: string[] | null;
} {
  // Check user-specific share
  let fromUserShare: string[] | null = null;
  if (document.sharedWithUsers) {
    const userShare = document.sharedWithUsers.find((s) => s.userId === userId);
    if (userShare) {
      fromUserShare = userShare.permissions;
    }
  }

  // Check organization share
  let fromOrgShare: string[] | null = null;
  if (document.sharedWithOrganizations && userOrgs.length > 0) {
    for (const orgShare of document.sharedWithOrganizations) {
      const orgId = orgShare.organizationId instanceof mongoose.Types.ObjectId
        ? orgShare.organizationId.toString()
        : String(orgShare.organizationId);
      
      if (userOrgs.includes(orgId)) {
        // User is member of shared organization, merge permissions
        if (!fromOrgShare) {
          fromOrgShare = [];
        }
        // Merge permissions (union, no duplicates)
        fromOrgShare = Array.from(new Set([...fromOrgShare, ...orgShare.permissions]));
      }
    }
  }

  // Check public share
  let fromPublicShare: string[] | null = null;
  if (document.publicShare && document.publicShare.enabled) {
    fromPublicShare = document.publicShare.permissions || [];
  }

  // Backward compatibility: check old sharedWith array
  if ((!fromUserShare) && document.sharedWith && document.sharedWith.includes(userId)) {
    fromUserShare = ["read"]; // Default to read-only for old shares
  }

  return {
    fromUserShare,
    fromOrgShare,
    fromPublicShare,
  };
}

/**
 * Check if user can perform action on a document
 */
export async function canAccessDocument(
  userId: string,
  documentId: string,
  action: PermissionAction
): Promise<boolean> {
  const document = await Document.findById(documentId);
  if (!document) {
    return false;
  }
  
  const context = await getDocumentAccessContext(userId, document);
  const userOrgs = await getUserOrganizations(userId);
  
  // Owner always has all permissions
  if (context.isOwner) {
    return true;
  }
  
  // Check share permissions (user share, org share, public share)
  const sharePerms = getUserSharePermissions(userId, document, userOrgs);
  
  // Check user-specific share permissions
  if (sharePerms.fromUserShare && sharePerms.fromUserShare.includes(action)) {
    return true;
  }
  // Check if "manage" is granted (manage includes all actions)
  if (sharePerms.fromUserShare && sharePerms.fromUserShare.includes("manage")) {
    return true;
  }
  
  // Check organization share permissions
  if (sharePerms.fromOrgShare && sharePerms.fromOrgShare.includes(action)) {
    return true;
  }
  if (sharePerms.fromOrgShare && sharePerms.fromOrgShare.includes("manage")) {
    return true;
  }
  
  // Check public share permissions
  if (sharePerms.fromPublicShare && sharePerms.fromPublicShare.includes(action)) {
    return true;
  }
  if (sharePerms.fromPublicShare && sharePerms.fromPublicShare.includes("manage")) {
    return true;
  }
  
  // Personal documents: only owner or shared users can access
  if (context.isPersonal) {
    return false; // Already checked owner above
  }
  
  // Organization documents
  if (!context.membership) {
    // Not a member of the organization
    return false;
  }
  
  // Check visibility rules
  if (document.visibility === "private") {
    // Private documents: only owner can access (already checked)
    return false;
  }
  
  // For organization/public documents, check organization permissions
  const ability = await getUserAbility(userId);
  
  // Check if user has the required permission in the organization
  if (!context.organizationId) {
    return false;
  }
  
  // For MongoAbility, create subject object that matches the conditions
  const orgId = String(context.organizationId);
  const subject = {
    __typename: "Document" as const,
    organizationId: orgId,
  };
  return ability.can(action, subject);
}

/**
 * Filter documents by user's access permissions
 */
export async function filterDocumentsByPermission(
  userId: string,
  documents: IDocument[],
  action: PermissionAction = "read"
): Promise<IDocument[]> {
  const ability = await getUserAbility(userId);
  const userOrgs = await getUserOrganizations(userId);
  const userOrgIds = new Set(userOrgs);
  
  const accessible: IDocument[] = [];
  
  for (const doc of documents) {
    // Owner always has access
    if (doc.userId === userId) {
      accessible.push(doc);
      continue;
    }
    
    // Check share permissions
    const sharePerms = getUserSharePermissions(userId, doc, userOrgs);
    
    // Check if user has permission from any share type
    let hasPermission = false;
    
    // Check user share
    if (sharePerms.fromUserShare) {
      hasPermission = sharePerms.fromUserShare.includes(action) || 
                      sharePerms.fromUserShare.includes("manage");
    }
    
    // Check organization share
    if (!hasPermission && sharePerms.fromOrgShare) {
      hasPermission = sharePerms.fromOrgShare.includes(action) || 
                      sharePerms.fromOrgShare.includes("manage");
    }
    
    // Check public share
    if (!hasPermission && sharePerms.fromPublicShare) {
      hasPermission = sharePerms.fromPublicShare.includes(action) || 
                      sharePerms.fromPublicShare.includes("manage");
    }
    
    if (hasPermission) {
      accessible.push(doc);
      continue;
    }
    
    // Personal documents: only owner or shared users can access
    if (!doc.organizationId) {
      continue; // Already checked owner and shares above
    }
    
    // Organization documents
    const orgId = doc.organizationId.toString();
    
    // Check if user is member of the organization
    if (!userOrgIds.has(orgId)) {
      continue;
    }
    
    // Check visibility
    if (doc.visibility === "private") {
      // Private: only owner (already checked)
      continue;
    }
    
    // Check permission for organization/public documents
    const orgIdStr = String(orgId);
    const subject = {
      __typename: "Document" as const,
      organizationId: orgIdStr,
    };
    if (ability.can(action, subject)) {
      accessible.push(doc);
    }
  }
  
  return accessible;
}

