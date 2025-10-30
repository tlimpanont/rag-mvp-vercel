/**
 * Global Service Clients - Singleton Pattern
 * Minimizes cold start times in Vercel Serverless Functions
 */

import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { createPool } from "@vercel/postgres";

// ==================== OpenAI Client ====================

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    openaiClient = new OpenAI({
      apiKey,
    });

    console.log("[OpenAI Client] Initialized successfully");
  }

  return openaiClient;
}

// ==================== Pinecone Client ====================

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
      throw new Error("PINECONE_API_KEY environment variable is not set");
    }

    pineconeClient = new Pinecone({
      apiKey,
    });

    console.log("[Pinecone Client] Initialized successfully");
  }

  return pineconeClient;
}

// ==================== Pinecone Index ====================

let pineconeIndex: ReturnType<Pinecone["index"]> | null = null;

export function getPineconeIndex() {
  if (!pineconeIndex) {
    const indexName = process.env.PINECONE_INDEX_NAME;

    if (!indexName) {
      throw new Error("PINECONE_INDEX_NAME environment variable is not set");
    }

    const client = getPineconeClient();
    pineconeIndex = client.index(indexName);

    console.log(`[Pinecone Index] Connected to index: ${indexName}`);
  }

  return pineconeIndex;
}

// ==================== Postgres Client ====================

let postgresPool: ReturnType<typeof createPool> | null = null;

export function getPostgresClient() {
  if (!postgresPool) {
    const connectionString =
      process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

    if (!connectionString) {
      throw new Error(
        "POSTGRES_PRISMA_URL or POSTGRES_URL environment variable is not set"
      );
    }

    postgresPool = createPool({
      connectionString,
    });

    console.log("[Postgres Client] Pool initialized successfully");
  }

  return postgresPool;
}

// ==================== Client Health Check ====================

export async function healthCheckClients(): Promise<{
  openai: boolean;
  pinecone: boolean;
  postgres: boolean;
}> {
  const results = {
    openai: false,
    pinecone: false,
    postgres: false,
  };

  try {
    const openai = getOpenAIClient();
    // Simple check to verify client is initialized
    results.openai = !!openai;
  } catch (error) {
    console.error("[Health Check] OpenAI client error:", error);
  }

  try {
    const pinecone = getPineconeClient();
    results.pinecone = !!pinecone;
  } catch (error) {
    console.error("[Health Check] Pinecone client error:", error);
  }

  try {
    const postgres = getPostgresClient();
    // Test a simple query
    await postgres.sql`SELECT 1`;
    results.postgres = true;
  } catch (error) {
    console.error("[Health Check] Postgres client error:", error);
  }

  return results;
}
