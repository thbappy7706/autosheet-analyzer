package analyzer

import (
	"testing"
	"time"
)

func TestParseDateFormats(t *testing.T) {
	cases := []struct {
		in   string
		ok   bool
		kind DateKind
	}{
		{"2024-01-05", true, KindDate},
		{"2024/01/05", true, KindDate},
		{"05/01/2024", true, KindDate},
		{"5 Jan 2024", true, KindDate},
		{"January 5, 2024", true, KindDate},
		{"2024-01-05 10:30:00", true, KindDatetime},
		{"2024-01-05T10:30:00Z", true, KindDatetime},
		{"৫ জানুয়ারি ২০২৪", true, KindDate},
		{"১২/০১/২০২৪", true, KindDate},
		{"not a date", false, KindDate},
		{"", false, KindDate},
		{"1-2-3", false, KindDate}, // too short to be a real year
	}
	for _, c := range cases {
		got, kind, ok := ParseDate(c.in)
		if ok != c.ok {
			t.Errorf("ParseDate(%q) ok = %v, want %v", c.in, ok, c.ok)
			continue
		}
		if ok && kind != c.kind {
			t.Errorf("ParseDate(%q) kind = %v, want %v", c.in, kind, c.kind)
		}
		if ok && got.IsZero() {
			t.Errorf("ParseDate(%q) returned zero time", c.in)
		}
	}
}

func TestInferFrequency(t *testing.T) {
	dates := []time.Time{}
	for d := 1; d <= 10; d++ {
		dates = append(dates, time.Date(2024, 1, d, 0, 0, 0, 0, time.UTC))
	}
	if got := InferFrequency(dates); got != "daily" {
		t.Errorf("frequency = %q, want daily", got)
	}

	monthly := []time.Time{
		time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC),
	}
	if got := InferFrequency(monthly); got != "monthly" {
		t.Errorf("frequency = %q, want monthly", got)
	}
}
