import { Document, IDocument } from '../db/models/Document';
import { getStorageAdapter } from './storage';
import { getProcessorForFile } from './processors';
import { storeInVectorDB, deleteFromVectorDB } from './vector-service';
import { emitDocumentProcessed } from './websocket';
import mongoose from 'mongoose';

export async function processDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  userId: string,
  organizationId?: string
) {
  // Generate a temporary ID for the file path
  const tempId = new Date().getTime().toString();
  const filePath = `${userId}/${tempId}/${filename}`;

  let document: IDocument | null = null;

  try {
    // 1. Store original file first
    const storage = await getStorageAdapter();
    await storage.upload(fileBuffer, filePath, mimeType);

    // 2. Create document record with the path
    document = await Document.create({
      userId,
      filename,
      mimeType,
      size: fileBuffer.length,
      originalPath: filePath,
      processingStatus: 'processing',
      ...(organizationId && {
        organizationId: new mongoose.Types.ObjectId(organizationId),
        visibility: 'organization',
      }),
      ...(!organizationId && {
        visibility: 'private',
      }),
    });

    // 3. Process file to extract text
    const processor = getProcessorForFile(mimeType);
    if (!processor) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    const processed = await processor.process(fileBuffer, filename);

    // Update document with processed data
    document.textContent = processed.text;
    document.pageCount = processed.pageCount;
    document.metadata = processed.metadata;
    await document.save();

    // 4. Store in vector database
    await storeInVectorDB(document._id.toString(), processed.text, {
      userId,
      filename,
      documentId: document._id.toString(),
      ...(organizationId && { organizationId }),
    });

    // 5. Mark as completed
    document.processingStatus = 'completed';
    document.processingError = undefined;
    await document.save();

    // Emit WebSocket notification
    emitDocumentProcessed(userId, {
      documentId: document._id.toString(),
      filename: document.filename,
      status: 'completed',
    });

    return {
      id: document._id.toString(),
      filename: document.filename,
      processingStatus: document.processingStatus,
    };
  } catch (error) {
    console.error('Document processing error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mark document as failed if it was created
    if (document) {
      try {
        document.processingStatus = 'failed';
        document.processingError = errorMessage;
        await document.save();

        // Emit WebSocket notification
        emitDocumentProcessed(userId, {
          documentId: document._id.toString(),
          filename: document.filename,
          status: 'failed',
          error: errorMessage,
        });
      } catch (updateError) {
        console.error('Failed to update document status:', updateError);
      }
    } else {
      // Try to find and update the document by userId and filename
      try {
        const failedDoc = await Document.findOne({
          userId,
          originalPath: filePath,
        });
        if (failedDoc) {
          failedDoc.processingStatus = 'failed';
          failedDoc.processingError = errorMessage;
          await failedDoc.save();

          emitDocumentProcessed(userId, {
            documentId: failedDoc._id.toString(),
            filename: failedDoc.filename,
            status: 'failed',
            error: errorMessage,
          });
        }
      } catch (_notifyError) {
        // Ignore notification errors
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * Re-process a document that failed or needs reindexing
 */
export async function reindexDocument(documentId: string, userId: string) {
  const document = await Document.findById(documentId);

  if (!document) {
    throw new Error('Document not found');
  }

  if (document.userId !== userId) {
    throw new Error('You do not have permission to reindex this document');
  }

  // Set status to processing
  document.processingStatus = 'processing';
  document.processingError = undefined;
  await document.save();

  try {
    // 1. Get the original file from storage
    const storage = await getStorageAdapter();
    const fileBuffer = await storage.download(document.originalPath);

    // 2. Process file to extract text
    const processor = getProcessorForFile(document.mimeType);
    if (!processor) {
      throw new Error(`Unsupported file type: ${document.mimeType}`);
    }

    const processed = await processor.process(fileBuffer, document.filename);

    // Update document with processed data
    document.textContent = processed.text;
    document.pageCount = processed.pageCount;
    document.metadata = processed.metadata;
    await document.save();

    // 3. Delete old vectors and store new ones
    try {
      await deleteFromVectorDB(document._id.toString());
    } catch (deleteError) {
      console.warn('Failed to delete old vectors:', deleteError);
    }

    await storeInVectorDB(document._id.toString(), processed.text, {
      userId,
      filename: document.filename,
      documentId: document._id.toString(),
      ...(document.organizationId && {
        organizationId: document.organizationId.toString(),
      }),
    });

    // 4. Mark as completed
    document.processingStatus = 'completed';
    document.processingError = undefined;
    await document.save();

    // Emit WebSocket notification
    emitDocumentProcessed(userId, {
      documentId: document._id.toString(),
      filename: document.filename,
      status: 'completed',
    });

    return {
      id: document._id.toString(),
      filename: document.filename,
      processingStatus: document.processingStatus,
    };
  } catch (error) {
    console.error('Document reindex error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mark document as failed
    document.processingStatus = 'failed';
    document.processingError = errorMessage;
    await document.save();

    // Emit WebSocket notification
    emitDocumentProcessed(userId, {
      documentId: document._id.toString(),
      filename: document.filename,
      status: 'failed',
      error: errorMessage,
    });

    throw new Error(errorMessage);
  }
}
