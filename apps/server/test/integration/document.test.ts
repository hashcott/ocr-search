import { createCaller, createAuthenticatedContext } from '../helpers';
import { Document } from '../../src/db/models/Document';
import { Organization } from '../../src/db/models/Organization';
import { Membership } from '../../src/db/models/Membership';
import * as documentProcessor from '../../src/services/document-processor';
import * as vectorService from '../../src/services/vector-service';
import mongoose from 'mongoose';

// Mock services
jest.mock('../../src/services/document-processor');
jest.mock('../../src/services/vector-service');

describe('Document Router Integration', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const orgId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create org and membership
    await Organization.create({
      _id: orgId,
      name: 'Test Org',
      slug: 'test-org',
      ownerId: userId,
    });

    await Membership.create({
      userId: userId,
      organizationId: orgId,
      role: 'owner',
      status: 'active',
    });
  });

  it('should upload a document', async () => {
    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    const mockProcessedResult = {
      id: new mongoose.Types.ObjectId().toString(),
      filename: 'test.txt',
      processingStatus: 'completed' as const,
    };

    (documentProcessor.processDocument as jest.Mock).mockResolvedValue(mockProcessedResult);

    const result = await caller.document.upload({
      filename: 'test.txt',
      mimeType: 'text/plain',
      data: Buffer.from('hello world').toString('base64'),
      size: 11,
      organizationId: orgId,
    });

    expect(result).toEqual(mockProcessedResult);
    expect(documentProcessor.processDocument).toHaveBeenCalled();
  });

  it('should list documents', async () => {
    // Create dummy documents directly in DB
    await Document.create({
      userId: userId,
      filename: 'doc1.txt',
      mimeType: 'text/plain',
      processingStatus: 'completed',
      size: 100,
      originalPath: 'path/to/doc1.txt',
      organizationId: orgId,
      visibility: 'organization'
    });

    await Document.create({
      userId: userId,
      filename: 'doc2.txt',
      mimeType: 'text/plain',
      processingStatus: 'completed',
      size: 200,
      originalPath: 'path/to/doc2.txt',
      organizationId: orgId,
      visibility: 'organization'
    });

    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    const result = await caller.document.list();

    expect(result).toHaveLength(2);
    expect(result.some(d => d.filename === 'doc1.txt')).toBe(true);
    expect(result.some(d => d.filename === 'doc2.txt')).toBe(true);
  });

  it('should delete a document', async () => {
     const doc = await Document.create({
      userId: userId,
      filename: 'to-delete.txt',
      mimeType: 'text/plain',
      processingStatus: 'completed',
      size: 100,
      originalPath: 'path/to/delete.txt',
      organizationId: orgId,
      visibility: 'organization'
    });

    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    (vectorService.deleteFromVectorDB as jest.Mock).mockResolvedValue(true);

    const result = await caller.document.delete({
        id: doc._id.toString()
    });

    expect(result.success).toBe(true);
    
    const deletedDoc = await Document.findById(doc._id);
    expect(deletedDoc).toBeNull();
  });
});
