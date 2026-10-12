package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/thbappy7706/autosheet-analyzer/backend/internal/analyzer"
	"github.com/thbappy7706/autosheet-analyzer/backend/internal/model"
	"github.com/thbappy7706/autosheet-analyzer/backend/internal/numutil"
	"github.com/thbappy7706/autosheet-analyzer/backend/internal/parser"
	"github.com/thbappy7706/autosheet-analyzer/backend/internal/store"
)

var allowedExtensions = map[string]string{
	".csv":  "text",
	".tsv":  "text",
	".txt":  "text",
	".xlsx": "zip",
	".xlsm": "zip",
	".xls":  "ole",
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleUpload(w http.ResponseWriter, r *http.Request) {
	// Hard cap on the request body before we ever read it.
	limit := s.cfg.MaxUploadBytes + 1<<20 // slack for multipart boundaries
	r.Body = http.MaxBytesReader(w, r.Body, limit)

	if err := r.ParseMultipartForm(8 << 20); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			writeError(w, http.StatusRequestEntityTooLarge, CodeFileTooLarge, "file exceeds the maximum size", map[string]any{
				"maxBytes": s.cfg.MaxUploadBytes,
			})
			return
		}
		writeError(w, http.StatusBadRequest, CodeBadRequest, "invalid multipart form", nil)
		return
	}

	f, hdr, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, CodeMissingFile, "form field \"file\" is required", nil)
		return
	}
	defer f.Close()

	if hdr.Size > s.cfg.MaxUploadBytes {
		writeError(w, http.StatusRequestEntityTooLarge, CodeFileTooLarge, "file exceeds the maximum size", map[string]any{
			"maxBytes": s.cfg.MaxUploadBytes, "size": hdr.Size,
		})
		return
	}

	raw, err := readAllLimited(f, s.cfg.MaxUploadBytes)
	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			writeError(w, http.StatusRequestEntityTooLarge, CodeFileTooLarge, "file exceeds the maximum size", map[string]any{
				"maxBytes": s.cfg.MaxUploadBytes,
			})
			return
		}
		writeError(w, http.StatusBadRequest, CodeBadRequest, "could not read uploaded file", nil)
		return
	}

	filename := sanitizeFilename(hdr.Filename)
	kind, err := classify(filename, raw)
	if err != nil {
		writeError(w, http.StatusUnsupportedMediaType, CodeUnsupported, err.Error(), nil)
		return
	}

	sheet := r.FormValue("sheet")
	tables, sheets, err := parseUpload(kind, raw, filename, sheet)
	if err != nil {
		if errors.Is(err, parser.LegacyXLError) {
			writeError(w, http.StatusUnsupportedMediaType, CodeUnsupported, err.Error(), nil)
			return
		}
		writeError(w, http.StatusUnprocessableEntity, CodeParseFailed, "could not parse the file", map[string]any{"detail": err.Error()})
		return
	}
	if len(tables) == 0 {
		writeError(w, http.StatusUnprocessableEntity, CodeParseFailed, "no usable sheets found", nil)
		return
	}

	// Persist the raw file to a temp path so storage can be swapped later.
	path, err := s.persist(raw, filename)
	if err != nil {
		writeError(w, http.StatusInternalServerError, CodeInternal, "could not store the upload", nil)
		return
	}

	id := newID()
	up := model.Upload{
		ID:        id,
		Filename:  filename,
		Size:      int64(len(raw)),
		Sheets:    sheets,
		CreatedAt: time.Now().UTC(),
	}
	e := s.store.Create(up, path)
	for name, t := range tables {
		e.Tables[name] = t
	}

	writeJSON(w, http.StatusCreated, up)
}

func (s *Server) handleUploadMeta(w http.ResponseWriter, r *http.Request) {
	e, ok := s.entry(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, e.Upload)
}

