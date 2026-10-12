package parser

import (
	"bytes"
	"fmt"
	"sort"
	"strings"

	"github.com/example/excel-analyzer/internal/model"
	"github.com/xuri/excelize/v2"
)

// Excel size guards. A malicious xlsx can decompress to enormous sizes; these
// limits abort parsing long before memory is exhausted.
const (
	maxUnzipSize    = 512 << 20 // 512 MiB total decompressed
	maxUnzipXMLSize = 128 << 20 // 128 MiB per XML part
)

// LegacyXLError is returned for the binary .xls format, which excelize cannot
// read. Convert it to .xlsx or .csv first.
var LegacyXLError = fmt.Errorf("legacy .xls format is not supported; convert the file to .xlsx or .csv")

// ExcelWorkbook wraps an opened xlsx/xlsm file.
type ExcelWorkbook struct {
	file   *excelize.File
	Sheets []string
}

// OpenExcel opens raw workbook bytes. The extension is checked so that legacy
// .xls files fail with a clear, actionable error rather than a parse error.
func OpenExcel(raw []byte, filename string) (*ExcelWorkbook, error) {
	switch strings.ToLower(fileExt(filename)) {
	case ".xls":
		return nil, LegacyXLError
	}
	f, err := excelize.OpenReader(bytes.NewReader(raw), excelize.Options{
		UnzipSizeLimit:    maxUnzipSize,
		UnzipXMLSizeLimit: maxUnzipXMLSize,
	})
	if err != nil {
		return nil, fmt.Errorf("open workbook: %w", err)
	}
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		f.Close()
		return nil, fmt.Errorf("workbook has no sheets")
	}
	return &ExcelWorkbook{file: f, Sheets: sheets}, nil
}

// Close releases the underlying workbook.
func (w *ExcelWorkbook) Close() error {
	if w == nil || w.file == nil {
		return nil
	}
	return w.file.Close()
}

// DefaultSheet returns the first sheet that contains data, falling back to the
// first sheet.
func (w *ExcelWorkbook) DefaultSheet() string {
	for _, s := range w.Sheets {
		if rows, err := w.file.GetRows(s); err == nil && sheetHasData(rows) {
			return s
		}
	}
	return w.Sheets[0]
}

func sheetHasData(rows [][]string) bool {
	for _, r := range rows {
		for _, c := range r {
			if strings.TrimSpace(c) != "" {
				return true
			}
		}
	}
	return false
}

// Table extracts a sheet, expanding merged cells and normalizing the result.
func (w *ExcelWorkbook) Table(sheet string) (*model.Table, error) {
	if sheet == "" {
		sheet = w.DefaultSheet()
	}
	rows, err := w.file.GetRows(sheet)
	if err != nil {
		return nil, fmt.Errorf("read sheet %q: %w", sheet, err)
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("sheet %q is empty", sheet)
	}

	// Expand merged ranges so every covered cell carries the merged value.
	// First grow the grid to cover every merged range, then fill values.
	merged, _ := w.file.GetMergeCells(sheet)
	for _, m := range merged {
		x1, y1, x2, y2, err := parseRange(m.GetStartAxis(), m.GetEndAxis())
		if err != nil {
			continue
		}
		for len(rows) < y2 {
			rows = append(rows, nil)
		}
		val := m.GetCellValue()
		for r := y1; r <= y2; r++ {
			for len(rows[r-1]) < x2 {
				rows[r-1] = append(rows[r-1], "")
			}
			for c := x1; c <= x2; c++ {
				rows[r-1][c-1] = val
			}
		}
	}

	hasHeader := true
	var second []string
	if len(rows) > 1 {
		second = padRow(rows[1], len(rows[0]))
	}
	if !LooksLikeHeaderRow(padRow(rows[0], len(rows[0])), second) {
		hasHeader = false
	}

	var headers []string
	var body [][]string
	if hasHeader {
		headers = rows[0]
		body = rows[1:]
	} else {
		headers = make([]string, len(rows[0]))
		for i := range headers {
			headers[i] = fmt.Sprintf("column_%d", i+1)
		}
		body = rows
	}
	return NormalizeTable(sheet, headers, body), nil
}

func padRow(row []string, n int) []string {
	out := make([]string, n)
	copy(out, row)
	return out
}

// parseRange parses axes like "A1" and "C4" into 1-based column/row numbers.
func parseRange(start, end string) (int, int, int, int, error) {
	c1, r1, err := parseAxis(start)
	if err != nil {
		return 0, 0, 0, 0, err
	}
	c2, r2, err := parseAxis(end)
	if err != nil {
		return 0, 0, 0, 0, err
	}
	return c1, r1, c2, r2, nil
}

func parseAxis(axis string) (int, int, error) {
	col, row, err := excelize.CellNameToCoordinates(axis)
	if err != nil {
		return 0, 0, err
	}
	return col, row, nil
}

// SortSheets is a helper used by callers that want a stable sheet order.
func SortSheets(sheets []string) []string {
	out := append([]string(nil), sheets...)
	sort.Strings(out)
	return out
}
