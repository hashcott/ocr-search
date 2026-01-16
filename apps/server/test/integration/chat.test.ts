import { createCaller, createAuthenticatedContext } from '../helpers';
import { ChatHistory } from '../../src/db/models/ChatHistory';
import * as ragService from '../../src/services/rag-service';
import mongoose from 'mongoose';

// Mock services
jest.mock('../../src/services/rag-service');
jest.mock('../../src/services/websocket');

describe('Chat Router Integration', () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('should create a new chat', async () => {
    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    const result = await caller.chat.create({
      title: 'My Chat',
    });

    expect(result.title).toBe('My Chat');
    
    const chat = await ChatHistory.findById(result.id);
    expect(chat).toBeDefined();
    expect(chat?.userId.toString()).toBe(userId);
  });

  it('should list user chats', async () => {
    await ChatHistory.create({
      userId: userId,
      title: 'Chat 1',
      messages: [],
    });

    await ChatHistory.create({
      userId: userId,
      title: 'Chat 2',
      messages: [],
    });

    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    const result = await caller.chat.list();

    expect(result).toHaveLength(2);
    expect(result.some(c => c.title === 'Chat 1')).toBe(true);
    expect(result.some(c => c.title === 'Chat 2')).toBe(true);
  });

  it('should send a message', async () => {
    const chat = await ChatHistory.create({
      userId: userId,
      title: 'Test Chat',
      messages: [],
    });

    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    const mockResponse = {
      answer: 'This is the answer',
      sources: [],
    };

    (ragService.performRAGQuery as jest.Mock).mockResolvedValue(mockResponse);

    const result = await caller.chat.sendMessage({
      chatId: chat._id.toString(),
      message: 'Hello',
    });

    expect(result.message).toBe('This is the answer');
    expect(ragService.performRAGQuery).toHaveBeenCalled();

    const updatedChat = await ChatHistory.findById(chat._id);
    expect(updatedChat?.messages).toHaveLength(2); // User message + AI response
    expect(updatedChat?.messages[0].content).toBe('Hello');
    expect(updatedChat?.messages[1].content).toBe('This is the answer');
  });
});