func (s *Server) handleDeleteUpload(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !s.store.Delete(id) {
		writeError(w, http.StatusNotFound, CodeNotFound, "upload not found", nil)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleAnalysis(w http.ResponseWriter, r *http.Request) {
	e, ok := s.entry(w, r)
	if !ok {
		return
	}
	sheet, table, ok := s.table(w, r, e)
	if !ok {
		return
	}

	if cached, ok := e.Analysis[sheet]; ok {
		writeJSON(w, http.StatusOK, cached)
		return
	}
	result := analyzer.ProfileTable(table.Headers, table.Rows, analyzer.Options{
		Sheet:    sheet,
		FileSize: e.Upload.Size,
		MaxRows:  s.cfg.MaxRows,
	})
	e.Analysis[sheet] = &result
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleRows(w http.ResponseWriter, r *http.Request) {
	e, ok := s.entry(w, r)
	if !ok {
		return
	}
	_, table, ok := s.table(w, r, e)
	if !ok {
		return
	}

	q := r.URL.Query()
	page := clampInt(atoiDefault(q.Get("page"), 1), 1, 1_000_000)
	pageSize := clampInt(atoiDefault(q.Get("pageSize"), 100), 1, 1000)
	sortCol := q.Get("sort")
	order := strings.ToLower(q.Get("order"))
	filter := strings.TrimSpace(q.Get("filter"))

	rows := table.Rows
	if filter != "" {
		needle := strings.ToLower(filter)
		filtered := make([][]string, 0, len(rows))
		for _, row := range rows {
			for _, c := range row {
				if strings.Contains(strings.ToLower(c), needle) {
					filtered = append(filtered, row)
					break
				}
			}
		}
		rows = filtered
	}

	if sortCol != "" {
		idx := indexOf(table.Headers, sortCol)
		if idx < 0 {
			writeError(w, http.StatusBadRequest, CodeBadRequest, "unknown sort column", map[string]any{"column": sortCol})
			return
		}
		sortRows(rows, idx, order, s.columnType(e, table, idx))
	}

	total := len(rows)
	pages := int(math.Ceil(float64(total) / float64(pageSize)))
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	pageRows := rows[start:end]

	writeJSON(w, http.StatusOK, map[string]any{
		"sheet":      table.Sheet,
		"columns":    table.Headers,
		"rows":       pageRows,
		"page":       page,
		"pageSize":   pageSize,
		"total":      total,
		"totalPages": pages,
		"filtered":   filter != "",
	})
}

type aggregateRequest struct {
	Sheet   string `json:"sheet"`
	X       string `json:"x"`
	Y       string `json:"y"`
	Agg     string `json:"agg"`
	GroupBy string `json:"groupBy"`
}

type aggregatePoint struct {
	Label string  `json:"label"`
	Value float64 `json:"value"`
	Count int     `json:"count"`
}

func (s *Server) handleAggregate(w http.ResponseWriter, r *http.Request) {
	e, ok := s.entry(w, r)
	if !ok {
		return
	}
	var req aggregateRequest
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, CodePayloadInvalid, "invalid JSON body", nil)
		return
	}
	sheet, table, ok := s.tableNamed(w, e, req.Sheet)
	if !ok {
		return
	}
	groupCol := req.GroupBy
	if groupCol == "" {
		groupCol = req.X
	}
	gIdx := indexOf(table.Headers, groupCol)
	if gIdx < 0 {
		writeError(w, http.StatusBadRequest, CodeBadRequest, "unknown group-by column", map[string]any{"column": groupCol})
		return
	}
	yIdx := -1
	if req.Y != "" {
		yIdx = indexOf(table.Headers, req.Y)
		if yIdx < 0 {
			writeError(w, http.StatusBadRequest, CodeBadRequest, "unknown Y column", map[string]any{"column": req.Y})
			return
		}
	}
	agg := strings.ToLower(req.Agg)
	if agg == "" {
		agg = "count"
	}
	if agg != "sum" && agg != "avg" && agg != "count" && agg != "min" && agg != "max" {
		writeError(w, http.StatusBadRequest, CodePayloadInvalid, "unsupported aggregation", map[string]any{"agg": req.Agg})
		return
	}

	type acc struct {
		sum   float64
		min   float64
		max   float64
		count int
		n     int
	}
	groups := map[string]*acc{}
	order := []string{}
	for _, row := range table.Rows {
		label := strings.TrimSpace(cellValue(row, gIdx))
		if label == "" {
			label = "(empty)"
		}
		a, ok := groups[label]
		if !ok {
			a = &acc{min: math.Inf(1), max: math.Inf(-1)}
			groups[label] = a
			order = append(order, label)
		}
		a.count++
		if yIdx >= 0 {
			if v, ok := numutil.ParseNumber(cellValue(row, yIdx)); ok {
				a.sum += v
				a.n++
				if v < a.min {
					a.min = v
				}
				if v > a.max {
					a.max = v
				}
			}
		}
	}

	points := make([]aggregatePoint, 0, len(groups))
	for _, label := range order {
		a := groups[label]
		p := aggregatePoint{Label: label, Count: a.count}
		switch agg {
		case "sum":
			p.Value = a.sum
		case "avg":
			if a.n > 0 {
				p.Value = a.sum / float64(a.n)
			}
		case "min":
			if a.n > 0 {
				p.Value = a.min
			}
		case "max":
			if a.n > 0 {
				p.Value = a.max
			}
		default:
			p.Value = float64(a.count)
		}
		points = append(points, p)
	}
	sort.Slice(points, func(i, j int) bool {
		if points[i].Value != points[j].Value {
			return points[i].Value > points[j].Value
		}
		return points[i].Label < points[j].Label
	})
	if len(points) > 100 {
		points = points[:100]
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"sheet":  sheet,
		"x":      groupCol,
		"y":      req.Y,
		"agg":    agg,
		"points": points,
	})
}

