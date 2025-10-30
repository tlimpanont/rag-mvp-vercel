/**
 * Global Service Clients - Singleton Pattern
 * Minimizes cold start times in Vercel Serverless Functions
 */

import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// ==================== OpenAI Client ====================

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    openaiClient = new OpenAI({
      apiKey,
    });

    console.log('[OpenAI Client] Initialized successfully');
  }

  return openaiClient;
}

// ==================== Pinecone Client ====================

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }

    pineconeClient = new Pinecone({
      apiKey,
    });

    console.log('[Pinecone Client] Initialized successfully');
  }

  return pineconeClient;
}

// ==================== Pinecone Index ====================

let pineconeIndex: ReturnType<Pinecone['index']> | null = null;

export function getPineconeIndex() {
  if (!pineconeIndex) {
    const indexName = process.env.PINECONE_INDEX_NAME;

    if (!indexName) {
      throw new Error('PINECONE_INDEX_NAME environment variable is not set');
    }

    const client = getPineconeClient();
    pineconeIndex = client.index(indexName);

    console.log(`[Pinecone Index] Connected to index: ${indexName}`);
  }

  return pineconeIndex;
}

// ==================== Client Health Check ====================

export async function healthCheckClients(): Promise<{
  openai: boolean;
  pinecone: boolean;
}> {
  const results = {
    openai: false,
    pinecone: false,
  };

  try {
    const openai = getOpenAIClient();
    // Simple check to verify client is initialized
    results.openai = !!openai;
  } catch (error) {
    console.error('[Health Check] OpenAI client error:', error);
  }

  try {
    const pinecone = getPineconeClient();
    results.pinecone = !!pinecone;
  } catch (error) {
    console.error('[Health Check] Pinecone client error:', error);
  }

  return results;
}
