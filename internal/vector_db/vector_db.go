package vector_db

import (
	"bufio"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"

	qdrant "github.com/qdrant/go-client/qdrant"
	"github.com/sirupsen/logrus"
	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/vector"
	"google.golang.org/grpc"
)

// TestPoint represents a simplified point structure for test mode
type TestPoint struct {
	ID        string                `json:"id"`
	Vectors   []float32             `json:"vectors"`
	Payload   map[string]string     `json:"payload"`
}

// QdrantDB handles vector database operations
type QdrantDB struct {
	cfg         *config.Config
	logger      *logrus.Logger
	client      qdrant.CollectionsClient
	points      qdrant.PointsClient
	isTestMode  bool
	testDBPath  string
	testPoints  []*TestPoint
}

// DB defines the interface for Qdrant-specific operations
type DB interface {
	vector.DB
	CreateCollection() error
	InjectMessages() error
}

// MessageEmbedding represents a message with its embedding and ID
type MessageEmbedding struct {
	ID        string    `json:"id"`
	Text      string    `json:"text"`
	Embedding []float32 `json:"embedding"`
}

// SearchResult represents a search result with its score
type SearchResult struct {
	ID    string            `json:"id"`
	Score float32           `json:"score"`
	Text  string           `json:"text"`
}

// MessageWithEmbedding represents a message with its embedding
type MessageWithEmbedding struct {
	ID        string    `json:"id"`
	Text      string    `json:"text"`
	Embedding []float32 `json:"embedding"`
}

// NewQdrantDB creates a new Qdrant database connection
func NewQdrantDB(cfg *config.Config) (DB, error) {
	// Setup logging
	logger := logrus.New()
	if cfg.Logging.Format == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{})
	}

	level, err := logrus.ParseLevel(cfg.Logging.Level)
	if err != nil {
		return nil, fmt.Errorf("invalid log level: %w", err)
	}
	logger.SetLevel(level)

	// Create Qdrant directory if it doesn't exist
	if err := os.MkdirAll(cfg.Qdrant.Path, 0755); err != nil {
		return nil, fmt.Errorf("failed to create Qdrant directory: %w", err)
	}

	db := &QdrantDB{
		cfg:    cfg,
		logger: logger,
	}

	// Check if we're in dev mode
	if cfg.DevMode.Enabled {
		db.isTestMode = true
		db.testDBPath = filepath.Join(cfg.Qdrant.Path, "test.jsonl")
		db.testPoints = make([]*TestPoint, 0)
		return db, nil
	}

	// Connect to local Qdrant instance using gRPC
	conn, err := grpc.Dial("localhost:6334", grpc.WithInsecure())
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Qdrant (make sure to run 'start-qdrant' first): %w", err)
	}

	db.client = qdrant.NewCollectionsClient(conn)
	db.points = qdrant.NewPointsClient(conn)

	// Log connection status
	db.logger.WithFields(logrus.Fields{
		"host":      "localhost",
		"grpc_port": 6334,
		"http_port": 6333,
		"path":      cfg.Qdrant.Path,
	}).Info("Connected to local Qdrant instance")

	return db, nil
}

// CreateCollection creates a new collection in Qdrant if it doesn't already exist
func (db *QdrantDB) CreateCollection() error {
	if db.isTestMode {
		// In test mode, just create an empty file
		file, err := os.Create(db.testDBPath)
		if err != nil {
			return fmt.Errorf("failed to create test database file: %w", err)
		}
		file.Close()
		return nil
	}

	ctx := context.Background()

	// Check if collection exists
	collections, err := db.client.List(ctx, &qdrant.ListCollectionsRequest{})
	if err != nil {
		return fmt.Errorf("failed to list collections: %w", err)
	}

	for _, collection := range collections.Collections {
		if collection.Name == db.cfg.Qdrant.CollectionName {
			db.logger.WithFields(logrus.Fields{
				"collection": db.cfg.Qdrant.CollectionName,
			}).Info("Collection already exists")
			return nil
		}
	}

	distance := qdrant.Distance_Cosine
	if db.cfg.Qdrant.Distance == "Euclid" {
		distance = qdrant.Distance_Euclid
	} else if db.cfg.Qdrant.Distance == "Dot" {
		distance = qdrant.Distance_Dot
	}

	onDiskPayload := db.cfg.Qdrant.OnDiskPayload

	req := &qdrant.CreateCollection{
		CollectionName: db.cfg.Qdrant.CollectionName,
		VectorsConfig: &qdrant.VectorsConfig{
			Config: &qdrant.VectorsConfig_Params{
				Params: &qdrant.VectorParams{
					Size:     uint64(db.cfg.Qdrant.VectorSize),
					Distance: distance,
				},
			},
		},
		OnDiskPayload: &onDiskPayload,
	}

	_, err = db.client.Create(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to create collection: %w", err)
	}

	db.logger.WithFields(logrus.Fields{
		"collection": db.cfg.Qdrant.CollectionName,
		"size":      db.cfg.Qdrant.VectorSize,
		"distance":  db.cfg.Qdrant.Distance,
	}).Info("Created Qdrant collection")

	return nil
}

