# API Documentation

Complete guide for using the RAG MVP API endpoints.

## Overview

The RAG MVP provides two main API endpoints:

1. **RAG Query Service** (`/api/rag/query`) - Query the RAG system
2. **Ingestion Worker** (`/api/ingestion/worker`) - Process documents

## RAG Query Service

### Endpoint

```
POST /api/rag/query
```

### Authentication

**Required**: API Key via `Authorization` header

```bash
Authorization: Bearer your-secure-api-key-here
```

### Request Format

#### Request Body

```typescript
{
  query: string;              // Required: User's question
  maxResults?: number;        // Optional: Number of documents to retrieve (default: 5)
  includeMetadata?: boolean;  // Optional: Include document metadata (default: true)
}
```

#### Example Request

```bash
curl -X POST https://your-domain.vercel.app/api/rag/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secure-api-key-here" \
  -d '{
    "query": "What is machine learning?",
    "maxResults": 5,
    "includeMetadata": true
  }'
```

### Response Format

#### Success Response (200)

```json
{
  "answer": "Machine learning is a subset of artificial intelligence...",
  "sources": [
    {
      "id": "doc_123_chunk_0",
      "content": "Machine learning is...",
      "score": 0.89,
      "metadata": {
        "title": "Introduction to ML",
        "url": "https://example.com/ml-intro",
        "documentType": "article"
      }
    }
  ],
  "metadata": {
    "queryProcessingTimeMs": 1245,
    "vectorSearchTimeMs": 156,
    "llmGenerationTimeMs": 1089,
    "totalDocumentsSearched": 5,
    "model": "gpt-4-turbo-preview"
  }
}
```

#### Error Response (400/401/500)

```json
{
  "error": "Invalid API key",
  "details": "The provided API key is not valid"
}
```

### Health Check

```bash
curl -X GET https://your-domain.vercel.app/api/rag/query \
  -H "Authorization: Bearer your-secure-api-key-here"
```

## Ingestion Worker

### Endpoint

```
POST /api/ingestion/worker
```

### Trigger Methods

#### Automatic (Vercel Cron)

- **Schedule**: Every 6 hours
- **Configuration**: Defined in `vercel.json`

#### Manual Trigger

```bash
curl -X POST https://your-domain.vercel.app/api/ingestion/worker \
  -H "Authorization: Bearer your-cron-secret"
```

### Response Format

#### Success Response (200)

```json
{
  "success": true,
  "jobId": "ingest_1698765432000",
  "documentsProcessed": 15,
  "errors": [],
  "duration": 45230
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Database connection failed",
  "jobId": "ingest_1698765432000",
  "duration": 1230
}
```

## Configuration

### Vercel Cron Jobs

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/ingestion/worker",
      "schedule": "0 */6 * * *" // Every 6 hours
    }
  ]
}
```

#### Schedule Formats

- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `0 */1 * * *` - Every hour
- `0 9 * * MON` - Every Monday at 9 AM
- `0 0 1 * *` - First day of every month

### Function Timeouts

- **RAG Query Service**: 30 seconds (Edge Runtime)
- **Ingestion Worker**: 300 seconds (Node.js Runtime)

## Testing

### Test Query Service Locally

```bash
# Basic query test
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"query":"Test question"}'

# Query with options
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "query": "What is machine learning?",
    "maxResults": 3,
    "includeMetadata": false
  }'
```

### Test Ingestion Worker

```bash
# Local test
curl -X POST http://localhost:3000/api/ingestion/worker

# Production test
curl -X POST https://your-domain.vercel.app/api/ingestion/worker \
  -H "Authorization: Bearer your-cron-secret"
```

### Integration Testing

#### Using JavaScript/TypeScript

```typescript
interface QueryRequest {
  query: string;
  maxResults?: number;
  includeMetadata?: boolean;
}

interface QueryResponse {
  answer: string;
  sources: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  metadata: {
    queryProcessingTimeMs: number;
    vectorSearchTimeMs: number;
    llmGenerationTimeMs: number;
    totalDocumentsSearched: number;
    model: string;
  };
}

