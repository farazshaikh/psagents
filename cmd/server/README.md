# PSAgents Server

This server provides a REST API for interacting with the PSAgents system.

## Configuration

The server uses the standard PSAgents configuration file. By default, it looks for `config/config.example.yaml`, but you can specify a different path using the `-config` flag:

```bash
./server -config path/to/config.yaml
```

## Endpoints

### Chat Completions

```
POST /api/v1/chat/completions
```

Takes a JSON request with a prompt and returns an inference response.

**Request Body:**
```json
{
  "prompt": "Your question here"
}
```

**Response:**
```json
{
  "answer": "The answer to your question",
  "confidence": 0.95,
  "supporting_evidence": [
    {
      "message_id": "msg_123",
      "relevance": "Direct match"
    }
  ]
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Who am i"}' | jq
```

### Get Message by ID

```
GET /api/v1/message/id?id=msg_123
```

Retrieves a message from the graph database by its ID.

**Response:**
```json
{
  "id": "msg_123",
  "text": "The message content"
}
```

**Example:**
```bash
curl http://localhost:8080/api/v1/message/id?id=msg_123
```

## Error Responses

The API returns appropriate HTTP status codes:

- 200: Success
- 400: Bad Request (e.g., missing parameters)
- 404: Not Found (e.g., message ID doesn't exist)
- 405: Method Not Allowed (wrong HTTP method)
- 500: Internal Server Error

## Example Error Responses

### Invalid Request Body
```bash
curl -X POST http://localhost:8080/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"invalid": "request"}'
```
Response:
```json
{
  "error": "Invalid request body: missing required field 'prompt'"
}
```

### Message Not Found
```bash
curl http://localhost:8080/api/v1/message/id?id=nonexistent_id
```
Response:
```json
{
  "error": "Message not found"
}
```