/**
 * OpenAI-Compatible Chat Completions API for Open WebUI Integration
 * Endpoint: POST /api/chat/completions
 * Purpose: Provide OpenAI-compatible interface for Open WebUI
 */

import { NextRequest } from "next/server";
import type { RAGQueryRequest } from "@/types";
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

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface OpenAIChatResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: "stop";
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * POST /api/chat/completions
 * OpenAI-Compatible Chat Completions
 */
export async function POST(request: NextRequest) {
  const totalTimer = new Timer();

  try {
    // ==================== 1. API Key Validation ====================
    if (!validateAPIKey(request)) {
      console.warn("[OpenAI Chat] Unauthorized access attempt");
      return createErrorResponse(
        "Unauthorized",
        "Invalid or missing API key",
        401
      );
    }

    // ==================== 2. Parse Request Body ====================
    let body: OpenAIChatRequest;

    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        "BadRequest",
        "Invalid JSON in request body",
        400
      );
    }

    const { messages, model = "rag-enhanced", stream = false } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return createErrorResponse(
        "BadRequest",
        "Messages array is required and must not be empty",
        400
      );
    }

    // Get the last user message as the query
    const lastUserMessage = messages
      .reverse()
      .find((msg) => msg.role === "user");

    if (!lastUserMessage || !lastUserMessage.content) {
      return createErrorResponse(
        "BadRequest",
        "No user message found in conversation",
        400
      );
    }

    const query = lastUserMessage.content;
    console.log(
      `[OpenAI Chat] Processing query: "${query.substring(0, 100)}..."`
    );

    if (stream) {
      return createErrorResponse(
        "NotImplemented",
        "Streaming not yet implemented",
        501
      );
    }

    const config = getRAGConfig();

    // ==================== 3. Generate Query Embedding ====================
    const embeddingTimer = new Timer();
    const { embedding } = await generateEmbedding(query);
    const embeddingTime = embeddingTimer.elapsed();

    console.log(`[OpenAI Chat] Embedding generated in ${embeddingTime}ms`);

    // ==================== 4. Vector Search ====================
    const searchTimer = new Timer();
    const searchResults = await vectorSearch(embedding, config.topKResults);
    const searchTime = searchTimer.elapsed();

    console.log(
      `[OpenAI Chat] Found ${searchResults.length} results in ${searchTime}ms`
    );

    let answer: string;

    if (searchResults.length === 0) {
      answer =
        "I don't have any specific documents about this topic in my knowledge base. However, I can provide general information if that would be helpful.";
    } else {
      // ==================== 5. Prepare Context for LLM ====================
      const contextTexts = searchResults.map((result) =>
        extractContentFromSearchResult(result)
      );

      // ==================== 6. Generate Answer with LLM ====================
      const generationTimer = new Timer();
      const ragResponse = await generateRAGResponse(query, contextTexts);
      answer = ragResponse.answer;
      const generationTime = generationTimer.elapsed();

      console.log(`[OpenAI Chat] Answer generated in ${generationTime}ms`);

      // Add source information to the answer
      if (searchResults.length > 0) {
        const sourceInfo = searchResults
          .slice(0, 3) // Show top 3 sources
          .map((result, index) => {
            const title =
              typeof result.metadata.title === "string"
                ? result.metadata.title
                : `Document ${index + 1}`;
            return `${index + 1}. ${title}`;
          })
          .join("\n");

        answer += `\n\n**Sources:**\n${sourceInfo}`;
      }
    }

    // ==================== 7. Format OpenAI-Compatible Response ====================
    const response: OpenAIChatResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: answer,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: query.length / 4, // Rough estimation
        completion_tokens: answer.length / 4, // Rough estimation
        total_tokens: (query.length + answer.length) / 4,
      },
    };

    console.log(
      `[OpenAI Chat] Total processing time: ${totalTimer.elapsed()}ms`
    );

    return Response.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Processing-Time-Ms": totalTimer.elapsed().toString(),
      },
    });
  } catch (error) {
    console.error("[OpenAI Chat] Error:", error);
    return handleError(error);
  }
}

/**
 * GET /api/chat/completions
 * Health Check Endpoint
 */
export async function GET(request: NextRequest) {
  if (!validateAPIKey(request)) {
    return createErrorResponse(
      "Unauthorized",
      "Invalid or missing API key",
      401
    );
  }

  return Response.json({
    status: "healthy",
    service: "OpenAI-Compatible Chat Completions",
    endpoint: "/api/chat/completions",
    compatible_with: "Open WebUI, ChatGPT clients",
    timestamp: new Date().toISOString(),
  });
}
