#!/bin/bash

# Check if required arguments are provided
if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
    echo "Usage: $0 <message_number> [top_n]"
    echo "  message_number: Line number of the message in messages_embeddings.jsonl (1-based)"
    echo "  top_n: Number of similar messages to return (default: 5)"
    exit 1
fi

# Set parameters
MESSAGE_NUM=$1
TOP_N=${2:-5}  # Default to 5 if not provided

# Check if messages_embeddings.jsonl exists
if [ ! -f "data/output/messages_embeddings.jsonl" ]; then
    echo "Error: data/output/messages_embeddings.jsonl not found"
    exit 1
fi

# Get the total number of lines in the file
TOTAL_LINES=$(wc -l < data/output/messages_embeddings.jsonl)

# Validate message number
if [ "$MESSAGE_NUM" -lt 1 ] || [ "$MESSAGE_NUM" -gt "$TOTAL_LINES" ]; then
    echo "Error: message_number must be between 1 and $TOTAL_LINES"
    exit 1
fi

echo "Fetching message #$MESSAGE_NUM and finding $TOP_N similar messages..."

# Extract the message and its embedding, then search Qdrant
# Extract the message at the specified line number
MESSAGE_JSON=$(sed "${MESSAGE_NUM}q;d" data/output/messages_embeddings.jsonl)

# Display the query message text
echo -e "\nQuery message:"
echo "$MESSAGE_JSON" | jq -r '.text' >&2

# Prepare the search query for Qdrant
SEARCH_QUERY=$(echo "$MESSAGE_JSON" | jq -c "{vector: .embedding, limit: $TOP_N, with_payload: true}")

# Send the search request to Qdrant
SEARCH_RESULT=$(curl -s -X POST -H "Content-Type: application/json" \
     http://localhost:6333/collections/embeddings/points/search -d "$SEARCH_QUERY")

# Format and display the results
echo -e "\n\n\n\nSearch results:"
echo "$SEARCH_RESULT" | jq -r '.result[] | "\nScore: \(.score)\nText: \(.payload.text)\n---"'