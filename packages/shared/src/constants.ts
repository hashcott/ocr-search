// File type constants
export const SUPPORTED_FILE_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  XML: 'application/xml',
  TXT: 'text/plain',
} as const;

export const FILE_EXTENSIONS: Record<string, string> = {
  '.pdf': SUPPORTED_FILE_TYPES.PDF,
  '.docx': SUPPORTED_FILE_TYPES.DOCX,
  '.doc': SUPPORTED_FILE_TYPES.DOC,
  '.xml': SUPPORTED_FILE_TYPES.XML,
  '.txt': SUPPORTED_FILE_TYPES.TXT,
};

// Processing constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const CHUNK_SIZE = 1000; // characters per chunk
export const CHUNK_OVERLAP = 200; // overlap between chunks

// Vector search constants
export const DEFAULT_TOP_K = 5;
export const MAX_TOP_K = 20;

// LLM constants
export const DEFAULT_TEMPERATURE = 0.7;
export const MAX_CONTEXT_LENGTH = 4000;

// Default models
export const DEFAULT_OLLAMA_MODEL = 'llama3';
export const DEFAULT_OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';
export const DEFAULT_OPENAI_MODEL = 'gpt-4-turbo-preview';
export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

// Role constants
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

// Status constants
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
