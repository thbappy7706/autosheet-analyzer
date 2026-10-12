package parser

import "testing"

func TestDetectDelimiter(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want rune
	}{
		{"comma", "a,b,c\n1,2,3\n4,5,6\n", ','},
		{"semicolon", "a;b;c\n1;2;3\n4;5;6\n", ';'},
		{"tab", "a\tb\tc\n1\t2\t3\n4\t5\t6\n", '\t'},
		{"pipe", "a|b|c\n1|2|3\n4|5|6\n", '|'},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := DetectDelimiter(c.in); got != c.want {
				t.Errorf("delimiter = %q, want %q", got, c.want)
			}
		})
	}
}

func TestDecodeUTF8BOM(t *testing.T) {
	raw := append([]byte{0xEF, 0xBB, 0xBF}, []byte("name,age\n")...)
	got := DecodeBytes(raw)
	if got.Encoding != "utf-8-bom" || !got.BOM {
		t.Errorf("encoding = %q bom = %v", got.Encoding, got.BOM)
	}
	if got.Text != "name,age\n" {
		t.Errorf("text = %q", got.Text)
	}
}

func TestDecodeWindows1252(t *testing.T) {
	// 0xE9 is 'é' in Windows-1252/latin-1 and invalid UTF-8 on its own.
	raw := []byte{'c', 'a', 'f', 0xE9, '\n'}
	got := DecodeBytes(raw)
	if got.Encoding != "windows-1252" {
		t.Errorf("encoding = %q, want windows-1252", got.Encoding)
	}
	if got.Text != "café\n" {
		t.Errorf("text = %q, want café", got.Text)
	}
}

func TestDecodePlainUTF8(t *testing.T) {
	got := DecodeBytes([]byte("নাম,বয়স\n"))
	if got.Encoding != "utf-8" || got.BOM {
		t.Errorf("encoding = %q bom = %v", got.Encoding, got.BOM)
	}
}

func TestLooksLikeHeaderRow(t *testing.T) {
	if !LooksLikeHeaderRow([]string{"name", "age"}, []string{"Alice", "30"}) {
		t.Error("expected header detection for name/age")
	}
	if LooksLikeHeaderRow([]string{"1", "2"}, []string{"3", "4"}) {
		t.Error("did not expect header detection for numeric first row")
	}
}
