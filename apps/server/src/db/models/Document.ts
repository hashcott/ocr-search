import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

// Share entry for a specific user
export interface IUserShare {
    userId: string;
    permissions: string[]; // Array of PermissionAction
    sharedAt: Date;
    sharedBy: string;
}

// Share entry for an organization
export interface IOrganizationShare {
    organizationId: string;
    permissions: string[]; // Array of PermissionAction
    sharedAt: Date;
    sharedBy: string;
}

// Public share settings
export interface IPublicShare {
    enabled: boolean;
    permissions: string[]; // Array of PermissionAction (usually just ["read"])
    enabledAt?: Date;
    enabledBy?: string;
}

export interface IDocument extends MongooseDocument {
    userId: string;
    organizationId?: mongoose.Types.ObjectId;
    filename: string;
    originalPath: string;
    mimeType: string;
    size: number;
    textContent?: string;
    pageCount?: number;
    processingStatus: "pending" | "processing" | "completed" | "failed";
    processingError?: string;
    metadata?: Record<string, any>;
    visibility: "private" | "organization" | "public";
    // Advanced sharing
    sharedWithUsers?: IUserShare[]; // Users with specific permissions
    sharedWithOrganizations?: IOrganizationShare[]; // Organizations with specific permissions
    publicShare?: IPublicShare; // Public share settings
    // Backward compatibility
    sharedWith?: string[]; // Deprecated: use sharedWithUsers instead
    createdAt: Date;
    updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
            index: true,
        },
        filename: {
            type: String,
            required: true,
        },
        originalPath: {
            type: String,
            required: true,
        },
        mimeType: {
            type: String,
            required: true,
        },
        size: {
            type: Number,
            required: true,
        },
        textContent: {
            type: String,
        },
        pageCount: {
            type: Number,
        },
        processingStatus: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        processingError: {
            type: String,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        visibility: {
            type: String,
            enum: ["private", "organization", "public"],
            default: "private",
        },
        // Advanced sharing structure
        sharedWithUsers: [{
            userId: {
                type: String,
                required: true,
                index: true,
            },
            permissions: [{
                type: String,
                enum: ["manage", "create", "read", "update", "delete", "share", "export"],
            }],
            sharedAt: {
                type: Date,
                default: Date.now,
            },
            sharedBy: {
                type: String,
                required: true,
            },
        }],
        sharedWithOrganizations: [{
            organizationId: {
                type: Schema.Types.ObjectId,
                ref: "Organization",
                required: true,
                index: true,
            },
            permissions: [{
                type: String,
                enum: ["manage", "create", "read", "update", "delete", "share", "export"],
            }],
            sharedAt: {
                type: Date,
                default: Date.now,
            },
            sharedBy: {
                type: String,
                required: true,
            },
        }],
        publicShare: {
            enabled: {
                type: Boolean,
                default: false,
            },
            permissions: [{
                type: String,
                enum: ["manage", "create", "read", "update", "delete", "share", "export"],
            }],
            enabledAt: Date,
            enabledBy: String,
        },
        // Backward compatibility - deprecated
        sharedWith: [{
            type: String,
            index: true,
        }],
    },
    {
        timestamps: true,
    }
);

// Compound and additional indexes (single-field indexes defined inline with index: true)
DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ organizationId: 1, createdAt: -1 });
DocumentSchema.index({ processingStatus: 1 });
DocumentSchema.index({ visibility: 1 });
DocumentSchema.index({ "publicShare.enabled": 1 });

export const Document = mongoose.model<IDocument>("Document", DocumentSchema);
