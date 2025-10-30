/**
 * Utility Functions for RAG MVP
 */

import { NextRequest } from "next/server";
import { getOpenAIClient, getPineconeIndex } from "./clients";
import type {
  EmbeddingResponse,
  VectorSearchResult,
  VectorDocument,
  VectorUpsertResult,
  APIErrorResponse,
  DocumentMetadata,
} from "@/types";

// ==================== Configuration ====================

export function getRAGConfig() {
  return {
    embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    embeddingDimensions: parseInt(
      process.env.EMBEDDING_DIMENSIONS || "1536",
      10
    ),
    llmModel: process.env.LLM_MODEL || "gpt-4-turbo-preview",
    topKResults: parseInt(process.env.TOP_K_RESULTS || "5", 10),
    pineconeIndexName: process.env.PINECONE_INDEX_NAME || "",
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || "",
  };
}

// ==================== API Key Validation ====================

export function validateAPIKey(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.RAG_API_KEY;

  if (!expectedKey) {
    console.error("[Auth] RAG_API_KEY environment variable not set");
    return false;
  }

  if (!authHeader) {
    return false;
  }

  // Support both "Bearer <key>" and plain "<key>" formats
  const providedKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  return providedKey === expectedKey;
}

// ==================== Error Response Helpers ====================

export function createErrorResponse(
  error: string,
  message: string,
  statusCode: number
): Response {
  const errorResponse: APIErrorResponse = {
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  return Response.json(errorResponse, { status: statusCode });
}

export function handleError(error: unknown): Response {
  console.error("[Error Handler]", error);

  if (error instanceof Error) {
    return createErrorResponse("InternalServerError", error.message, 500);
  }

  return createErrorResponse(
    "UnknownError",
    "An unexpected error occurred",
    500
  );
}

// ==================== Embedding Functions ====================

export async function generateEmbedding(
  text: string,
  model?: string
): Promise<EmbeddingResponse> {
  const config = getRAGConfig();
  const embeddingModel = model || config.embeddingModel;

  const openai = getOpenAIClient();

  try {
    const response = await openai.embeddings.create({
      model: embeddingModel,
      input: text,
    });

    return {
      embedding: response.data[0].embedding,
      model: embeddingModel,
      tokensUsed: response.usage.total_tokens,
    };
  } catch (error) {
    console.error("[Embedding Error]", error);
    throw new Error(`Failed to generate embedding: ${error}`);
  }
}

export async function generateEmbeddingsBatch(
  texts: string[],
  model?: string
): Promise<number[][]> {
  const config = getRAGConfig();
  const embeddingModel = model || config.embeddingModel;

  const openai = getOpenAIClient();

  try {
    const response = await openai.embeddings.create({
      model: embeddingModel,
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error("[Batch Embedding Error]", error);
    throw new Error(`Failed to generate batch embeddings: ${error}`);
  }
}

// ==================== Vector Search Functions ====================

export async function vectorSearch(
  queryEmbedding: number[],
  topK?: number
): Promise<VectorSearchResult[]> {
  const config = getRAGConfig();
  const k = topK || config.topKResults;

  const index = getPineconeIndex();

  try {
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: k,
      includeMetadata: true,
    });

    return (
      queryResponse.matches?.map((match) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
      })) || []
    );
  } catch (error) {
    console.error("[Vector Search Error]", error);
    throw new Error(`Vector search failed: ${error}`);
  }
}

// ==================== Vector Upsert Functions ====================

export function createVectorDocument(
  id: string,
  values: number[],
  content: string,
  metadata: DocumentMetadata = {}
): VectorDocument {
  return {
    id,
    values,
    metadata: {
      ...metadata,
      content,
    },
  };
}

export function extractContentFromSearchResult(
  result: VectorSearchResult
): string {
  const content = result.metadata?.content;
  return typeof content === "string" ? content : "";
}

export async function upsertVectors(
  documents: VectorDocument[]
): Promise<VectorUpsertResult> {
  const index = getPineconeIndex();

  try {
    const vectors = documents.map((doc) => ({
      id: doc.id,
      values: doc.values,
      metadata: doc.metadata as Record<
        string,
        string | number | boolean | string[]
      >,
    }));

    await index.upsert(vectors);

    return {
      upsertedCount: documents.length,
    };
  } catch (error) {
    console.error("[Vector Upsert Error]", error);
    throw new Error(`Failed to upsert vectors: ${error}`);
  }
}

// ==================== Text Processing ====================

export function chunkText(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);

  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    const wordLength = word.length + 1; // +1 for space

    if (currentLength + wordLength > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
      currentLength = wordLength;
    } else {
      currentChunk.push(word);
      currentLength += wordLength;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

// ==================== LLM Generation ====================

export async function generateRAGResponse(
  query: string,
  context: string[]
): Promise<{ answer: string; tokensUsed: number }> {
  const config = getRAGConfig();
  const openai = getOpenAIClient();

  const systemPrompt = `You are a helpful AI assistant. Answer the user's question based on the provided context.
If the context doesn't contain enough information to answer the question, say so.
Be concise and accurate.`;

  const contextText = context.join("\n\n---\n\n");

  const userPrompt = `Context:\n${contextText}\n\nQuestion: ${query}\n\nAnswer:`;

  try {
    const response = await openai.chat.completions.create({
      model: config.llmModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return {
      answer: response.choices[0]?.message?.content || "No response generated",
      tokensUsed: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error("[LLM Generation Error]", error);
    throw new Error(`Failed to generate response: ${error}`);
  }
}

// ==================== Timing Utilities ====================

export class Timer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  reset(): void {
    this.startTime = Date.now();
  }
}