// --- helpers -------------------------------------------------------------

func (s *Server) entry(w http.ResponseWriter, r *http.Request) (*store.Entry, bool) {
	id := chi.URLParam(r, "id")
	e, ok := s.store.Get(id)
	if !ok {
		writeError(w, http.StatusNotFound, CodeNotFound, "upload not found or expired", nil)
		return nil, false
	}
	return e, true
}

func (s *Server) table(w http.ResponseWriter, r *http.Request, e *store.Entry) (string, *model.Table, bool) {
	return s.tableNamed(w, e, r.URL.Query().Get("sheet"))
}

func (s *Server) tableNamed(w http.ResponseWriter, e *store.Entry, sheet string) (string, *model.Table, bool) {
	if sheet == "" {
		for _, name := range e.Upload.Sheets {
			if t, ok := e.Tables[name]; ok {
				return name, t, true
			}
		}
		for name, t := range e.Tables {
			return name, t, true
		}
		writeError(w, http.StatusNotFound, CodeNotFound, "no sheets available", nil)
		return "", nil, false
	}
	t, ok := e.Tables[sheet]
	if !ok {
		writeError(w, http.StatusNotFound, CodeSheetNotFound, "sheet not found", map[string]any{"sheet": sheet})
		return "", nil, false
	}
	return sheet, t, true
}

func readAllLimited(r io.Reader, limit int64) ([]byte, error) {
	buf := make([]byte, 0, 1<<20)
	tmp := make([]byte, 32*1024)
	var total int64
	for {
		n, err := r.Read(tmp)
		if n > 0 {
			total += int64(n)
			if total > limit {
				return nil, &http.MaxBytesError{Limit: limit}
			}
			buf = append(buf, tmp[:n]...)
		}
		if err == io.EOF {
			return buf, nil
		}
		if err != nil {
			return nil, err
		}
	}
}

func classify(filename string, raw []byte) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	want, ok := allowedExtensions[ext]
	if !ok {
		return "", fmt.Errorf("unsupported file type %q", ext)
	}
	head := raw
	if len(head) > 8 {
		head = head[:8]
	}
	switch {
	case len(head) >= 4 && head[0] == 0x50 && head[1] == 0x4B && (head[2] == 0x03 || head[2] == 0x05):
		if want != "zip" {
			return "", fmt.Errorf("file content is a zip archive but the extension is %q", ext)
		}
		return "excel", nil
	case len(head) >= 4 && head[0] == 0xD0 && head[1] == 0xCF && head[2] == 0x11 && head[3] == 0xE0:
		return "ole", nil
	default:
		if want == "zip" {
			return "", fmt.Errorf("file does not look like an xlsx workbook")
		}
		return "text", nil
	}
}

