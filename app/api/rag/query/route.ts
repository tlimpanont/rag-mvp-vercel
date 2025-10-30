/**
 * RAG Query Service - Vercel Serverless Function
 * Endpoint: POST /api/rag/query
 * Purpose: Handle user queries with vector search + LLM generation
 * Exposed to: External clients via API
 */

import { NextRequest } from "next/server";
import type {
  RAGQueryRequest,
  RAGQueryResponse,
  DocumentSource,
} from "@/types";
import {
  validateAPIKey,
  createErrorResponse,
  handleError,
  generateEmbedding,
  vectorSearch,
  generateRAGResponse,
  extractContentFromSearchResult,
  Timer,
  getRAGConfig,
} from "@/lib/utils";

export const runtime = "edge";
export const maxDuration = 30;

/**
 * POST /api/rag/query
 * Main RAG Query Handler
 */
export async function POST(request: NextRequest) {
  const totalTimer = new Timer();

  try {
    // ==================== 1. API Key Validation ====================
    if (!validateAPIKey(request)) {
      console.warn("[RAG Query] Unauthorized access attempt");
      return createErrorResponse(
        "Unauthorized",
        "Invalid or missing API key",
        401
      );
    }

    // ==================== 2. Parse Request Body ====================
    let body: RAGQueryRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        "BadRequest",
        "Invalid JSON in request body",
        400
      );
    }

    const { query, maxResults, includeMetadata = true } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return createErrorResponse(
        "BadRequest",
        "Query parameter is required and must be a non-empty string",
        400
      );
    }

    console.log(
      `[RAG Query] Processing query: "${query.substring(0, 100)}..."`
    );

    const config = getRAGConfig();

    // ==================== 3. Generate Query Embedding ====================
    const embeddingTimer = new Timer();
    const { embedding } = await generateEmbedding(query);
    const embeddingTime = embeddingTimer.elapsed();

    console.log(`[RAG Query] Embedding generated in ${embeddingTime}ms`);

    // ==================== 4. Vector Search ====================
    const searchTimer = new Timer();
    const searchResults = await vectorSearch(
      embedding,
      maxResults || config.topKResults
    );
    const searchTime = searchTimer.elapsed();

    console.log(
      `[RAG Query] Found ${searchResults.length} results in ${searchTime}ms`
    );

    if (searchResults.length === 0) {
      return Response.json({
        answer:
          "I couldn't find any relevant information to answer your question.",
        sources: [],
        metadata: {
          queryProcessingTimeMs: totalTimer.elapsed(),
          vectorSearchTimeMs: searchTime,
          llmGenerationTimeMs: 0,
          totalDocumentsSearched: 0,
          model: config.llmModel,
        },
      } satisfies RAGQueryResponse);
    }

    // ==================== 5. Prepare Context for LLM ====================
    const contextTexts = searchResults.map((result) =>
      extractContentFromSearchResult(result)
    );

    // ==================== 6. Generate Answer with LLM ====================
    const generationTimer = new Timer();
    const { answer } = await generateRAGResponse(query, contextTexts);
    const generationTime = generationTimer.elapsed();

    console.log(`[RAG Query] Answer generated in ${generationTime}ms`);

    // ==================== 7. Format Response ====================
    const sources: DocumentSource[] = searchResults.map((result) => ({
      id: result.id,
      content: extractContentFromSearchResult(result),
      score: result.score,
      metadata: includeMetadata
        ? {
            title:
              typeof result.metadata.title === "string"
                ? result.metadata.title
                : undefined,
            url:
              typeof result.metadata.url === "string"
                ? result.metadata.url
                : undefined,
            createdAt:
              typeof result.metadata.createdAt === "string"
                ? result.metadata.createdAt
                : undefined,
            updatedAt:
              typeof result.metadata.updatedAt === "string"
                ? result.metadata.updatedAt
                : undefined,
            documentType:
              typeof result.metadata.documentType === "string"
                ? result.metadata.documentType
                : undefined,
          }
        : {},
    }));

    const response: RAGQueryResponse = {
      answer,
      sources,
      metadata: {
        queryProcessingTimeMs: totalTimer.elapsed(),
        vectorSearchTimeMs: searchTime,
        llmGenerationTimeMs: generationTime,
        totalDocumentsSearched: searchResults.length,
        model: config.llmModel,
      },
    };

    console.log(`[RAG Query] Total processing time: ${totalTimer.elapsed()}ms`);

    return Response.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Processing-Time-Ms": totalTimer.elapsed().toString(),
      },
    });
  } catch (error) {
    console.error("[RAG Query] Error:", error);
    return handleError(error);
  }
}

/**
 * GET /api/rag/query
 * Health Check Endpoint
 */
export async function GET(request: NextRequest) {
  // Optional: Add health check logic
  if (!validateAPIKey(request)) {
    return createErrorResponse(
      "Unauthorized",
      "Invalid or missing API key",
      401
    );
  }

  return Response.json({
    status: "healthy",
    service: "RAG Query Service",
    timestamp: new Date().toISOString(),
  });
}
