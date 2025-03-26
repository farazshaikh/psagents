# Ingest Service

This service handles the ingestion of text messages and their processing through the pipeline.

## Components

- `main.go`: Entry point for the ingestion service
- `pipeline.go`: Pipeline orchestration
- `config.go`: Service configuration

## Usage

```bash
go run cmd/ingest/main.go [flags]
```

## Configuration

See `config/config.yaml` for configuration options. 