// InjectMessages reads embeddings from the output file and injects them into Qdrant
func (db *QdrantDB) InjectMessages() error {
	// Open embeddings file
	filePath := filepath.Join(db.cfg.Data.OutputDir, "messages_embeddings.jsonl")
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open embeddings file: %w", err)
	}
	defer file.Close()

	// Read and inject messages in batches
	scanner := bufio.NewScanner(file)
	batch := make([]*qdrant.PointStruct, 0, 100) // Process 100 messages at a time
	testBatch := make([]*TestPoint, 0, 100)      // For test mode
	count := 0

	for scanner.Scan() {
		// Parse message
		var msg MessageEmbedding
		if err := json.Unmarshal(scanner.Bytes(), &msg); err != nil {
			return fmt.Errorf("failed to parse message JSON: %w", err)
		}

		if db.isTestMode {
			// Create test point
			point := &TestPoint{
				ID:      msg.ID,
				Vectors: msg.Embedding,
				Payload: map[string]string{
					"text": msg.Text,
				},
			}
			testBatch = append(testBatch, point)
		} else {
			// Convert SHA-256 hash to UUID format
			// Take first 16 bytes of SHA-256 and format as UUID
			hashBytes, err := hex.DecodeString(msg.ID)
			if err != nil {
				return fmt.Errorf("failed to decode hash: %w", err)
			}
			uuid := fmt.Sprintf("%x-%x-%x-%x-%x",
				hashBytes[0:4],
				hashBytes[4:6],
				hashBytes[6:8],
				hashBytes[8:10],
				hashBytes[10:16],
			)

			// Create point
			point := &qdrant.PointStruct{
				Id: &qdrant.PointId{
					PointIdOptions: &qdrant.PointId_Uuid{
						Uuid: uuid,
					},
				},
				Vectors: &qdrant.Vectors{
					VectorsOptions: &qdrant.Vectors_Vector{
						Vector: &qdrant.Vector{
							Data: msg.Embedding,
						},
					},
				},
				Payload: map[string]*qdrant.Value{
					"text": {
						Kind: &qdrant.Value_StringValue{
							StringValue: msg.Text,
						},
					},
				},
			}
			batch = append(batch, point)
		}
		count++

		// Process batch
		if len(batch) == 100 || len(testBatch) == 100 {
			if db.isTestMode {
				if err := db.upsertTestBatch(testBatch); err != nil {
					return err
				}
				testBatch = testBatch[:0] // Clear batch
			} else {
				if err := db.upsertBatch(batch); err != nil {
					return err
				}
				batch = batch[:0] // Clear batch
			}
		}
	}

	// Process remaining messages
	if len(batch) > 0 || len(testBatch) > 0 {
		if db.isTestMode {
			if err := db.upsertTestBatch(testBatch); err != nil {
				return err
			}
		} else {
			if err := db.upsertBatch(batch); err != nil {
				return err
			}
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading embeddings file: %w", err)
	}

	db.logger.WithFields(logrus.Fields{
		"count":      count,
		"collection": db.cfg.Qdrant.CollectionName,
	}).Info("Successfully injected messages into Qdrant")

	return nil
}

// upsertTestBatch upserts a batch of test points into the test database file
func (db *QdrantDB) upsertTestBatch(points []*TestPoint) error {
	// In test mode, just append points to memory and write to file
	db.testPoints = append(db.testPoints, points...)

	// Write to file
	file, err := os.OpenFile(db.testDBPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open test database file: %w", err)
	}
	defer file.Close()

	for _, point := range points {
		data, err := json.Marshal(point)
		if err != nil {
			return fmt.Errorf("failed to marshal point: %w", err)
		}
		if _, err := file.Write(append(data, '\n')); err != nil {
			return fmt.Errorf("failed to write point: %w", err)
		}
	}
	return nil
}

