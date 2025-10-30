# Open WebUI Integration with RAG Server

This guide explains how to set up Open WebUI as a frontend interface for your RAG MVP system.

## Overview

Open WebUI is a user-friendly web interface for large language models that can be configured to work with your RAG API endpoints. This integration allows you to have a ChatGPT-like interface that uses your RAG system for enhanced responses.

## Prerequisites

- Docker installed on your system
- RAG MVP server running (either locally or deployed on Vercel)
- Basic understanding of Docker commands

## Quick Setup

### 1. Run Open WebUI Container

Since your RAG MVP typically runs on port 3000, we'll run Open WebUI on port 3001 to avoid conflicts:

```bash
docker run -d \
  -p 3001:8080 \
  -v open-webui:/app/backend/data \
  --name open-webui \
  ghcr.io/open-webui/open-webui:main
```

### 2. Access Open WebUI

Once the container is running, access Open WebUI at:

- **Local URL**: http://localhost:3001
- **First time setup**: Create an admin account when prompted

### 3. Check Container Status

Monitor the container startup:

```bash
# Check if container is running
docker ps --filter name=open-webui

# View startup logs
docker logs open-webui

# Follow logs in real-time
docker logs -f open-webui
```

## Connecting to Your RAG Server

### Option 1: Local RAG Server

If running your RAG MVP locally on port 3000:

1. **Access Open WebUI**: Navigate to http://localhost:3001
2. **Admin Settings**: Go to Admin Panel → Settings → Connections
3. **Add Custom Model**: Configure a custom model endpoint:
   - **Name**: `RAG-MVP`
   - **Base URL**: `http://host.docker.internal:3000/api`
   - **API Key**: Your `RAG_API_KEY` from `.env.local`

### Option 2: Deployed RAG Server (Vercel)

If using your deployed Vercel instance:

1. **Access Open WebUI**: Navigate to http://localhost:3001
2. **Admin Settings**: Go to Admin Panel → Settings → Connections
3. **Add Custom Model**: Configure a custom model endpoint:
   - **Name**: `RAG-MVP-Production`
   - **Base URL**: `https://your-rag-mvp-vercel.vercel.app/api`
   - **API Key**: Your `RAG_API_KEY`

## Configuration Steps

### 1. Initial Setup

After accessing Open WebUI for the first time:

```bash
# Wait for container to fully start (usually 30-60 seconds)
docker logs open-webui | grep "Uvicorn running"
```

### 2. Create Admin Account

1. Navigate to http://localhost:3001
2. Click "Sign Up" (first user becomes admin)
3. Create your admin credentials
4. Log in to access admin features

### 3. Configure RAG Integration

#### Method A: Via Web Interface

1. **Navigate to Settings**:

   - Click on your profile → Admin Panel
   - Go to Settings → Connections

2. **Add OpenAI-Compatible Endpoint**:

   ```
   Name: RAG MVP
   Base URL: http://host.docker.internal:3000/api (for local)
            or https://your-deployment.vercel.app/api (for production)
   API Key: [Your RAG_API_KEY]
   ```

3. **Test Connection**:
   - Save settings
   - Try creating a new chat
   - Select your RAG model from the dropdown

#### Method B: Via Environment Variables

Stop and restart with environment configuration:

```bash
# Stop existing container
docker stop open-webui && docker rm open-webui

# Run with RAG configuration
docker run -d \
  -p 3001:8080 \
  -v open-webui:/app/backend/data \
  --name open-webui \
  -e OPENAI_API_BASE_URL=http://host.docker.internal:3000/api \
  -e OPENAI_API_KEY=your_rag_api_key_here \
  ghcr.io/open-webui/open-webui:main
```

## Usage

### Starting a RAG-Enhanced Chat

1. **Access Open WebUI**: http://localhost:3001
2. **Start New Chat**: Click the "+" button
3. **Select Model**: Choose your configured RAG model
4. **Chat**: Ask questions that will be enhanced by your RAG system

### Example Queries

Try these example queries to test your RAG integration:

```
"What documents do you have access to?"
"Can you search for information about [topic in your documents]?"
"Please provide a summary of [specific document or content]"
```

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check Docker status
docker --version

# Check for port conflicts
lsof -i :3001

# View detailed logs
docker logs open-webui --details
```

#### Can't Connect to RAG Server

```bash
# Test RAG server directly
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"query": "test", "stream": false}'

# Test from inside Docker container
docker exec -it open-webui curl http://host.docker.internal:3000/api/health
```

#### Open WebUI Not Loading

```bash
# Check if container is healthy
docker ps --filter name=open-webui

# Restart container
docker restart open-webui

# Check container health
docker inspect open-webui | grep -A 10 "Health"
```

### Network Configuration

#### For Docker Desktop (Mac/Windows)

Use `host.docker.internal` to access host services:

```
Base URL: http://host.docker.internal:3000/api
```

#### For Linux

Use host network mode or get host IP:

```bash
# Option 1: Host network (Linux only)
docker run --network host ...

