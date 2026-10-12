// Package analyzer profiles parsed tables: type inference, descriptive
// statistics, correlations and rule-based insights.
package analyzer

import (
	"math"
	"strings"

	"github.com/example/excel-analyzer/internal/model"
	"github.com/example/excel-analyzer/internal/numutil"
)

// BoolValues maps textual booleans to their meaning.
var boolTrue = map[string]bool{
	"true": true, "t": true, "yes": true, "y": true, "1": true,
	"হ্যাঁ": true, "সত্য": true,
}
var boolFalse = map[string]bool{
	"false": true, "f": true, "no": true, "n": true, "0": false,
	"না": false, "মিথ্যা": false,
}

// columnSample gathers the counts needed to infer a column's type.
type columnSample struct {
	total      int
	missing    int
	numeric    int
	integer    int
	boolean    int
	date       int
	datetime   int
	unique     map[string]struct{}
	minLen     int
	maxLen     int
	lenSum     int
	lenCount   int
	// mixedKinds counts, for non-numeric value kinds, how many values fell
	// outside the dominant kind.
	numericNonParse int
}

func sampleColumn(rows [][]string, idx int) columnSample {
	s := columnSample{unique: map[string]struct{}{}, minLen: math.MaxInt32}
	for _, r := range rows {
		var raw string
		if idx < len(r) {
			raw = r[idx]
		}
		s.total++
		trimmed := strings.TrimSpace(raw)
		if numutil.IsMissing(trimmed) {
			s.missing++
			continue
		}
		s.unique[trimmed] = struct{}{}
		n := len([]rune(trimmed))
		s.lenSum += n
		s.lenCount++
		if n < s.minLen {
			s.minLen = n
		}
		if n > s.maxLen {
			s.maxLen = n
		}

		if v, ok := numutil.ParseNumber(trimmed); ok {
			s.numeric++
			if v == math.Trunc(v) {
				s.integer++
			}
		}
		lower := strings.ToLower(trimmed)
		if _, ok := boolTrue[lower]; ok {
			s.boolean++
		} else if _, ok := boolFalse[lower]; ok {
			s.boolean++
		}
		if _, kind, ok := ParseDate(trimmed); ok {
			s.date++
			if kind == KindDatetime {
				s.datetime++
			}
		}
	}
	if s.lenCount == 0 {
		s.minLen = 0
	}
	return s
}

// InferType determines the logical type of a column and returns the type plus
// whether the column contains values of more than one kind (mixed types).
func InferType(name string, rows [][]string, idx int) (model.ColumnType, columnSample, bool) {
	s := sampleColumn(rows, idx)
	nonMissing := s.total - s.missing
	if nonMissing == 0 {
		return model.TypeConstant, s, false
	}

	switch {
	case s.numeric == nonMissing:
		if s.integer == nonMissing {
			if isIDLikeName(name) && s.uniqueCount() == nonMissing {
				return model.TypeIDLike, s, false
			}
			return model.TypeInteger, s, false
		}
		return model.TypeFloat, s, false
	case s.boolean == nonMissing:
		return model.TypeBoolean, s, false
	case s.date == nonMissing:
		if s.datetime > 0 {
			return model.TypeDatetime, s, false
		}
		return model.TypeDate, s, false
	}

	// Mixed: a dominant numeric column with a few non-numeric values is
	// flagged so the UI can warn about dirty data.
	if s.numeric >= int(float64(nonMissing)*0.9) && s.numeric > 0 {
		return model.TypeFloat, s, true
	}

	unique := s.uniqueCount()
	switch {
	case unique == 1:
		return model.TypeConstant, s, false
	case isIDLikeName(name) && unique == nonMissing && nonMissing > 1:
		return model.TypeIDLike, s, false
	case float64(unique)/float64(nonMissing) <= 0.5 && unique <= 100:
		return model.TypeCategorical, s, false
	default:
		return model.TypeText, s, false
	}
}

func (s columnSample) uniqueCount() int { return len(s.unique) }

func isIDLikeName(name string) bool {
	n := strings.ToLower(strings.TrimSpace(name))
	if n == "id" {
		return true
	}
	hasID := strings.HasSuffix(n, "id") || strings.HasSuffix(n, "_id") ||
		strings.HasPrefix(n, "id_") || strings.Contains(n, " id")
	return hasID
}

// isIDLikeSeries reports whether a numeric column is a plausible identifier:
// almost every value unique and close to sequential.
func isIDLikeSeries(vals []float64, nonMissing int) bool {
	if nonMissing < 10 || len(vals) != nonMissing {
		return false
	}
	seen := map[float64]bool{}
	for _, v := range vals {
		if v != math.Trunc(v) {
			return false
		}
		seen[v] = true
	}
	if len(seen) != nonMissing {
		return false
	}
	return true
}
