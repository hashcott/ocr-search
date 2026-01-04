import { z } from 'zod';
import * as schemas from './schemas';

// User types
export type User = z.infer<typeof schemas.UserSchema>;
export type CreateUserInput = z.infer<typeof schemas.CreateUserSchema>;
export type LoginInput = z.infer<typeof schemas.LoginSchema>;

// Document types
export type Document = z.infer<typeof schemas.DocumentSchema>;
export type DocumentMetadata = z.infer<typeof schemas.DocumentMetadataSchema>;
export type ProcessedDocument = z.infer<typeof schemas.ProcessedDocumentSchema>;

// File processor types
export interface FileProcessor {
  supportedTypes: string[];
  process(file: Buffer, filename: string): Promise<ProcessedDocument>;
}

// Storage types
export interface StorageAdapter {
  upload(file: Buffer, path: string, contentType?: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl(path: string): Promise<string>;
}

// Vector store types
export interface VectorStoreAdapter {
  upsert(documents: VectorDocument[]): Promise<void>;
  search(query: string, topK: number, filter?: Record<string, any>): Promise<SearchResult[]>;
  delete(ids: string[]): Promise<void>;
}

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

// LLM types
export type LLMProvider = 'ollama' | 'openai';
export type EmbeddingProvider = 'ollama' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
}

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

// Config types
export type SystemConfig = z.infer<typeof schemas.SystemConfigSchema>;
export type StorageConfig = z.infer<typeof schemas.StorageConfigSchema>;
export type VectorDBConfig = z.infer<typeof schemas.VectorDBConfigSchema>;

// RAG types
export interface RAGQueryInput {
  query: string;
  topK?: number;
  documentIds?: string[];
}

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  tokensUsed?: number;
}

