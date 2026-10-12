// Package store defines the upload storage interface and an in-memory
// implementation with TTL cleanup.
package store

import (
	"time"

	"github.com/thbappy7706/autosheet-analyzer/backend/internal/model"
)

// Entry is a stored upload plus its parsed tables and cached analysis.
type Entry struct {
	Upload   model.Upload
	Path     string
	Tables   map[string]*model.Table
	Analysis map[string]*model.Analysis
	Expires  time.Time
}

// Store keeps uploads behind an interface so the in-memory implementation can
// later be swapped for S3 or a database.
type Store interface {
	Create(u model.Upload, path string) *Entry
	Get(id string) (*Entry, bool)
	Delete(id string) bool
	Sweep() int
	Len() int
}
