package vector

// Message represents a message in the vector database
type Message struct {
	ID        string
	Text      string
	Embedding []float32
	Score     float32
}

// DB defines the interface for vector database operations
type DB interface {
	Close() error
	GetAllMessages() ([]Message, error)
	Search(embedding []float32, limit int) ([]Message, error)
} 