import mongoose, { Schema, Document } from 'mongoose';

// Role types - extensible for different organization types
export type MemberRole =
  | 'owner' // Full control, can delete organization
  | 'admin' // Manage members, all CRUD operations
  | 'editor' // Create, read, update documents
  | 'member' // Create and read documents
  | 'viewer' // Read-only access
  | 'guest'; // Limited read access

// Permission actions
export type PermissionAction =
  | 'manage' // Full control (includes all actions)
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'share'
  | 'export'
  | 'invite';

// Resource types
export type ResourceType = 'all' | 'organization' | 'document' | 'chat' | 'member' | 'settings';

export interface IMembership extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  role: MemberRole;
  customPermissions?: {
    resource: ResourceType;
    actions: PermissionAction[];
  }[];
  invitedBy?: mongoose.Types.ObjectId;
  invitedAt?: Date;
  joinedAt?: Date;
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'editor', 'member', 'viewer', 'guest'],
      default: 'member',
    },
    customPermissions: [
      {
        resource: {
          type: String,
          enum: ['all', 'organization', 'document', 'chat', 'member', 'settings'],
        },
        actions: [
          {
            type: String,
            enum: ['manage', 'create', 'read', 'update', 'delete', 'share', 'export', 'invite'],
          },
        ],
      },
    ],
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    invitedAt: Date,
    joinedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index - one membership per user per organization
MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
MembershipSchema.index({ organizationId: 1, status: 1 });
MembershipSchema.index({ userId: 1, status: 1 });

export const Membership = mongoose.model<IMembership>('Membership', MembershipSchema);

// Role hierarchy - higher index = more permissions
export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  owner: 100,
  admin: 80,
  editor: 60,
  member: 40,
  viewer: 20,
  guest: 10,
};

// Default permissions per role
// - owner: full permissions
// - admin: manage members, full document management
// - editor: create and edit documents, view files
// - member: create and view files
// - viewer: only view files
// - guest: can only view files that are explicitly shared with them (no default org access)
export const DEFAULT_ROLE_PERMISSIONS: Record<
  MemberRole,
  { resource: ResourceType; actions: PermissionAction[] }[]
> = {
  owner: [{ resource: 'all', actions: ['manage'] }],
  admin: [
    { resource: 'organization', actions: ['read', 'update'] },
    { resource: 'document', actions: ['manage'] },
    { resource: 'chat', actions: ['manage'] },
    { resource: 'member', actions: ['manage', 'invite'] },
    { resource: 'settings', actions: ['read', 'update'] },
  ],
  editor: [
    { resource: 'organization', actions: ['read'] },
    { resource: 'document', actions: ['create', 'read', 'update'] },
    { resource: 'chat', actions: ['create', 'read', 'update'] },
    { resource: 'member', actions: ['read'] },
  ],
  member: [
    { resource: 'organization', actions: ['read'] },
    { resource: 'document', actions: ['create', 'read'] },
    { resource: 'chat', actions: ['create', 'read'] },
    { resource: 'member', actions: ['read'] },
  ],
  viewer: [
    { resource: 'organization', actions: ['read'] },
    { resource: 'document', actions: ['read'] },
    { resource: 'chat', actions: ['read'] },
    { resource: 'member', actions: ['read'] },
  ],
  // Guest has NO default document permissions - they can only view files explicitly shared with them
  guest: [],
};