func parseUpload(kind string, raw []byte, filename, sheet string) (map[string]*model.Table, []string, error) {
	switch kind {
	case "ole":
		return nil, nil, parser.LegacyXLError
	case "excel":
		wb, err := parser.OpenExcel(raw, filename)
		if err != nil {
			return nil, nil, err
		}
		defer wb.Close()
		tables := map[string]*model.Table{}
		var sheets []string
		for _, name := range wb.Sheets {
			t, err := wb.Table(name)
			if err != nil || len(t.Headers) == 0 {
				continue
			}
			tables[name] = t
			sheets = append(sheets, name)
		}
		if sheet != "" {
			if _, ok := tables[sheet]; !ok {
				return nil, nil, fmt.Errorf("sheet %q not found", sheet)
			}
		}
		return tables, sheets, nil
	default:
		t, _, err := parser.ParseCSV(raw, filename)
		if err != nil {
			return nil, nil, err
		}
		return map[string]*model.Table{t.Sheet: t}, []string{t.Sheet}, nil
	}
}

func (s *Server) persist(raw []byte, filename string) (string, error) {
	dir := s.cfg.TempDir
	if dir == "" {
		dir = os.TempDir()
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	path := filepath.Join(dir, newID()+filepath.Ext(filename))
	if err := os.WriteFile(path, raw, 0o600); err != nil {
		return "", err
	}
	return path, nil
}

// sanitizeFilename strips any directory components and unsafe characters.
func sanitizeFilename(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, "\\", "/")
	if i := strings.LastIndex(name, "/"); i >= 0 {
		name = name[i+1:]
	}
	var sb strings.Builder
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			sb.WriteRune(r)
		case r == '.' || r == '_' || r == '-' || r == ' ':
			sb.WriteRune(r)
		case r >= 0x0980 && r <= 0x09FF: // Bangla
			sb.WriteRune(r)
		default:
			sb.WriteRune('_')
		}
	}
	out := strings.TrimSpace(sb.String())
	if out == "" {
		out = "upload"
	}
	if len(out) > 200 {
		out = out[:200]
	}
	return out
}

func newID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return hex.EncodeToString(b[:])
}

func cellValue(row []string, i int) string {
	if i < 0 || i >= len(row) {
		return ""
	}
	return row[i]
}

func indexOf(list []string, v string) int {
	for i, s := range list {
		if strings.EqualFold(s, v) {
			return i
		}
	}
	return -1
}

func atoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}

func clampInt(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// columnType returns the inferred type of a column, using the cached analysis
// when available. When the sheet has not been analysed yet the column is
// inferred on demand so that sort order never depends on whether the client
// happened to request the analysis first.
func (s *Server) columnType(e *store.Entry, table *model.Table, idx int) model.ColumnType {
	if a, ok := e.Analysis[table.Sheet]; ok && idx < len(a.Columns) {
		return a.Columns[idx].Type
	}
	if idx < 0 || idx >= len(table.Headers) {
		return ""
	}
	t, _, _ := analyzer.InferType(table.Headers[idx], table.Rows, idx)
	return t
}

// sortRows sorts rows in place by column idx. Numeric and date-aware columns
// sort by value; everything else sorts lexically.
func sortRows(rows [][]string, idx int, order string, colType model.ColumnType) {
	desc := order == "desc"
	less := func(i, j int) bool {
		a := cellValue(rows[i], idx)
		b := cellValue(rows[j], idx)
		switch colType {
		case model.TypeInteger, model.TypeFloat, model.TypeIDLike:
			av, aok := numutil.ParseNumber(a)
			bv, bok := numutil.ParseNumber(b)
			switch {
			case aok && bok:
				return av < bv
			case aok:
				return true
			case bok:
				return false
			}
		case model.TypeDate, model.TypeDatetime:
			at, _, aok := analyzer.ParseDate(a)
			bt, _, bok := analyzer.ParseDate(b)
			switch {
			case aok && bok:
				return at.Before(bt)
			case aok:
				return true
			case bok:
				return false
			}
		}
		return strings.ToLower(a) < strings.ToLower(b)
	}
	sort.SliceStable(rows, func(i, j int) bool {
		if desc {
			return less(j, i)
		}
		return less(i, j)
	})
}