async function queryRAG(query: string): Promise<QueryResponse> {
  const response = await fetch("/api/rag/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer your-api-key",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Usage
const result = await queryRAG("What is machine learning?");
console.log(result.answer);
```

#### Using Python

```python
import requests
import json

def query_rag(query: str, api_key: str, base_url: str) -> dict:
    """Query the RAG API"""

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }

    data = {
        'query': query,
        'maxResults': 5,
        'includeMetadata': True
    }

    response = requests.post(
        f'{base_url}/api/rag/query',
        headers=headers,
        json=data
    )

    response.raise_for_status()
    return response.json()

# Usage
result = query_rag(
    query="What is machine learning?",
    api_key="your-api-key",
    base_url="https://your-domain.vercel.app"
)

print(result['answer'])
```

## Integration with Open WebUI

Configure Open WebUI to use this RAG service:

1. Open WebUI Settings → **Knowledge** → **External RAG**
2. Set **Endpoint**: `https://your-domain.vercel.app/api/rag/query`
3. Add **Header**: `Authorization: Bearer your-api-key`
4. Set **Method**: POST
5. Test connection

### Open WebUI Configuration

```json
{
  "endpoint": "https://your-domain.vercel.app/api/rag/query",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer your-api-key",
    "Content-Type": "application/json"
  },
  "bodyTemplate": {
    "query": "{{query}}",
    "maxResults": 5,
    "includeMetadata": true
  }
}
```

## API Rate Limits & Best Practices

### Rate Limits

- **Default**: No built-in rate limiting (implement as needed)
- **OpenAI API**: Follows your OpenAI account limits
- **Pinecone**: Based on your plan (Starter: 100 QPS)
- **Vercel Functions**: 1000 concurrent executions (hobby), 1000+ (pro)

### Best Practices

#### For Clients

1. **Implement retry logic** with exponential backoff
2. **Cache responses** when appropriate
3. **Batch queries** when possible
4. **Handle timeouts** gracefully (30s max)
5. **Monitor response times** and optimize queries

#### For API Keys

1. **Rotate keys** regularly
2. **Use environment variables** never hardcode
3. **Implement key scoping** (read-only vs full access)
4. **Monitor usage** and set alerts
5. **Revoke compromised keys** immediately

#### Example Client Implementation

```typescript
class RAGClient {
  private apiKey: string;
  private baseUrl: string;
  private cache = new Map<string, any>();

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async query(query: string, useCache = true): Promise<QueryResponse> {
    // Check cache first
    if (useCache && this.cache.has(query)) {
      return this.cache.get(query);
    }

    const response = await this.makeRequest("/api/rag/query", {
      method: "POST",
      body: JSON.stringify({ query }),
    });

    // Cache successful responses
    if (useCache && response.ok) {
      const data = await response.json();
      this.cache.set(query, data);
      return data;
    }

    return response.json();
  }

  private async makeRequest(endpoint: string, options: RequestInit) {
    const url = `${this.baseUrl}${endpoint}`;

    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });
  }
}
```

## Monitoring & Analytics

### Key Metrics to Track

- **Response Time**: Average query processing time
- **Success Rate**: Percentage of successful queries
- **Error Rate**: Failed requests and error types
- **Token Usage**: OpenAI API consumption
- **Query Volume**: Number of requests per day/hour
- **User Satisfaction**: Quality of generated responses

### Logging

Access logs in Vercel Dashboard:

1. Go to your deployment
2. Click **Functions**
3. Select the function to view logs

### Health Monitoring

```bash
# Basic health check
curl -X GET https://your-domain.vercel.app/api/rag/query \
  -H "Authorization: Bearer your-api-key"

# Response should be: {"status": "healthy"}
```

## Error Handling

### Common Error Codes

- **400**: Bad Request (invalid query format)
- **401**: Unauthorized (invalid/missing API key)
- **429**: Rate Limited (too many requests)
- **500**: Internal Server Error (system failure)
- **503**: Service Unavailable (temporary outage)

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-10-30T12:00:00Z"
}
```

### Client Error Handling

```typescript
try {
  const result = await queryRAG("What is AI?");
  console.log(result.answer);
} catch (error) {
  if (error.status === 401) {
    console.error("Invalid API key");
  } else if (error.status === 429) {
    console.error("Rate limited - retry later");
  } else {
    console.error("Unknown error:", error.message);
  }
}
```
