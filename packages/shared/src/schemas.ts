import { z } from 'zod';

// User schemas
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['admin', 'user']).default('user'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['admin', 'user']).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Document schemas
export const DocumentMetadataSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  uploadedBy: z.string(),
  uploadedAt: z.date(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']),
  processingError: z.string().optional(),
});

export const DocumentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  filename: z.string(),
  originalPath: z.string(),
  mimeType: z.string(),
  size: z.number(),
  textContent: z.string().optional(),
  pageCount: z.number().optional(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']),
  processingError: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProcessedDocumentSchema = z.object({
  text: z.string(),
  metadata: z.record(z.any()).optional(),
  pageCount: z.number().optional(),
});

// File upload schema
export const FileUploadSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  data: z.string(), // base64 encoded
});

// System config schemas
export const StorageConfigSchema = z.object({
  type: z.enum(['s3', 'local', 'minio']),
  config: z.object({
    bucket: z.string().optional(),
    region: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    endpoint: z.string().optional(),
    localPath: z.string().optional(),
  }),
});

export const VectorDBConfigSchema = z.object({
  type: z.enum(['qdrant', 'meilisearch', 'mongodb']),
  config: z.object({
    url: z.string(),
    apiKey: z.string().optional(),
    collectionName: z.string().optional(),
  }),
});

export const LLMConfigSchema = z.object({
  provider: z.enum(['ollama', 'openai']),
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const EmbeddingConfigSchema = z.object({
  provider: z.enum(['ollama', 'openai']),
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});

export const SystemConfigSchema = z.object({
  id: z.string(),
  isSetupComplete: z.boolean().default(false),
  database: z.object({
    url: z.string(),
  }),
  storage: StorageConfigSchema,
  vectorDB: VectorDBConfigSchema,
  llm: LLMConfigSchema,
  embedding: EmbeddingConfigSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// RAG query schema
export const RAGQuerySchema = z.object({
  query: z.string().min(1),
  topK: z.number().min(1).max(20).optional().default(5),
  documentIds: z.array(z.string()).optional(),
});

// Search schema
export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  topK: z.number().min(1).max(50).optional().default(10),
  filter: z.record(z.any()).optional(),
});

