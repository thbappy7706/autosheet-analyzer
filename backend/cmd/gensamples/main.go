// Command gensamples writes the sample .xlsx workbook used for manual testing.
// Run it from the repository root: go run ./backend/cmd/gensamples
package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/xuri/excelize/v2"
)

func main() {
	out := filepath.Join("samples", "sample.xlsx")
	if len(os.Args) > 1 {
		out = os.Args[1]
	}

	f := excelize.NewFile()
	// Second sheet with the Bangla dataset.
	if _, err := f.NewSheet("Bangla"); err != nil {
		log.Fatal(err)
	}
	if err := f.SetSheetName("Sheet1", "Sales"); err != nil {
		log.Fatal(err)
	}

	sales := [][]any{
		{"id", "region", "product", "units", "revenue", "sold_on", "active"},
		{1, "North", "Widget", 12, 1440.5, "2024-01-05", true},
		{2, "South", "Gadget", 8, 960.0, "2024-01-19", true},
		{3, "North", "Widget", 20, 2400.75, "2024-02-02", false},
		{4, "East", "Gizmo", 5, 750.25, "2024-02-16", true},
		{5, "South", "Gadget", 15, 1800.0, "2024-03-01", true},
		{6, "West", "Widget", 9, 1080.0, "2024-03-15", false},
		{7, "East", "Gizmo", 22, 3300.0, "2024-04-02", true},
		{8, "North", "Gadget", 11, 1320.25, "2024-04-20", true},
	}
	bangla := [][]any{
		{"নাম", "বয়স", "মূল্য", "সক্রিয়", "তারিখ"},
		{"করিম", 25, 200.5, "হ্যাঁ", "৫ জানুয়ারি ২০২৪"},
		{"রহিম", 30, 300.25, "না", "৬ ফেব্রুয়ারি ২০২৪"},
		{"সালমা", 41, 450.75, "হ্যাঁ", "৭ মার্চ ২০২৪"},
	}

	for _, s := range []struct {
		sheet string
		rows  [][]any
	}{{"Sales", sales}, {"Bangla", bangla}} {
		for r, row := range s.rows {
			for c, v := range row {
				cell, err := excelize.CoordinatesToCellName(c+1, r+1)
				if err != nil {
					log.Fatal(err)
				}
				if err := f.SetCellValue(s.sheet, cell, v); err != nil {
					log.Fatal(err)
				}
			}
		}
	}

	if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
		log.Fatal(err)
	}
	if err := f.SaveAs(out); err != nil {
		log.Fatal(err)
	}
	fmt.Println("wrote", out)
}