// upsertBatch upserts a batch of points into Qdrant
func (db *QdrantDB) upsertBatch(points []*qdrant.PointStruct) error {
	ctx := context.Background()

	req := &qdrant.UpsertPoints{
		CollectionName: db.cfg.Qdrant.CollectionName,
		Points:        points,
	}

	_, err := db.points.Upsert(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to upsert points: %w", err)
	}

	return nil
}

// GetAllMessages retrieves all messages from the vector database
func (db *QdrantDB) GetAllMessages() ([]vector.Message, error) {
	messages, err := db.getAllMessagesInternal()
	if err != nil {
		return nil, err
	}

	// Convert to vector.Message format
	result := make([]vector.Message, len(messages))
	for i, msg := range messages {
		result[i] = vector.Message{
			ID:        msg.ID,
			Text:      msg.Text,
			Embedding: msg.Embedding,
		}
	}
	return result, nil
}

// Search searches for similar vectors in the database
func (db *QdrantDB) Search(embedding []float32, limit int) ([]vector.Message, error) {
	results, err := db.searchInternal(embedding, limit)
	if err != nil {
		return nil, err
	}

	// Convert to vector.Message format
	messages := make([]vector.Message, len(results))
	for i, result := range results {
		messages[i] = vector.Message{
			ID:        result.ID,
			Text:      result.Text,
			Score:     result.Score,
		}
	}
	return messages, nil
}

// getAllMessagesInternal is the internal implementation of GetAllMessages
func (db *QdrantDB) getAllMessagesInternal() ([]MessageWithEmbedding, error) {
	if db.isTestMode {
		return db.getAllMessagesTest()
	}

	ctx := context.Background()

	// First, get the total count of points
	countReq := &qdrant.CountPoints{
		CollectionName: db.cfg.Qdrant.CollectionName,
	}
	countResp, err := db.points.Count(ctx, countReq)
	if err != nil {
		return nil, fmt.Errorf("failed to get points count: %w", err)
	}
	totalPoints := countResp.Result.Count

	db.logger.WithFields(logrus.Fields{
		"total_points": totalPoints,
	}).Info("Starting to fetch all points")

	var limit uint32 = 100
	req := &qdrant.ScrollPoints{
		CollectionName: db.cfg.Qdrant.CollectionName,
		WithPayload:    &qdrant.WithPayloadSelector{SelectorOptions: &qdrant.WithPayloadSelector_Enable{Enable: true}},
		WithVectors:    &qdrant.WithVectorsSelector{SelectorOptions: &qdrant.WithVectorsSelector_Enable{Enable: true}},
		Limit:          &limit,
	}

	var allMessages []MessageWithEmbedding
	pointsProcessed := uint64(0)

	for {
		resp, err := db.points.Scroll(ctx, req)
		if err != nil {
			return nil, fmt.Errorf("failed to scroll points: %w", err)
		}

		batchSize := len(resp.Result)
		if batchSize == 0 {
			break // No more points to process
		}

		for _, point := range resp.Result {
			text := ""
			if textValue, ok := point.Payload["text"]; ok {
				text = textValue.GetStringValue()
			}

			vectors := point.Vectors.GetVector()
			if vectors == nil {
				db.logger.WithField("point_id", point.Id).Warn("Point has no vectors")
				continue
			}

			msg := MessageWithEmbedding{
				ID:        point.Id.GetUuid(),
				Text:      text,
				Embedding: vectors.Data,
			}
			allMessages = append(allMessages, msg)
		}

		pointsProcessed += uint64(batchSize)
		db.logger.WithFields(logrus.Fields{
			"batch_size":       batchSize,
			"points_processed": pointsProcessed,
			"total_points":     totalPoints,
		}).Debug("Processed batch of points")

		if resp.NextPageOffset == nil {
			break // No more pages to process
		}

		req.Offset = resp.NextPageOffset
	}

	if pointsProcessed < totalPoints {
		db.logger.WithFields(logrus.Fields{
			"points_processed": pointsProcessed,
			"total_points":     totalPoints,
			"missing_points":   totalPoints - pointsProcessed,
		}).Warn("Not all points were processed")
	}

	db.logger.WithFields(logrus.Fields{
		"total_messages": len(allMessages),
		"points_processed": pointsProcessed,
	}).Info("Finished fetching all points")

	return allMessages, nil
}

