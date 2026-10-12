package api

import (
	"net/http"
	"time"

	"github.com/example/excel-analyzer/internal/store"
	"github.com/go-chi/chi/v5"
)

// Config holds runtime settings resolved from environment variables.
type Config struct {
	MaxUploadBytes int64
	CORSOrigin     string
	StoreTTL       time.Duration
	MaxRows        int
	TempDir        string
	RateLimit      int
}

// Server bundles configuration and storage for the HTTP handlers.
type Server struct {
	cfg   Config
	store store.Store
	rl    *rateLimiter
}

// NewServer creates a Server with the given configuration.
func NewServer(cfg Config) *Server {
	if cfg.StoreTTL <= 0 {
		cfg.StoreTTL = time.Hour
	}
	if cfg.MaxUploadBytes <= 0 {
		cfg.MaxUploadBytes = 50 << 20
	}
	return &Server{
		cfg:   cfg,
		store: store.NewMemoryStore(cfg.StoreTTL),
		rl:    newRateLimiter(cfg.RateLimit, time.Minute),
	}
}

// Routes builds the chi router with all middleware applied.
func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(recoveryMiddleware)
	r.Use(loggingMiddleware)
	r.Use(corsMiddleware(s.cfg.CORSOrigin))
	r.Use(s.rl.middleware)

	r.Get("/healthz", s.handleHealth)

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/uploads", s.handleUpload)
		r.Get("/uploads/{id}", s.handleUploadMeta)
		r.Delete("/uploads/{id}", s.handleDeleteUpload)
		r.Get("/uploads/{id}/analysis", s.handleAnalysis)
		r.Get("/uploads/{id}/rows", s.handleRows)
		r.Post("/uploads/{id}/aggregate", s.handleAggregate)
	})

	return r
}

// Sweep expires old uploads; call periodically from main.
func (s *Server) Sweep() int { return s.store.Sweep() }
