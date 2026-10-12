// Command server runs the CSV/Excel data explorer API.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/thbappy7706/autosheet-analyzer/backend/internal/api"
	"github.com/thbappy7706/autosheet-analyzer/backend/internal/envload"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// Load a .env file if one is present. Values already exported in the
	// environment take precedence, so this is safe to run unconditionally.
	if path, n, err := envload.LoadDefault(); err != nil {
		slog.Warn("could not read env file", "error", err)
	} else if path != "" {
		slog.Info("loaded env file", "path", path, "variables", n)
	}

	cfg := api.Config{
		MaxUploadBytes: int64(envInt("MAX_UPLOAD_MB", 50)) << 20,
		CORSOrigin:     env("CORS_ORIGIN", "http://localhost:5173"),
		StoreTTL:       time.Duration(envInt("STORE_TTL_MINUTES", 60)) * time.Minute,
		MaxRows:        envInt("SAMPLE_ROWS", 200_000),
		TempDir:        env("TEMP_DIR", ""),
		RateLimit:      envInt("RATE_LIMIT_PER_MIN", 120),
	}
	addr := env("ADDR", ":8080")

	srv := api.NewServer(cfg)
	httpSrv := &http.Server{
		Addr:              addr,
		Handler:           srv.Routes(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       5 * time.Minute,
		WriteTimeout:      5 * time.Minute,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Periodically evict expired uploads.
	go func() {
		t := time.NewTicker(5 * time.Minute)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				if n := srv.Sweep(); n > 0 {
					slog.Info("swept expired uploads", "count", n)
				}
			}
		}
	}()

	go func() {
		slog.Info("server listening",
			"addr", addr,
			"max_upload_mb", cfg.MaxUploadBytes>>20,
			"cors_origin", cfg.CORSOrigin,
			"sample_rows", cfg.MaxRows,
		)
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("listen failed", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}
