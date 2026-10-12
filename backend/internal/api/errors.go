// Package api implements the HTTP layer: routing, middleware and handlers.
package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// ErrorCode is a stable, machine-readable error identifier. The frontend maps
// these to localized messages; the API never returns translated text.
type ErrorCode string

// Error codes returned by the API.
const (
	CodeBadRequest     ErrorCode = "BAD_REQUEST"
	CodeNotFound       ErrorCode = "NOT_FOUND"
	CodeFileTooLarge   ErrorCode = "FILE_TOO_LARGE"
	CodeUnsupported    ErrorCode = "UNSUPPORTED_MEDIA_TYPE"
	CodeMissingFile    ErrorCode = "MISSING_FILE"
	CodeParseFailed    ErrorCode = "PARSE_FAILED"
	CodeSheetNotFound  ErrorCode = "SHEET_NOT_FOUND"
	CodeRateLimited    ErrorCode = "RATE_LIMITED"
	CodeInternal       ErrorCode = "INTERNAL_ERROR"
	CodePayloadInvalid ErrorCode = "PAYLOAD_INVALID"
)

type apiError struct {
	Code    ErrorCode      `json:"code"`
	Message string         `json:"message"`
	Params  map[string]any `json:"params,omitempty"`
}

type errorEnvelope struct {
	Error apiError `json:"error"`
}

func writeError(w http.ResponseWriter, status int, code ErrorCode, message string, params map[string]any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(errorEnvelope{Error: apiError{
		Code:    code,
		Message: message,
		Params:  params,
	}})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encode response", "error", err)
	}
}
