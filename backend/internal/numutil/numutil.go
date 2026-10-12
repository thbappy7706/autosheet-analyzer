// Package numutil parses messy human-entered numeric strings, including
// currency symbols, thousands separators, percentages, accounting negatives
// and Bangla digits.
package numutil

import (
	"math"
	"strconv"
	"strings"
	"unicode"
)

// banglaDigits maps Bengali ০-৯ (U+09E6-U+09EF) to ASCII digits.
var banglaDigits = map[rune]rune{
	'০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
	'৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
}

// NormalizeDigits converts Bangla (and Arabic-Indic) digits in s to ASCII
// digits, leaving other characters untouched.
func NormalizeDigits(s string) string {
	var sb strings.Builder
	changed := false
	for _, r := range s {
		if ascii, ok := banglaDigits[r]; ok {
			sb.WriteRune(ascii)
			changed = true
			continue
		}
		switch {
		case r >= 0x0660 && r <= 0x0669: // Arabic-Indic
			sb.WriteRune('0' + (r - 0x0660))
			changed = true
		case r >= 0x06F0 && r <= 0x06F9: // Extended Arabic-Indic
			sb.WriteRune('0' + (r - 0x06F0))
			changed = true
		default:
			sb.WriteRune(r)
		}
	}
	if !changed {
		return s
	}
	return sb.String()
}

// ParseNumber attempts to interpret s as a number.
//
// It tolerates surrounding whitespace, a leading currency symbol or 3-letter
// currency code, thousands separators (comma, space, NBSP, apostrophe),
// accounting parentheses and a trailing percent sign (divided by 100).
//
// It deliberately rejects strings containing letters or internal signs so
// that dates ("2024-01-05"), ranges ("1-2") and free text are not misread as
// numbers.
func ParseNumber(s string) (float64, bool) {
	s = strings.TrimSpace(s)
	if s == "" || IsMissing(s) {
		return 0, false
	}
	s = NormalizeDigits(s)

	neg := false
	if strings.HasPrefix(s, "(") && strings.HasSuffix(s, ")") {
		neg = true
		s = strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(s, "("), ")"))
	}

	percent := false
	if strings.HasSuffix(s, "%") {
		percent = true
		s = strings.TrimSpace(strings.TrimSuffix(s, "%"))
	}

	s = stripLeadingCurrencyCode(s)
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "+") {
		s = s[1:]
	} else if strings.HasPrefix(s, "-") {
		neg = !neg
		s = s[1:]
	}

	var sb strings.Builder
	for _, r := range s {
		switch {
		case r >= '0' && r <= '9':
			sb.WriteRune(r)
		case r == '.' || r == ',':
			sb.WriteRune(r)
		case r == ' ' || r == '\u00A0' || r == '\'' || r == '\u2019':
			// thousands separators; dropped below
		case r == '+' || r == '-':
			// A sign inside the number means this is not a plain number.
			return 0, false
		case unicode.IsSymbol(r) || unicode.IsCurrency(r):
			// Currency symbols (e.g. $, €, ₹, ৳) are ignored.
		default:
			return 0, false
		}
	}

	cleaned := sb.String()
	if cleaned == "" || cleaned == "." || cleaned == "-" {
		return 0, false
	}
	cleaned = normalizeSeparators(cleaned)
	v, err := strconv.ParseFloat(cleaned, 64)
	if err != nil || math.IsNaN(v) || math.IsInf(v, 0) {
		return 0, false
	}
	if neg {
		v = -v
	}
	if percent {
		v /= 100
	}
	return v, true
}

// stripLeadingCurrencyCode removes a leading ISO currency code such as "USD"
// or "BDT" (up to three letters) followed by optional whitespace.
func stripLeadingCurrencyCode(s string) string {
	runes := []rune(s)
	n := 0
	for n < len(runes) && unicode.IsLetter(runes[n]) && n < 4 {
		n++
	}
	if n == 0 || n > 3 {
		return s
	}
	// Only strip when a digit follows the code.
	i := n
	for i < len(runes) && (runes[i] == ' ' || runes[i] == '\u00A0') {
		i++
	}
	if i < len(runes) && runes[i] >= '0' && runes[i] <= '9' {
		return string(runes[i:])
	}
	return s
}

// normalizeSeparators resolves whether "," is a decimal or thousands
// separator. When both are present the last one wins as the decimal mark.
func normalizeSeparators(s string) string {
	lastComma := strings.LastIndex(s, ",")
	lastDot := strings.LastIndex(s, ".")
	switch {
	case lastComma == -1:
		return s
	case lastDot == -1:
		// No dot: a comma is a decimal mark only if a single comma is
		// followed by 1-2 digits (e.g. "3,14"); otherwise thousands.
		tail := len(s) - lastComma - 1
		if strings.Count(s, ",") == 1 && tail >= 1 && tail <= 2 {
			return strings.Replace(s, ",", ".", 1)
		}
		return strings.ReplaceAll(s, ",", "")
	default:
		if lastComma > lastDot {
			// Comma is the decimal mark; dots were thousands separators.
			s = strings.ReplaceAll(s, ".", "")
			return strings.Replace(s, ",", ".", 1)
		}
		// Dot is the decimal mark; commas were thousands separators.
		return strings.ReplaceAll(s, ",", "")
	}
}

// missingMarkers are common textual representations of empty values.
var missingMarkers = map[string]bool{
	"": true, "na": true, "n/a": true, "nan": true, "null": true,
	"nil": true, "none": true, "-": true, "--": true, "?": true,
	"undefined": true, "#n/a": true, "#div/0!": true, "#value!": true,
	"#ref!": true, "\\n": true,
}

// IsMissing reports whether s should be treated as a missing value.
func IsMissing(s string) bool {
	t := strings.TrimSpace(s)
	if t == "" {
		return true
	}
	return missingMarkers[strings.ToLower(t)]
}
