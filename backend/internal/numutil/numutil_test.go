package numutil

import "testing"

func TestParseNumber(t *testing.T) {
	cases := []struct {
		in   string
		want float64
		ok   bool
	}{
		{"42", 42, true},
		{"-7", -7, true},
		{"+7", 7, true},
		{"3.14", 3.14, true},
		{"1,234.56", 1234.56, true},
		{"1.234,56", 1234.56, true},
		{"$1,200", 1200, true},
		{"€ 1.500,25", 1500.25, true},
		{"১২৩", 123, true},
		{"১২৩.৫", 123.5, true},
		{"50%", 0.5, true},
		{"(250)", -250, true},
		{"USD 1,000", 1000, true},
		{"1 000", 1000, true},
		{"", 0, false},
		{"N/A", 0, false},
		{"-", 0, false},
		{"abc", 0, false},
		{"2024-01-05", 0, false},
		{"1-2", 0, false},
		{"true", 0, false},
	}
	for _, c := range cases {
		got, ok := ParseNumber(c.in)
		if ok != c.ok {
			t.Errorf("ParseNumber(%q) ok = %v, want %v", c.in, ok, c.ok)
			continue
		}
		if ok && got != c.want {
			t.Errorf("ParseNumber(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestNormalizeDigits(t *testing.T) {
	if got := NormalizeDigits("০১২৩৪৫৬৭৮৯"); got != "0123456789" {
		t.Errorf("got %q", got)
	}
	if got := NormalizeDigits("abc"); got != "abc" {
		t.Errorf("got %q", got)
	}
}

func TestIsMissing(t *testing.T) {
	for _, s := range []string{"", " ", "N/A", "null", "-", "NaN"} {
		if !IsMissing(s) {
			t.Errorf("IsMissing(%q) = false, want true", s)
		}
	}
	for _, s := range []string{"0", "hello", "12"} {
		if IsMissing(s) {
			t.Errorf("IsMissing(%q) = true, want false", s)
		}
	}
}
