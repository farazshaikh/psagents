# API Server

REST API and gRPC service for interacting with the knowledge graph.

## Components

- `main.go`: Server entry point
- `handlers/`: HTTP/gRPC request handlers
- `middleware/`: Request/response middleware
- `config.go`: Server configuration

## Usage

```bash
go run cmd/server/main.go [flags]
```

## API Endpoints

- `GET /api/v1/graph`: Retrieve graph data
- `POST /api/v1/query`: Execute graph queries
- `GET /api/v1/health`: Health check endpoint

## Configuration

See `config/config.yaml` for server configuration options. 