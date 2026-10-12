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

// NormalizeDigits converts Bangla (and Devanagari/Arabic-Indic) digits in s to
// ASCII digits, leaving other characters untouched.
func NormalizeDigits(s string) string {
	if !strings.ContainsFunc(s, isNonASCIIDigit) {
		return s
	}
	var sb strings.Builder
	for _, r := range s {
		if ascii, ok := banglaDigits[r]; ok {
			sb.WriteRune(ascii)
			continue
		}
		switch {
		case r >= 0x0660 && r <= 0x0669: // Arabic-Indic
			sb.WriteRune('0' + (r - 0x0660))
		case r >= 0x06F0 && r <= 0x06F9: // Extended Arabic-Indic
			sb.WriteRune('0' + (r - 0x06F0))
		default:
			sb.WriteRune(r)
		}
	}
	return sb.String()
}

func isNonASCIIDigit(r rune) bool {
	if r > unicode.MaxASCII {
		return true
	}
	return false
}

// ParseNumber attempts to interpret s as a number. It strips surrounding
// whitespace and known missing markers, currency symbols, thousands
// separators and a trailing percent sign (divided by 100).
func ParseNumber(s string) (float64, bool) {
	s = strings.TrimSpace(s)
	if s == "" || IsMissing(s) {
		return 0, false
	}
	s = NormalizeDigits(s)

	// Accounting style negatives.
	neg := false
	if strings.HasPrefix(s, "(") && strings.HasSuffix(s, ")") {
		neg = true
		s = strings.TrimSuffix(strings.TrimPrefix(s, "("), ")")
	}

	// Percentages.
	percent := false
	if strings.HasSuffix(s, "%") {
		percent = true
		s = strings.TrimSuffix(s, "%")
	}

	var sb strings.Builder
	exponent := false
	for i, r := range s {
		switch {
		case r >= '0' && r <= '9':
			sb.WriteRune(r)
		case r == '.' || r == ',':
			sb.WriteRune(r)
		case r == '-' && i == 0:
			sb.WriteRune(r)
		case r == '+' && i == 0:
			// ignore leading plus
		case r == 'e' || r == 'E':
			exponent = true
			sb.WriteRune(r)
		case r == '-' || r == '+' && exponent:
			sb.WriteRune(r)
		default:
			// Currency symbols, spaces, thousand separators like NBSP or
			// apostrophe are simply dropped.
			continue
		}
	}

	cleaned := sb.String()
	if cleaned == "" || cleaned == "-" || cleaned == "." {
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
		if strings.Count(s, ",") == 1 && len(s)-lastComma-1 <= 2 && len(s)-lastComma-1 >= 1 {
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
