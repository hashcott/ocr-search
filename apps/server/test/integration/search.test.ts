import { createCaller, createAuthenticatedContext } from '../helpers';
import * as ragService from '../../src/services/rag-service';
import * as vectorService from '../../src/services/vector-service';
import mongoose from 'mongoose';

// Mock services
jest.mock('../../src/services/rag-service');
jest.mock('../../src/services/vector-service');

describe('Search Router Integration', () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('should perform RAG query', async () => {
    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    const mockResponse = {
      answer: 'This is the answer',
      sources: [],
    };

    (ragService.performRAGQuery as jest.Mock).mockResolvedValue(mockResponse);

    const result = await caller.search.rag({
      query: 'test query',
    });

    expect(result).toEqual(mockResponse);
    expect(ragService.performRAGQuery).toHaveBeenCalledWith(
      'test query',
      userId,
      5,
      undefined
    );
  });

  it('should perform vector search', async () => {
    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    const mockResults = [
      {
        id: '1',
        content: 'test content',
        metadata: { documentId: 'doc1' },
        score: 0.9,
      },
    ];

    (vectorService.searchVectorStore as jest.Mock).mockResolvedValue(mockResults);

    const result = await caller.search.vector({
      query: 'test query',
    });

    expect(result).toEqual(mockResults);
    expect(vectorService.searchVectorStore).toHaveBeenCalledWith(
      'test query',
      userId,
      10,
      undefined
    );
  });
});
