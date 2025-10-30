# Setup Guide

This guide provides detailed instructions for setting up your RAG MVP system.

## Prerequisites

- Node.js 18+
- Vercel account
- OpenAI API key
- Pinecone account and index
- Vercel Postgres database (optional)
- Vercel Blob Storage (optional)

## Installation Steps

### 1. Clone and Install

```bash
git clone <your-repository-url>
cd rag-mvp-vercel
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

## 🔐 How to Obtain API Keys and Environment Variables

### OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log into your OpenAI account
3. Navigate to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-`) - store it safely as it won't be shown again
6. Set your usage limits and billing in the [Usage Dashboard](https://platform.openai.com/usage)

### Pinecone Configuration

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Sign up for a free account (includes 100K vectors)
3. Create a new project or use the default one
4. **API Key**: Navigate to **API Keys** → Copy your API key
5. **Environment**: Note your environment (e.g., `us-east-1-aws`, `us-west1-gcp`)
6. **Index**: Create a new index with these settings:
   - **Name**: `rag-mvp-vercel` (or your preferred name)
   - **Dimensions**: `1536` (for OpenAI's text-embedding-3-small)
   - **Metric**: `cosine`
   - **Pod Type**: `Starter` (free tier) or `s1.x1`

### Vercel Postgres Database (Optional)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project or create a new one
3. Navigate to **Storage** → **Create Database** → **Postgres**
4. Choose your plan (Hobby is free with limitations)
5. After creation, go to **Settings** → **Environment Variables**
6. Copy the three connection strings:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

### Vercel Blob Storage (Optional)

1. In [Vercel Dashboard](https://vercel.com/dashboard), go to your project
2. Navigate to **Storage** → **Create Database** → **Blob**
3. Choose your plan (Hobby includes 1GB free)
4. After creation, get your token from **Settings** → **Environment Variables**
5. Copy the `BLOB_READ_WRITE_TOKEN`

### API Security Keys

Generate secure random keys for:

- **RAG_API_KEY**: Create a strong random string (recommended 32+ characters)

  ```bash
  # Generate with OpenSSL
  openssl rand -base64 32

  # Or use Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

- **CRON_SECRET** (Optional): Another secure random string for cron job protection

### Application Settings

These are pre-configured in `.env.example` but can be customized:

- **EMBEDDING_MODEL**: `text-embedding-3-small` (OpenAI's latest, cost-effective)
- **EMBEDDING_DIMENSIONS**: `1536` (matches the embedding model)
- **LLM_MODEL**: `gpt-4-turbo-preview` or `gpt-4o` (latest models)
- **TOP_K_RESULTS**: `5` (number of documents to retrieve per query)

## Environment Variables Reference

### Required Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Pinecone Configuration
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=rag-mvp-vercel

# API Security (Generate a strong random key)
RAG_API_KEY=your-secure-api-key-here

# Application Settings
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
LLM_MODEL=gpt-4-turbo-preview
TOP_K_RESULTS=5
```

### Optional (for Ingestion Worker)

```env
# Vercel Postgres
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Cron Security (Optional)
CRON_SECRET=your-cron-secret
```

## Database Setup

### Set Up Database (Optional)

If using Vercel Postgres, run the schema:

```bash
# Connect to your Vercel Postgres instance and execute:
psql $POSTGRES_URL < db/schema.sql
```

### Set Up Pinecone Index

Create a Pinecone index with the following settings:

- **Dimensions**: 1536 (for `text-embedding-3-small`)
- **Metric**: cosine
- **Pod Type**: Starter or higher

## Local Development

### Run Locally

```bash
npm run dev
```

Visit http://localhost:3000 to see the homepage.

## Deployment

### Deploy to Vercel

```bash
vercel deploy
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

## Verification

After setup, verify your installation:

1. **Test locally**: `npm run dev` and visit http://localhost:3000
2. **Check API endpoint**: Make a test request to `/api/rag/query`
3. **Verify environment variables**: Ensure all required keys are properly set
4. **Test Pinecone connection**: Verify your index is accessible
5. **Check OpenAI API**: Ensure your API key has sufficient credits

## Troubleshooting Setup Issues

### Common Issues

1. **Environment Variables Not Loading**

   - Ensure `.env.local` is in the root directory
   - Restart your development server after adding variables
   - Check for typos in variable names

2. **Pinecone Connection Errors**

   - Verify your API key is correct
   - Check the environment matches your index region
   - Ensure index dimensions match embedding model (1536)

3. **OpenAI API Errors**

   - Verify API key format (starts with `sk-`)
   - Check your billing settings and usage limits
   - Ensure you have sufficient credits

4. **Vercel Deployment Issues**
   - Add all environment variables in Vercel dashboard
   - Check function timeout settings
   - Verify your build completes successfully

## Next Steps

After successful setup:

1. **Test the API**: See [API Documentation](./api.md)
2. **Understand the Architecture**: Read [Technical Documentation](./technical.md)
3. **Explore Use Cases**: Check [Business Case Documentation](./business-case.md)
