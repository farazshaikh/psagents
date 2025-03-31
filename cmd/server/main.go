package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"

	"github.com/yourusername/psagents/config"
	"github.com/yourusername/psagents/internal/graphdb"
	"github.com/yourusername/psagents/internal/inference"
	"github.com/yourusername/psagents/internal/vector_db"
)

type Server struct {
	inferenceEngine *inference.Engine
	graphDB        *graphdb.GraphDB
	cfg            *config.Config
}

type ChatCompletionRequest struct {
	Prompt            string `json:"prompt"`
	InferenceStrategy string `json:"inferenceStrategy"`
}

func NewServer(cfg *config.Config) (*Server, error) {
	// Initialize vector database (needed for graphdb)
	vectorDB, err := vector_db.NewQdrantDB(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize vector DB: %w", err)
	}

	// Initialize graph database
	graphDB, err := graphdb.NewGraphDB(cfg, vectorDB)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize graph DB: %w", err)
	}

	// Initialize inference engine
	inferenceEngine, err := inference.NewEngine(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize inference engine: %w", err)
	}

	return &Server{
		inferenceEngine: inferenceEngine,
		graphDB:        graphDB,
		cfg:            cfg,
	}, nil
}

func enableCORS(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		handler(w, r)
	}
}

/* Implement inference strategy based on README.md */
func parseInferenceStrategy(cfg *config.Config, strategy string) (inference.InferenceParams, error) {
	switch strategy {
	case "similarity":
		return inference.InferenceParams{
			SamplingStrategy: inference.SamplingStrategy_Greedy,
			IncludeDirectMatches: true,
			MaxSimilarityAnchors: cfg.Inference.MaxSimilarityAnchors * cfg.Inference.MaxRelatedMessages,
			MaxRelatedMessages: 0,
			MaxRelatedDepth: 0,
		}, nil
	case "semantic":
		return inference.InferenceParams{
			SamplingStrategy: inference.SamplingStrategy_Uniform,
			MaxSimilarityAnchors: cfg.Inference.MaxSimilarityAnchors,
			MaxRelatedMessages: cfg.Inference.MaxRelatedMessages,
			MaxRelatedDepth: cfg.Inference.MaxRelatedDepth,
			IncludeDirectMatches: false,
		}, nil
	// default to hybrid
	//case "hybrid":
	default:
		return inference.InferenceParams{
			SamplingStrategy: inference.SamplingStrategy_Uniform,
			MaxSimilarityAnchors: cfg.Inference.MaxSimilarityAnchors,
			MaxRelatedMessages: cfg.Inference.MaxRelatedMessages,
			MaxRelatedDepth: cfg.Inference.MaxRelatedDepth,
			IncludeDirectMatches: true,
		}, nil
	}
}

func (s *Server) handleChatCompletions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChatCompletionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	inferenceParams, err := parseInferenceStrategy(s.cfg, req.InferenceStrategy)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid inference strategy: %v", err), http.StatusBadRequest)
		return
	}

	inferenceParams.Query = inference.Query{
		Question: req.Prompt,
	}

	inferenceParams.SystemPrompt = s.cfg.LLM.InferenceSystemPrompt

	response, err := s.inferenceEngine.Infer(inferenceParams)

	if err != nil {
		log.Printf("Error processing chat completion: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) handleMessageById(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	messageID := r.URL.Query().Get("id")
	if messageID == "" {
		http.Error(w, "Missing message ID", http.StatusBadRequest)
		return
	}

	session := s.graphDB.GetSession()
	defer session.Close()

	message, err := s.graphDB.GetMessageByID(session, messageID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get message: %v", err), http.StatusInternalServerError)
		return
	}

	if message == nil {
		http.Error(w, "Message not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(message)
}

func main() {
	configPath := flag.String("config", "config/config.example.yaml", "path to config file")
	webDir := flag.String("web-dir", "cmd/server/web", "path to web files directory")
	flag.Parse()

	// Load configuration
	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}

	// Create server
	server, err := NewServer(cfg)
	if err != nil {
		log.Fatalf("Error creating server: %v", err)
	}

	// Set up API routes with CORS
	http.HandleFunc("/api/v1/chat/completions", enableCORS(server.handleChatCompletions))
	http.HandleFunc("/api/v1/message/id", enableCORS(server.handleMessageById))

	// Serve static files
	fs := http.FileServer(http.Dir(*webDir))
	http.Handle("/", fs)

	// Start server
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("Starting server on %s", addr)
	log.Printf("Web interface available at http://localhost:%d", cfg.Server.Port)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}