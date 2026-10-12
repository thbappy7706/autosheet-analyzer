package parser

import (
	"bytes"
	"errors"
	"testing"

	"github.com/xuri/excelize/v2"
)

func buildWorkbook(t *testing.T, sheets map[string][][]any) []byte {
	t.Helper()
	f := excelize.NewFile()
	first := true
	for name, rows := range sheets {
		if first {
			f.SetSheetName("Sheet1", name)
			first = false
		} else {
			if _, err := f.NewSheet(name); err != nil {
				t.Fatal(err)
			}
		}
		for r, row := range rows {
			for c, val := range row {
				cell, err := excelize.CoordinatesToCellName(c+1, r+1)
				if err != nil {
					t.Fatal(err)
				}
				if err := f.SetCellValue(name, cell, val); err != nil {
					t.Fatal(err)
				}
			}
		}
	}
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestOpenAndParseExcel(t *testing.T) {
	raw := buildWorkbook(t, map[string][][]any{
		"Sheet1": {
			{"name", "age", "score"},
			{"Alice", 30, 88.5},
			{"Bob", 25, 92},
		},
	})
	wb, err := OpenExcel(raw, "data.xlsx")
	if err != nil {
		t.Fatal(err)
	}
	defer wb.Close()
	if len(wb.Sheets) != 1 {
		t.Fatalf("sheets = %v", wb.Sheets)
	}
	tbl, err := wb.Table("Sheet1")
	if err != nil {
		t.Fatal(err)
	}
	if len(tbl.Headers) != 3 || tbl.Headers[0] != "name" {
		t.Errorf("headers = %v", tbl.Headers)
	}
	if len(tbl.Rows) != 2 {
		t.Errorf("rows = %d, want 2", len(tbl.Rows))
	}
}

func TestMultiSheetDefaultIsFirstNonEmpty(t *testing.T) {
	raw := buildWorkbook(t, map[string][][]any{
		"Empty":  {{"", ""}},
		"Data":   {{"a", "b"}, {1, 2}},
	})
	wb, err := OpenExcel(raw, "multi.xlsx")
	if err != nil {
		t.Fatal(err)
	}
	defer wb.Close()
	if got := wb.DefaultSheet(); got != "Data" {
		t.Errorf("default sheet = %q, want Data", got)
	}
}

func TestMergedCellsExpand(t *testing.T) {
	f := excelize.NewFile()
	rows := [][]any{
		{"region", "value"},
		{"North", 10},
		{"", 20},
	}
	for r, row := range rows {
		for c, val := range row {
			cell, _ := excelize.CoordinatesToCellName(c+1, r+1)
			if err := f.SetCellValue("Sheet1", cell, val); err != nil {
				t.Fatal(err)
			}
		}
	}
	// Merge A2:A3 so both rows should read "North".
	if err := f.MergeCell("Sheet1", "A2", "A3"); err != nil {
		t.Fatal(err)
	}
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		t.Fatal(err)
	}

	wb, err := OpenExcel(buf.Bytes(), "merged.xlsx")
	if err != nil {
		t.Fatal(err)
	}
	defer wb.Close()
	tbl, err := wb.Table("Sheet1")
	if err != nil {
		t.Fatal(err)
	}
	if len(tbl.Rows) < 2 {
		t.Fatalf("rows = %d, want at least 2", len(tbl.Rows))
	}
	if tbl.Rows[0][0] != "North" || tbl.Rows[1][0] != "North" {
		t.Errorf("merged cells not expanded: %v", tbl.Rows)
	}
}

func TestLegacyXLSReturnsClearError(t *testing.T) {
	raw := []byte{0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1}
	_, err := OpenExcel(raw, "old.xls")
	if !errors.Is(err, LegacyXLError) {
		t.Errorf("err = %v, want LegacyXLError", err)
	}
}

func TestEmptySheetErrors(t *testing.T) {
	raw := buildWorkbook(t, map[string][][]any{"Sheet1": {{}}})
	wb, err := OpenExcel(raw, "empty.xlsx")
	if err != nil {
		t.Fatal(err)
	}
	defer wb.Close()
	if _, err := wb.Table("Sheet1"); err == nil {
		t.Error("expected an error for an empty sheet")
	}
}
