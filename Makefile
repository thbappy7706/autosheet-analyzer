# AutoSheet Analyzer — local development tasks.
# Docker is intentionally not used; the backend and frontend run locally.

SHELL := /bin/bash
BACKEND_DIR := backend
FRONTEND_DIR := frontend

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: install
install: ## Install backend and frontend dependencies
	cd $(BACKEND_DIR) && go mod download
	cd $(FRONTEND_DIR) && npm install

.PHONY: dev
dev: ## Run backend and frontend together (Ctrl-C stops both)
	@echo "Starting backend on :8080 and frontend on :5173"
	@trap 'kill 0' INT TERM EXIT; \
		(cd $(BACKEND_DIR) && go run ./cmd/server) & \
		(cd $(FRONTEND_DIR) && npm run dev) & \
		wait

.PHONY: dev-backend
dev-backend: ## Run only the Go API
	cd $(BACKEND_DIR) && go run ./cmd/server

.PHONY: dev-frontend
dev-frontend: ## Run only the Vite dev server
	cd $(FRONTEND_DIR) && npm run dev

.PHONY: test
test: test-backend test-frontend ## Run all tests

.PHONY: test-backend
test-backend: ## Run Go tests
	cd $(BACKEND_DIR) && go test ./...

.PHONY: test-frontend
test-frontend: ## Run frontend unit tests
	cd $(FRONTEND_DIR) && npm run test

.PHONY: lint
lint: lint-backend lint-frontend ## Lint everything

.PHONY: lint-backend
lint-backend: ## go vet the backend
	cd $(BACKEND_DIR) && go vet ./...

.PHONY: lint-frontend
lint-frontend: ## ESLint + i18n key parity check
	cd $(FRONTEND_DIR) && npm run lint && npm run i18n:check

.PHONY: build
build: build-backend build-frontend ## Build both sides

.PHONY: build-backend
build-backend: ## Compile the Go server
	cd $(BACKEND_DIR) && go build ./cmd/server

.PHONY: build-frontend
build-frontend: ## Type-check and bundle the frontend
	cd $(FRONTEND_DIR) && npm run build

.PHONY: clean
clean: ## Remove build output
	rm -rf $(FRONTEND_DIR)/dist $(BACKEND_DIR)/server $(BACKEND_DIR)/server.exe
