import { Document } from "../db/models/Document";
import { getStorageAdapter } from "./storage";
import { getProcessorForFile } from "./processors";
import { storeInVectorDB } from "./vector-service";
import path from "path";

export async function processDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  userId: string
) {
  // Create document record
  const document = await Document.create({
    userId,
    filename,
    mimeType,
    size: fileBuffer.length,
    originalPath: "", // Will be updated after storage
    processingStatus: "processing",
  });

  try {
    // 1. Store original file
    const storage = await getStorageAdapter();
    const filePath = `${userId}/${document._id}/${filename}`;
    await storage.upload(fileBuffer, filePath, mimeType);

    // Update document with file path
    document.originalPath = filePath;
    await document.save();

    // 2. Process file to extract text
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

    // 3. Store in vector database
    await storeInVectorDB(document._id.toString(), processed.text, {
      userId,
      filename,
      documentId: document._id.toString(),
    });

    // 4. Mark as completed
    document.processingStatus = "completed";
    await document.save();

    return {
      id: document._id.toString(),
      filename: document.filename,
      processingStatus: document.processingStatus,
    };
  } catch (error) {
    console.error("Document processing error:", error);

    // Mark as failed
    document.processingStatus = "failed";
    document.processingError = error instanceof Error ? error.message : String(error);
    await document.save();

    throw error;
  }
}