# Option 2: Use host IP
ip route | grep docker0
# Use the IP shown (usually 172.17.0.1)
Base URL: http://172.17.0.1:3000/api
```

## Advanced Configuration

### System Prompt Configuration

**Important**: Configure a system prompt to optimize your RAG experience.

#### Global System Prompt

Go to **Settings** → **Interface** → **Default Model Settings**:

```
You are a helpful AI assistant with access to a document knowledge base through a Retrieval-Augmented Generation (RAG) system.

When answering questions:
1. Always search your knowledge base first for relevant information
2. If you find relevant documents, use that information to provide accurate, detailed responses
3. Always cite your sources when using information from documents
4. If no relevant documents are found, clearly state this and provide general knowledge
5. Be concise but comprehensive in your responses
6. Format responses with clear structure using markdown when helpful

Your knowledge base contains documents that have been specifically ingested into this system. Always prioritize this information over general training knowledge when available.
```

#### RAG Model-Specific Prompt

For your RAG model (**Models** → **Your RAG Model** → **Parameters**):

```
You are a RAG-enhanced AI assistant. You have access to a curated document knowledge base.

Guidelines:
- Search the knowledge base for every user query
- Provide detailed answers based on retrieved documents
- Always include source references: "Based on [document/source name]..."
- If multiple sources support your answer, mention them all
- If no relevant documents found, say "I don't have specific documents about this topic, but based on general knowledge..."
- Use clear, professional language
- Structure longer responses with headers and bullet points
- Be thorough but stay focused on the user's question

Your responses should demonstrate the value of the document knowledge base you have access to.
```

#### Recommended Parameters for RAG

- **Temperature**: 0.3-0.7 (lower for more factual responses)
- **Max Tokens**: 1000-2000 (depending on your needs)
- **Top K**: 5-10 (for document retrieval)
- **Frequency Penalty**: 0.1 (reduces repetition)

### Custom Model Configuration

Create a custom model configuration for better RAG integration:

```json
{
  "name": "RAG-Enhanced-GPT",
  "base_url": "http://host.docker.internal:3000/api",
  "api_key": "your_rag_api_key",
  "headers": {
    "Content-Type": "application/json"
  },
  "parameters": {
    "temperature": 0.5,
    "max_tokens": 1500,
    "stream": true,
    "frequency_penalty": 0.1
  }
}
```

### Persistent Configuration

To persist your configuration across container restarts:

```bash
# Create a configuration volume
docker volume create open-webui-config

# Run with persistent config
docker run -d \
  -p 3001:8080 \
  -v open-webui:/app/backend/data \
  -v open-webui-config:/app/backend/config \
  --name open-webui \
  ghcr.io/open-webui/open-webui:main
```

## Maintenance

### Updating Open WebUI

```bash
# Stop current container
docker stop open-webui

# Remove old container
docker rm open-webui

# Pull latest image
docker pull ghcr.io/open-webui/open-webui:main

# Start new container (data volume persists)
docker run -d \
  -p 3001:8080 \
  -v open-webui:/app/backend/data \
  --name open-webui \
  ghcr.io/open-webui/open-webui:main
```

### Backup Data

```bash
# Backup user data and configurations
docker run --rm \
  -v open-webui:/source \
  -v $(pwd):/backup \
  alpine tar czf /backup/open-webui-backup.tar.gz -C /source .
```

### Restore Data

```bash
# Restore from backup
docker run --rm \
  -v open-webui:/target \
  -v $(pwd):/backup \
  alpine tar xzf /backup/open-webui-backup.tar.gz -C /target
```

## Security Considerations

### Production Deployment

For production use:

1. **Use HTTPS**: Configure SSL certificates
2. **Set proper CORS**: Don't use wildcard origins
3. **API Key Security**: Use environment variables, not hardcoded keys
4. **Access Control**: Configure proper user authentication
5. **Network Security**: Use proper firewall rules

### Environment Variables for Production

```bash
docker run -d \
  -p 3001:8080 \
  -v open-webui:/app/backend/data \
  --name open-webui \
  -e WEBUI_SECRET_KEY=your_secret_key \
  -e CORS_ALLOW_ORIGIN=https://your-domain.com \
  -e OPENAI_API_BASE_URL=https://your-rag-api.vercel.app/api \
  -e OPENAI_API_KEY=your_secure_api_key \
  ghcr.io/open-webui/open-webui:main
```

## Integration Testing

### Test RAG Functionality

1. **Document Upload Test**: Upload a document via your ingestion API
2. **Query Test**: Ask questions about the uploaded document through Open WebUI
3. **Response Verification**: Verify that responses include RAG-enhanced information

### Performance Monitoring

Monitor your setup:

```bash
# Check resource usage
docker stats open-webui

# Monitor logs
docker logs -f open-webui | grep -E "(ERROR|WARN|INFO)"

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001
```

## Next Steps

- **Customize UI**: Explore Open WebUI's theming and customization options
- **User Management**: Set up additional users and permissions
- **Model Fine-tuning**: Configure model parameters for optimal RAG performance
- **Monitoring**: Set up logging and monitoring for production use
- **Integration**: Connect additional AI models or services

For more advanced configurations and troubleshooting, refer to:

- [Open WebUI Documentation](https://docs.openwebui.com)
- [RAG MVP API Documentation](./api.md)
- [Technical Architecture](./technical.md)