// searchInternal is the internal implementation of Search
func (db *QdrantDB) searchInternal(vector []float32, limit int) ([]SearchResult, error) {
	if db.isTestMode {
		return db.searchTest(vector, limit)
	}

	ctx := context.Background()

	req := &qdrant.SearchPoints{
		CollectionName: db.cfg.Qdrant.CollectionName,
		Vector:        vector,
		Limit:         uint64(limit),
	}

	resp, err := db.points.Search(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to search points: %w", err)
	}

	results := make([]SearchResult, 0, len(resp.Result))
	for _, point := range resp.Result {
		text := ""
		if textValue, ok := point.Payload["text"]; ok {
			text = textValue.GetStringValue()
		}

		results = append(results, SearchResult{
			ID:    point.Id.GetUuid(),
			Score: point.Score,
			Text:  text,
		})
	}

	return results, nil
}

// searchTest performs a search in test mode using cosine similarity
func (db *QdrantDB) searchTest(vector []float32, limit int) ([]SearchResult, error) {
	// Read all points from the test database file
	file, err := os.Open(db.testDBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open test database file: %w", err)
	}
	defer file.Close()

	var results []SearchResult
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		var point TestPoint
		if err := json.Unmarshal(scanner.Bytes(), &point); err != nil {
			return nil, fmt.Errorf("failed to unmarshal point: %w", err)
		}

		// Calculate cosine similarity
		score := cosineSimilarity(vector, point.Vectors)
		results = append(results, SearchResult{
			ID:    point.ID,
			Score: score,
			Text:  point.Payload["text"],
		})
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading test database file: %w", err)
	}

	// Sort results by score in descending order
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	// Return top k results
	if len(results) > limit {
		results = results[:limit]
	}

	return results, nil
}

// cosineSimilarity calculates the cosine similarity between two vectors
func cosineSimilarity(a, b []float32) float32 {
	if len(a) != len(b) {
		return 0
	}

	var dotProduct, normA, normB float32
	for i := range a {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (float32(math.Sqrt(float64(normA))) * float32(math.Sqrt(float64(normB))))
}

// Close closes the Qdrant connection
func (db *QdrantDB) Close() error {
	// Add any cleanup if needed
	return nil
}

// getAllMessagesTest retrieves all messages from the test database file
func (db *QdrantDB) getAllMessagesTest() ([]MessageWithEmbedding, error) {
	// First check if we have points in memory
	if len(db.testPoints) > 0 {
		db.logger.WithField("count", len(db.testPoints)).Debug("Using in-memory points")
		messages := make([]MessageWithEmbedding, len(db.testPoints))
		for i, point := range db.testPoints {
			messages[i] = MessageWithEmbedding{
				ID:        point.ID,
				Text:      point.Payload["text"],
				Embedding: point.Vectors,
			}
		}
		return messages, nil
	}

	// If no points in memory, read from file
	file, err := os.Open(db.testDBPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open test database file: %w", err)
	}
	defer file.Close()

	var messages []MessageWithEmbedding
	var pointsRead int
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		var point TestPoint
		if err := json.Unmarshal(scanner.Bytes(), &point); err != nil {
			db.logger.WithError(err).WithField("line", pointsRead+1).Error("Failed to unmarshal point")
			return nil, fmt.Errorf("failed to unmarshal point at line %d: %w", pointsRead+1, err)
		}

		// Validate point data
		if point.ID == "" {
			db.logger.WithField("line", pointsRead+1).Warn("Point has empty ID")
			continue
		}
		if point.Vectors == nil {
			db.logger.WithField("point_id", point.ID).Warn("Point has no vectors")
			continue
		}
		if point.Payload == nil {
			db.logger.WithField("point_id", point.ID).Warn("Point has no payload")
			continue
		}
		text, ok := point.Payload["text"]
		if !ok || text == "" {
			db.logger.WithField("point_id", point.ID).Warn("Point has no text")
			continue
		}

		messages = append(messages, MessageWithEmbedding{
			ID:        point.ID,
			Text:      text,
			Embedding: point.Vectors,
		})
		pointsRead++
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading test database file: %w", err)
	}

	db.logger.WithFields(logrus.Fields{
		"points_read": pointsRead,
		"messages_loaded": len(messages),
	}).Info("Successfully loaded messages from test database file")

	// Cache the points in memory for future use
	db.testPoints = make([]*TestPoint, len(messages))
	for i, msg := range messages {
		db.testPoints[i] = &TestPoint{
			ID:      msg.ID,
			Vectors: msg.Embedding,
			Payload: map[string]string{
				"text": msg.Text,
			},
		}
	}

	return messages, nil
}