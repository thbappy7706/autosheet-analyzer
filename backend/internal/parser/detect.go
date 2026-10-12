// Package parser turns uploaded CSV/TSV/Excel files into a model.Table.
package parser

import (
	"bytes"
	"strings"
	"unicode/utf8"

	"github.com/example/excel-analyzer/internal/numutil"
)

// DecodeResult is the outcome of an encoding sniff/convert.
type DecodeResult struct {
	Text     string
	Encoding string
	BOM      bool
}

// win1252High maps the 0x80-0x9F range per the Windows-1252 table; every
// other byte maps to the identical Unicode code point (Latin-1).
var win1252High = [32]rune{
	0x20AC, 0x0081, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
	0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008D, 0x017D, 0x008F,
	0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
	0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x009D, 0x017E, 0x0178,
}

// DecodeBytes detects the encoding of raw file bytes and returns UTF-8 text.
// Supported: UTF-8 (with/without BOM), UTF-16 LE/BE (with BOM), and a
// Windows-1252/Latin-1 fallback for anything that is not valid UTF-8.
func DecodeBytes(raw []byte) DecodeResult {
	switch {
	case bytes.HasPrefix(raw, []byte{0xEF, 0xBB, 0xBF}):
		return DecodeResult{Text: string(raw[3:]), Encoding: "utf-8-bom", BOM: true}
	case bytes.HasPrefix(raw, []byte{0xFF, 0xFE}):
		return DecodeResult{Text: decodeUTF16(raw[2:], false), Encoding: "utf-16le", BOM: true}
	case bytes.HasPrefix(raw, []byte{0xFE, 0xFF}):
		return DecodeResult{Text: decodeUTF16(raw[2:], true), Encoding: "utf-16be", BOM: true}
	}
	if utf8.Valid(raw) {
		return DecodeResult{Text: string(raw), Encoding: "utf-8"}
	}
	return DecodeResult{Text: decodeWindows1252(raw), Encoding: "windows-1252"}
}

func decodeUTF16(b []byte, bigEndian bool) string {
	var sb strings.Builder
	for i := 0; i+1 < len(b); i += 2 {
		var r rune
		if bigEndian {
			r = rune(b[i])<<8 | rune(b[i+1])
		} else {
			r = rune(b[i+1])<<8 | rune(b[i])
		}
		// Fallback for UTF-16 content without a BOM is out of scope; we
		// only reach here when a BOM was present.
		if r == '\r' {
			continue
		}
		if r == '\n' {
			sb.WriteRune('\n')
			continue
		}
		if r >= 0xD800 && r <= 0xDBFF && i+3 < len(b) {
			var lo rune
			if bigEndian {
				lo = rune(b[i+2])<<8 | rune(b[i+3])
			} else {
				lo = rune(b[i+3])<<8 | rune(b[i+2])
			}
			if lo >= 0xDC00 && lo <= 0xDFFF {
				sb.WriteRune((r-0xD800)<<10 | (lo - 0xDC00) + 0x10000)
				i += 2
				continue
			}
		}
		sb.WriteRune(r)
	}
	return sb.String()
}

func decodeWindows1252(b []byte) string {
	var sb strings.Builder
	sb.Grow(len(b))
	for _, c := range b {
		if c >= 0x80 && c <= 0x9F {
			sb.WriteRune(win1252High[c-0x80])
			continue
		}
		sb.WriteRune(rune(c))
	}
	return sb.String()
}

// DetectDelimiter guesses the field delimiter by scoring candidates on the
// first lines of the file. It favors delimiters that appear on most lines and
// have a consistent count across lines.
func DetectDelimiter(text string) rune {
	candidates := []rune{',', ';', '\t', '|'}
	lines := sampleLines(text, 20)
	if len(lines) == 0 {
		return ','
	}

	best := ','
	bestScore := -1.0
	for _, d := range candidates {
		counts := make([]int, 0, len(lines))
		nonZero := 0
		for _, ln := range lines {
			c := strings.Count(ln, string(d))
			counts = append(counts, c)
			if c > 0 {
				nonZero++
			}
		}
		// Must appear on a majority of lines.
		if float64(nonZero) < float64(len(lines))*0.6 {
			continue
		}
		mean := 0.0
		for _, c := range counts {
			mean += float64(c)
		}
		mean /= float64(len(counts))
		variance := 0.0
		for _, c := range counts {
			dv := float64(c) - mean
			variance += dv * dv
		}
		variance /= float64(len(counts))
		// Prefer high mean field count with low variance across rows.
		score := mean/(1+variance) + float64(nonZero)*0.01
		if score > bestScore {
			bestScore = score
			best = d
		}
	}
	return best
}

func sampleLines(text string, n int) []string {
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	all := strings.Split(text, "\n")
	out := make([]string, 0, n)
	for _, ln := range all {
		if strings.TrimSpace(ln) == "" {
			continue
		}
		out = append(out, ln)
		if len(out) >= n {
			break
		}
	}
	return out
}

// LooksLikeHeaderRow reports whether the first row is likely a header rather
// than data. It returns true when most cells are non-numeric, non-empty and
// distinct.
func LooksLikeHeaderRow(first, second []string) bool {
	if len(first) == 0 {
		return false
	}
	nonNumeric, nonEmpty := 0, 0
	seen := map[string]bool{}
	dupes := 0
	for _, c := range first {
		c = strings.TrimSpace(c)
		if c != "" {
			nonEmpty++
		}
		if !isNumeric(c) {
			nonNumeric++
		}
		if seen[strings.ToLower(c)] {
			dupes++
		}
		seen[strings.ToLower(c)] = true
	}
	if nonEmpty == 0 {
		return false
	}
	ratio := float64(nonNumeric) / float64(len(first))
	if ratio < 0.7 {
		return false
	}
	if dupes > len(first)/3 {
		return false
	}
	// If the second row is clearly numeric where the first is not, the first
	// row is very likely a header.
	if second != nil {
		numericSecond := 0
		for _, c := range second {
			if isNumeric(strings.TrimSpace(c)) {
				numericSecond++
			}
		}
		if numericSecond >= len(second)/2 && numericSecond > 0 {
			return true
		}
	}
	return ratio >= 0.9
}

func isNumeric(s string) bool {
	if s == "" {
		return false
	}
	_, ok := numutil.ParseNumber(s)
	return ok
}
