/**
 * Ingestion Worker - Vercel Serverless Function
 * Endpoint: POST /api/ingestion/worker
 * Purpose: Background task for ingesting and indexing documents
 * Triggered by: Vercel Cron Job (every 6 hours)
 */

import { NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';
import { list } from '@vercel/blob';
import type {
  IngestionWorkerResponse,
  IngestionError,
  DocumentToIngest,
  VectorDocument,
} from '@/types';
import {
  createErrorResponse,
  handleError,
  generateEmbeddingsBatch,
  upsertVectors,
  chunkText,
  Timer,
} from '@/lib/utils';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/ingestion/worker
 * Main Ingestion Handler
 */
export async function POST(request: NextRequest) {
  const totalTimer = new Timer();
  const jobId = `ingest_${Date.now()}`;

  console.log(`[Ingestion Worker] Starting job ${jobId}`);

  try {
    // ==================== 1. Verify Cron Secret (Optional Security) ====================
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Ingestion Worker] Unauthorized cron execution attempt');
      return createErrorResponse(
        'Unauthorized',
        'Invalid cron secret',
        401
      );
    }

    // ==================== 2. Fetch Unprocessed Documents ====================
    const documents = await fetchUnprocessedDocuments();

    if (documents.length === 0) {
      console.log('[Ingestion Worker] No documents to process');
      return Response.json({
        success: true,
        jobId,
        documentsProcessed: 0,
        errors: [],
        duration: totalTimer.elapsed(),
      } satisfies IngestionWorkerResponse);
    }

    console.log(`[Ingestion Worker] Processing ${documents.length} documents`);

    // ==================== 3. Process Documents ====================
    const errors: IngestionError[] = [];
    let processedCount = 0;

    for (const document of documents) {
      try {
        await processDocument(document);
        processedCount++;
        console.log(`[Ingestion Worker] Processed document: ${document.id}`);
      } catch (error) {
        console.error(
          `[Ingestion Worker] Failed to process document ${document.id}:`,
          error
        );
        errors.push({
          documentId: document.id,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ==================== 4. Update Job Status ====================
    await updateJobStatus(jobId, processedCount, documents.length, errors);

    const response: IngestionWorkerResponse = {
      success: errors.length === 0,
      jobId,
      documentsProcessed: processedCount,
      errors,
      duration: totalTimer.elapsed(),
    };

    console.log(
      `[Ingestion Worker] Job ${jobId} completed in ${totalTimer.elapsed()}ms`
    );

    return Response.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Ingestion Worker] Critical error:', error);
    return handleError(error);
  }
}

/**
 * Fetch unprocessed documents from various sources
 */
async function fetchUnprocessedDocuments(): Promise<DocumentToIngest[]> {
  const documents: DocumentToIngest[] = [];

  try {
    // ==================== Fetch from Vercel Blob Storage ====================
    const { blobs } = await list({
      limit: 100,
    });

    for (const blob of blobs) {
      // Check if already indexed
      const isIndexed = await checkIfIndexed(blob.pathname);
      
      if (!isIndexed) {
        // Fetch blob content
        const response = await fetch(blob.url);
        const content = await response.text();

        documents.push({
          id: blob.pathname,
          content,
          metadata: {
            title: blob.pathname,
            url: blob.url,
            createdAt: blob.uploadedAt.toISOString(),
            documentType: 'blob',
          },
          blobUrl: blob.url,
        });
      }
    }

    // ==================== Fetch from Vercel Postgres ====================
    // Example: Fetch documents marked as 'pending' in a database table
    const result = await sql`
      SELECT id, content, metadata, created_at
      FROM documents
      WHERE indexed_at IS NULL
      LIMIT 50
    `;

    for (const row of result.rows) {
      documents.push({
        id: row.id as string,
        content: row.content as string,
        metadata: {
          ...(row.metadata as Record<string, unknown>),
          createdAt: (row.created_at as Date).toISOString(),
          documentType: 'database',
        },
      });
    }
  } catch (error) {
    console.error('[Fetch Documents] Error:', error);
    // Return empty array if fetch fails, don't throw
  }

  return documents;
}

/**
 * Check if document is already indexed in vector store
 */
async function checkIfIndexed(documentId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT indexed_at FROM documents WHERE id = ${documentId}
    `;
    
    return result.rows.length > 0 && result.rows[0].indexed_at !== null;
  } catch {
    return false;
  }
}

/**
 * Process a single document: chunk, embed, and upsert to vector store
 */
async function processDocument(document: DocumentToIngest): Promise<void> {
  // ==================== 1. Chunk Document ====================
  const chunks = chunkText(document.content, 1000);

  console.log(
    `[Process Document] Split ${document.id} into ${chunks.length} chunks`
  );

  // ==================== 2. Generate Embeddings ====================
  const embeddings = await generateEmbeddingsBatch(chunks);

  // ==================== 3. Prepare Vector Documents ====================
  const vectorDocuments: VectorDocument[] = chunks.map((chunk, index) => ({
    id: `${document.id}_chunk_${index}`,
    values: embeddings[index],
    metadata: {
      ...document.metadata,
      content: chunk,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }));

  // ==================== 4. Upsert to Vector Store ====================
  await upsertVectors(vectorDocuments);

  // ==================== 5. Mark as Indexed in Database ====================
  try {
    await sql`
      UPDATE documents
      SET indexed_at = NOW()
      WHERE id = ${document.id}
    `;
  } catch (error) {
    console.warn(
      `[Process Document] Failed to update indexed status for ${document.id}:`,
      error
    );
  }
}

/**
 * Update job status in database
 */
async function updateJobStatus(
  jobId: string,
  documentsProcessed: number,
  documentsTotal: number,
  errors: IngestionError[]
): Promise<void> {
  try {
    const status = errors.length === 0 ? 'completed' : 'failed';
    const errorLog = errors.length > 0 ? JSON.stringify(errors) : null;

    await sql`
      INSERT INTO ingestion_jobs (
        id,
        status,
        documents_processed,
        documents_total,
        started_at,
        completed_at,
        error_log
      ) VALUES (
        ${jobId},
        ${status},
        ${documentsProcessed},
        ${documentsTotal},
        NOW(),
        NOW(),
        ${errorLog}
      )
    `;
  } catch (error) {
    console.error('[Update Job Status] Error:', error);
    // Don't throw, just log
  }
}

/**
 * GET /api/ingestion/worker
 * Health Check / Manual Trigger Info
 */
export async function GET() {
  return Response.json({
    status: 'ready',
    service: 'Ingestion Worker',
    message: 'This endpoint is triggered by Vercel Cron. Use POST to manually trigger.',
    timestamp: new Date().toISOString(),
  });
}
