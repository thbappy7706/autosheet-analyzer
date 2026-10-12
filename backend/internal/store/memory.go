package store

import (
	"os"
	"sync"
	"time"

	"github.com/thbappy7706/autosheet-analyzer/backend/internal/model"
)

// MemoryStore is a thread-safe, TTL-based in-memory Store.
type MemoryStore struct {
	mu      sync.RWMutex
	entries map[string]*Entry
	ttl     time.Duration
}

// NewMemoryStore creates a store whose entries expire after ttl.
func NewMemoryStore(ttl time.Duration) *MemoryStore {
	if ttl <= 0 {
		ttl = time.Hour
	}
	return &MemoryStore{entries: map[string]*Entry{}, ttl: ttl}
}

// Create stores a new entry for the upload and returns it.
func (s *MemoryStore) Create(u model.Upload, path string) *Entry {
	e := &Entry{
		Upload:   u,
		Path:     path,
		Tables:   map[string]*model.Table{},
		Analysis: map[string]*model.Analysis{},
		Expires:  time.Now().Add(s.ttl),
	}
	s.mu.Lock()
	s.entries[u.ID] = e
	s.mu.Unlock()
	return e
}

// Get returns the entry for id if present and not expired.
func (s *MemoryStore) Get(id string) (*Entry, bool) {
	s.mu.RLock()
	e, ok := s.entries[id]
	s.mu.RUnlock()
	if !ok || time.Now().After(e.Expires) {
		return nil, false
	}
	return e, true
}

// Delete removes an entry and its temp file.
func (s *MemoryStore) Delete(id string) bool {
	s.mu.Lock()
	e, ok := s.entries[id]
	if ok {
		delete(s.entries, id)
	}
	s.mu.Unlock()
	if ok {
		s.removeFile(e)
	}
	return ok
}

// Sweep deletes expired entries and their temp files, returning the count.
func (s *MemoryStore) Sweep() int {
	now := time.Now()
	s.mu.Lock()
	expired := make([]*Entry, 0)
	for id, e := range s.entries {
		if now.After(e.Expires) {
			expired = append(expired, e)
			delete(s.entries, id)
		}
	}
	s.mu.Unlock()
	for _, e := range expired {
		s.removeFile(e)
	}
	return len(expired)
}

// Len returns the number of live entries.
func (s *MemoryStore) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.entries)
}

func (s *MemoryStore) removeFile(e *Entry) {
	if e == nil || e.Path == "" {
		return
	}
	_ = os.Remove(e.Path)
}
