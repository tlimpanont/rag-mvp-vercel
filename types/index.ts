/**
 * Core Types for RAG MVP System
 */

// ==================== RAG Query Types ====================

export interface RAGQueryRequest {
  query: string;
  maxResults?: number;
  includeMetadata?: boolean;
  stream?: boolean;
}

export interface RAGQueryResponse {
  answer: string;
  sources: DocumentSource[];
  metadata: QueryMetadata;
}

export interface DocumentSource {
  id: string;
  content: string;
  score: number;
  metadata: DocumentMetadata;
}

export interface DocumentMetadata {
  title?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  documentType?: string;
  [key: string]: unknown;
}

export interface QueryMetadata {
  queryProcessingTimeMs: number;
  vectorSearchTimeMs: number;
  llmGenerationTimeMs: number;
  totalDocumentsSearched: number;
  model: string;
}

// ==================== Ingestion Types ====================

export interface IngestionJob {
  id: string;
  status: IngestionStatus;
  documentsProcessed: number;
  documentsTotal: number;
  startedAt: string;
  completedAt?: string;
  errors?: IngestionError[];
}

export type IngestionStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface IngestionError {
  documentId: string;
  message: string;
  timestamp: string;
}

export interface DocumentToIngest {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  blobUrl?: string;
}

export interface IngestionWorkerResponse {
  success: boolean;
  jobId: string;
  documentsProcessed: number;
  errors: IngestionError[];
  duration: number;
}

// ==================== Vector Store Types ====================

export interface VectorDocument {
  id: string;
  values: number[];
  metadata: DocumentMetadata & {
    content: string;
  };
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: DocumentMetadata & {
    content: string;
  };
}

export interface VectorUpsertResult {
  upsertedCount: number;
}

// ==================== Embedding Types ====================

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

// ==================== API Response Types ====================

export interface APIErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface APISuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

// ==================== Configuration Types ====================

export interface RAGConfig {
  embeddingModel: string;
  embeddingDimensions: number;
  llmModel: string;
  topKResults: number;
  pineconeIndexName: string;
  pineconeEnvironment: string;
}

// ==================== Database Types ====================

export interface DocumentRecord {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  indexed_at?: Date;
}

export interface IngestionJobRecord {
  id: string;
  status: IngestionStatus;
  documents_processed: number;
  documents_total: number;
  started_at: Date;
  completed_at?: Date;
  error_log?: string;
}
