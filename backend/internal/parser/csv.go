package parser

import (
	"encoding/csv"
	"fmt"
	"io"
	"strings"

	"github.com/thbappy7706/autosheet-analyzer/backend/internal/model"
)

// ParseCSV parses raw bytes as a delimited text file and normalizes the
// resulting table (ragged rows, blank/duplicate headers, empty columns).
func ParseCSV(raw []byte, filename string) (*model.Table, DecodeResult, error) {
	dec := DecodeBytes(raw)
	text := dec.Text

	delim := DetectDelimiter(text)
	if r, ok := delimiterFromExtension(filename); ok {
		// A matching extension (e.g. .tsv) is authoritative for the
		// delimiter when the sniffed value is a weaker guess.
		if strings.EqualFold(fileExt(filename), ".tsv") {
			delim = r
		}
	}

	r := csv.NewReader(strings.NewReader(text))
	r.Comma = delim
	r.FieldsPerRecord = -1 // tolerate ragged rows
	r.LazyQuotes = true
	r.TrimLeadingSpace = true
	r.ReuseRecord = false

	var records [][]string
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			// Skip malformed lines rather than aborting the whole file.
			if pe, ok := err.(*csv.ParseError); ok && pe.Err == csv.ErrFieldCount {
				continue
			}
			if err == csv.ErrFieldCount {
				continue
			}
			return nil, dec, fmt.Errorf("csv: %w", err)
		}
		records = append(records, rec)
	}
	if len(records) == 0 {
		return nil, dec, fmt.Errorf("file contains no data rows")
	}

	// Decide whether the first row is a header.
	hasHeader := true
	var second []string
	if len(records) > 1 {
		second = records[1]
	}
	if !LooksLikeHeaderRow(records[0], second) {
		hasHeader = false
	}

	var headers []string
	var rows [][]string
	if hasHeader {
		headers = records[0]
		rows = records[1:]
	} else {
		headers = make([]string, len(records[0]))
		for i := range headers {
			headers[i] = fmt.Sprintf("column_%d", i+1)
		}
		rows = records
	}

	return NormalizeTable("Sheet1", headers, rows), dec, nil
}

func delimiterFromExtension(filename string) (rune, bool) {
	switch strings.ToLower(fileExt(filename)) {
	case ".tsv":
		return '\t', true
	default:
		return ',', false
	}
}

func fileExt(name string) string {
	i := strings.LastIndex(name, ".")
	if i < 0 {
		return ""
	}
	return name[i:]
}

// NormalizeTable fills gaps in a parsed sheet:
//   - trims each row to a common column count (padding short rows)
//   - drops fully empty columns and rows
//   - renames blank and duplicate headers
func NormalizeTable(sheet string, headers []string, rows [][]string) *model.Table {
	// The header row defines the width when present; otherwise the widest
	// data row does. Rows wider than the width are truncated, short rows are
	// padded, so every row ends up the same length.
	width := len(headers)
	if width == 0 {
		for _, r := range rows {
			if len(r) > width {
				width = len(r)
			}
		}
	}
	// Drop trailing columns that are entirely empty across headers and rows.
	for width > 0 {
		if strings.TrimSpace(cellAt(headers, width-1)) != "" {
			break
		}
		empty := true
		for _, r := range rows {
			if strings.TrimSpace(cellAt(r, width-1)) != "" {
				empty = false
				break
			}
		}
		if !empty {
			break
		}
		width--
	}
	if width == 0 {
		return &model.Table{Sheet: sheet, Headers: nil, Rows: nil}
	}

	normHeaders := make([]string, width)
	for i := 0; i < width; i++ {
		normHeaders[i] = strings.TrimSpace(cellAt(headers, i))
	}
	normHeaders = dedupeHeaders(normHeaders)

	normRows := make([][]string, 0, len(rows))
	for _, r := range rows {
		out := make([]string, width)
		empty := true
		for i := 0; i < width; i++ {
			v := ""
			if i < len(r) {
				v = r[i]
			}
			out[i] = v
			if strings.TrimSpace(v) != "" {
				empty = false
			}
		}
		if empty {
			continue
		}
		normRows = append(normRows, out)
	}

	return &model.Table{Sheet: sheet, Headers: normHeaders, Rows: normRows}
}

func cellAt(row []string, i int) string {
	if i < 0 || i >= len(row) {
		return ""
	}
	return row[i]
}

func dedupeHeaders(headers []string) []string {
	seen := map[string]int{}
	out := make([]string, len(headers))
	for i, h := range headers {
		name := h
		if name == "" {
			name = fmt.Sprintf("column_%d", i+1)
		}
		if n, ok := seen[strings.ToLower(name)]; ok {
			seen[strings.ToLower(name)] = n + 1
			name = fmt.Sprintf("%s_%d", name, n+1)
		} else {
			seen[strings.ToLower(name)] = 1
		}
		out[i] = name
	}
	return out
}
