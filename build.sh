#!/bin/bash

# Exit on any error
set -e

echo "🚀 Building PSAgents..."

# Clean step
echo "🧹 Cleaning..."
rm -rf bin/
rm -rf internal/pipeline internal/retrieval 2>/dev/null || true

# Create bin directory
echo "📁 Creating bin directory..."
mkdir -p bin

# Build all packages first
echo "📦 Building all packages..."
go build -v ./...

# Build binaries
echo "🔨 Generating binaries..."
go build -v -o bin/ ./cmd/...

# Make binaries executable
chmod +x bin/*

echo "✅ Build complete! Binaries are in the bin directory:"
ls -lh bin/

echo "
You can run the binaries using:
  ./bin/server  - Start the web server
  ./bin/infer   - Run inference
  ./bin/ingest  - Run ingestion" 