package analyzer

import (
	"sort"
	"strings"
	"time"

	"github.com/thbappy7706/autosheet-analyzer/backend/internal/numutil"
)

// DateKind distinguishes date-only from datetime values.
type DateKind int

const (
	// KindDate is a date without a time component.
	KindDate DateKind = iota
	// KindDatetime is a date with a time component.
	KindDatetime
)

// dateLayouts are tried in order. Day-first layouts come after ISO layouts so
// unambiguous ISO values win; month-first US layouts are tried last.
var dateLayouts = []struct {
	layout string
	kind   DateKind
}{
	{"2006-01-02T15:04:05Z07:00", KindDatetime},
	{"2006-01-02 15:04:05", KindDatetime},
	{"2006-01-02T15:04:05", KindDatetime},
	{"2006-01-02 15:04", KindDatetime},
	{"2006/01/02 15:04:05", KindDatetime},
	{"02-01-2006 15:04:05", KindDatetime},
	{"02/01/2006 15:04:05", KindDatetime},
	{"2006-01-02", KindDate},
	{"2006/01/02", KindDate},
	{"2006.01.02", KindDate},
	{"02-01-2006", KindDate},
	{"02/01/2006", KindDate},
	{"02.01.2006", KindDate},
	{"2 Jan 2006", KindDate},
	{"02 Jan 2006", KindDate},
	{"Jan 2, 2006", KindDate},
	{"January 2, 2006", KindDate},
	{"2 January 2006", KindDate},
	{"01-02-2006", KindDate},
	{"01/02/2006", KindDate},
	{"15:04:05", KindDatetime},
}

// banglaMonths maps Bengali month names to their English equivalents so the
// standard layouts can parse them.
var banglaMonths = []struct{ bn, en string }{
	{"জানুয়ারি", "January"}, {"জানু", "Jan"},
	{"ফেব্রুয়ারি", "February"}, {"ফেব্রু", "Feb"},
	{"মার্চ", "March"}, {"মার", "Mar"},
	{"এপ্রিল", "April"}, {"এপ্রি", "Apr"},
	{"মে", "May"},
	{"জুন", "June"}, {"জুন", "Jun"},
	{"জুলাই", "July"}, {"জুল", "Jul"},
	{"আগস্ট", "August"}, {"আগ", "Aug"},
	{"সেপ্টেম্বর", "September"}, {"সেপ", "Sep"},
	{"অক্টোবর", "October"}, {"অক্টো", "Oct"},
	{"নভেম্বর", "November"}, {"নভে", "Nov"},
	{"ডিসেম্বর", "December"}, {"ডিসে", "Dec"},
}

// TranslateBanglaMonths replaces Bengali month names (and Bangla digits) with
// ASCII equivalents.
func TranslateBanglaMonths(s string) string {
	s = numutil.NormalizeDigits(s)
	for _, m := range banglaMonths {
		if strings.Contains(s, m.bn) {
			s = strings.ReplaceAll(s, m.bn, m.en)
		}
	}
	// Bengali comma and hyphen are visually distinct; normalize them.
	s = strings.ReplaceAll(s, "،", ",")
	return s
}

// ParseDate interprets a raw cell value as a date. It returns the parsed time,
// whether it had a time component, and whether parsing succeeded.
func ParseDate(raw string) (time.Time, DateKind, bool) {
	s := strings.TrimSpace(raw)
	if s == "" || numutil.IsMissing(s) {
		return time.Time{}, KindDate, false
	}
	s = TranslateBanglaMonths(s)
	// Strip a trailing timezone-free suffix like " UTC".
	s = strings.TrimSuffix(s, " UTC")
	for _, l := range dateLayouts {
		if t, err := time.Parse(l.layout, s); err == nil {
			return t, l.kind, true
		}
	}
	return time.Time{}, KindDate, false
}

// InferFrequency guesses a date column's periodicity from the median gap
// between consecutive sorted values.
func InferFrequency(dates []time.Time) string {
	if len(dates) < 2 {
		return "unknown"
	}
	sorted := append([]time.Time(nil), dates...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Before(sorted[j]) })
	gaps := make([]time.Duration, 0, len(sorted)-1)
	for i := 1; i < len(sorted); i++ {
		gaps = append(gaps, sorted[i].Sub(sorted[i-1]))
	}
	sort.Slice(gaps, func(i, j int) bool { return gaps[i] < gaps[j] })
	median := gaps[len(gaps)/2]
	switch d := median.Hours(); {
	case d < 1:
		return "sub-hourly"
	case d < 20:
		return "hourly"
	case d < 36:
		return "daily"
	case d < 24*10:
		return "weekly"
	case d < 24*45:
		return "monthly"
	case d < 24*120:
		return "quarterly"
	default:
		return "yearly"
	}
}
