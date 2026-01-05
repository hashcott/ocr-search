import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

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
    },
    {
        timestamps: true,
    }
);

// Indexes
DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ organizationId: 1, createdAt: -1 });
DocumentSchema.index({ processingStatus: 1 });
DocumentSchema.index({ visibility: 1 });

export const Document = mongoose.model<IDocument>("Document", DocumentSchema);
