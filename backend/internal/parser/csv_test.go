package parser

import (
	"os"
	"path/filepath"
	"testing"
)

func readFixture(t *testing.T, name string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	return b
}

func TestParseCleanCSV(t *testing.T) {
	tbl, dec, err := ParseCSV(readFixture(t, "clean.csv"), "clean.csv")
	if err != nil {
		t.Fatal(err)
	}
	if dec.Encoding != "utf-8" {
		t.Errorf("encoding = %q", dec.Encoding)
	}
	want := []string{"id", "name", "age", "score", "joined", "active"}
	if len(tbl.Headers) != len(want) {
		t.Fatalf("headers = %v, want %v", tbl.Headers, want)
	}
	for i := range want {
		if tbl.Headers[i] != want[i] {
			t.Errorf("header[%d] = %q, want %q", i, tbl.Headers[i], want[i])
		}
	}
	if len(tbl.Rows) != 5 {
		t.Errorf("rows = %d, want 5", len(tbl.Rows))
	}
}

func TestParseMessyCSV(t *testing.T) {
	tbl, _, err := ParseCSV(readFixture(t, "messy.csv"), "messy.csv")
	if err != nil {
		t.Fatal(err)
	}
	// Blank header gets an auto name, duplicate "name" gets a suffix.
	seen := map[string]bool{}
	for _, h := range tbl.Headers {
		if h == "" {
			t.Error("blank header was not renamed")
		}
		if seen[h] {
			t.Errorf("duplicate header %q", h)
		}
		seen[h] = true
	}
	// Every row must be padded to the header width.
	for i, r := range tbl.Rows {
		if len(r) != len(tbl.Headers) {
			t.Errorf("row %d width = %d, want %d", i, len(r), len(tbl.Headers))
		}
	}
	// The fully empty row is dropped.
	if len(tbl.Rows) != 5 {
		t.Errorf("rows = %d, want 5 (empty row dropped)", len(tbl.Rows))
	}
}

func TestParseBanglaCSV(t *testing.T) {
	tbl, _, err := ParseCSV(readFixture(t, "bangla.csv"), "bangla.csv")
	if err != nil {
		t.Fatal(err)
	}
	if tbl.Headers[0] != "নাম" {
		t.Errorf("first header = %q, want নাম", tbl.Headers[0])
	}
	if len(tbl.Rows) != 3 {
		t.Errorf("rows = %d, want 3", len(tbl.Rows))
	}
}

func TestParseEmptyFile(t *testing.T) {
	if _, _, err := ParseCSV([]byte(""), "empty.csv"); err == nil {
		t.Error("expected an error for an empty file")
	}
}

func TestParseNoHeaderCSV(t *testing.T) {
	tbl, _, err := ParseCSV([]byte("1,2,3\n4,5,6\n7,8,9\n"), "noheader.csv")
	if err != nil {
		t.Fatal(err)
	}
	if tbl.Headers[0] != "column_1" {
		t.Errorf("headers = %v, want generated column names", tbl.Headers)
	}
	if len(tbl.Rows) != 3 {
		t.Errorf("rows = %d, want 3", len(tbl.Rows))
	}
}

func TestParseTSVWithTabDelimiter(t *testing.T) {
	tbl, _, err := ParseCSV([]byte("a\tb\tc\n1\t2\t3\n"), "data.tsv")
	if err != nil {
		t.Fatal(err)
	}
	if len(tbl.Headers) != 3 {
		t.Errorf("headers = %v, want 3 columns", tbl.Headers)
	}
}

func TestParseRaggedRows(t *testing.T) {
	tbl, _, err := ParseCSV([]byte("a,b,c\n1,2\n3,4,5,6\n"), "ragged.csv")
	if err != nil {
		t.Fatal(err)
	}
	for i, r := range tbl.Rows {
		if len(r) != 3 {
			t.Errorf("row %d width = %d, want 3", i, len(r))
		}
	}
}
