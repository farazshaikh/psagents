#!/bin/bash

# Check if required arguments are provided
if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
    echo "Usage: $0 \"<query text>\" [top_n]"
    echo "  query text: The text to search for (in quotes)"
    echo "  top_n: Number of similar messages to return (default: 5)"
    exit 1
fi

# Set parameters
QUERY_TEXT="$1"
TOP_N=${2:-5}  # Default to 5 if not provided

echo "Getting embedding for query text..."

# Get embedding from Ollama
EMBEDDING_RESPONSE=$(curl -s http://localhost:11434/api/embeddings \
    -d "{\"model\": \"mxbai-embed-large\", \"prompt\": $(jq -n --arg text "$QUERY_TEXT" '$text')}")

# Check if Ollama request was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to connect to Ollama service"
    echo "Make sure Ollama is running on port 11434"
    exit 1
fi

# Extract the embedding from the response
EMBEDDING=$(echo "$EMBEDDING_RESPONSE" | jq -r '.embedding')

if [ -z "$EMBEDDING" ] || [ "$EMBEDDING" = "null" ]; then
    echo "Error: Failed to get embedding from Ollama"
    echo "Response: $EMBEDDING_RESPONSE"
    exit 1
fi

echo -e "\nQuery text:"
echo "$QUERY_TEXT"

echo -e "\nSearching for similar messages..."

# Prepare the search query for Qdrant
SEARCH_QUERY=$(jq -n \
    --arg n "$TOP_N" \
    --argjson embedding "$EMBEDDING" \
    '{vector: $embedding, limit: ($n|tonumber), with_payload: true}')

# Send the search request to Qdrant
SEARCH_RESULT=$(curl -s -X POST -H "Content-Type: application/json" \
    http://localhost:6333/collections/embeddings/points/search -d "$SEARCH_QUERY")

# Check if Qdrant request was successful
if [ $? -ne 0 ]; then
    echo "Error: Failed to connect to Qdrant service"
    echo "Make sure Qdrant is running on port 6333"
    exit 1
fi

# Format and display the results
echo -e "\nSearch results:"
echo "$SEARCH_RESULT" | jq -r '.result[] | "\nScore: \(.score)\nText: \(.payload.text)\n---"' 