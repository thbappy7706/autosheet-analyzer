package envload

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseLine(t *testing.T) {
	cases := []struct {
		name      string
		line      string
		wantKey   string
		wantValue string
		wantOK    bool
	}{
		{"plain", "ADDR=:8080", "ADDR", ":8080", true},
		{"spaces around", "  MAX_UPLOAD_MB = 50  ", "MAX_UPLOAD_MB", "50", true},
		{"comment", "# a comment", "", "", false},
		{"blank", "   ", "", "", false},
		{"no equals", "JUSTAKEY", "", "", false},
		{"empty key", "=value", "", "", false},
		{"key with space", "BAD KEY=1", "", "", false},
		{"export prefix", "export CORS_ORIGIN=http://x", "CORS_ORIGIN", "http://x", true},
		{"double quoted", `SAMPLE_ROWS="200 000"`, "SAMPLE_ROWS", "200 000", true},
		{"single quoted", "TEMP_DIR='/tmp/out'", "TEMP_DIR", "/tmp/out", true},
		{"empty value", "ENV_FILE=", "ENV_FILE", "", true},
		{"value with equals", "Q=a=b", "Q", "a=b", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			k, v, ok := parseLine(c.line)
			if ok != c.wantOK {
				t.Fatalf("ok = %v, want %v", ok, c.wantOK)
			}
			if k != c.wantKey || v != c.wantValue {
				t.Errorf("got (%q, %q), want (%q, %q)", k, v, c.wantKey, c.wantValue)
			}
		})
	}
}

func TestLoadSetsMissingVariables(t *testing.T) {
	path := filepath.Join(t.TempDir(), ".env")
	content := "# comment\n" +
		"TEST_ENVLOAD_PLAIN=hello\n" +
		"TEST_ENVLOAD_QUOTED=\"a b\"\n" +
		"export TEST_ENVLOAD_EXPORTED=baz\n" +
		"TEST_ENVLOAD_EMPTY=\n" +
		"\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	defer unsetLater(
		"TEST_ENVLOAD_PLAIN", "TEST_ENVLOAD_QUOTED",
		"TEST_ENVLOAD_EXPORTED", "TEST_ENVLOAD_EMPTY",
	)()

	n, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if n != 4 {
		t.Errorf("set %d variables, want 4", n)
	}
	for key, want := range map[string]string{
		"TEST_ENVLOAD_PLAIN":    "hello",
		"TEST_ENVLOAD_QUOTED":   "a b",
		"TEST_ENVLOAD_EXPORTED": "baz",
		"TEST_ENVLOAD_EMPTY":    "",
	} {
		if got := os.Getenv(key); got != want {
			t.Errorf("%s = %q, want %q", key, got, want)
		}
	}
}

// An explicitly exported variable must never be overwritten by the file.
func TestExistingEnvironmentWins(t *testing.T) {
	t.Setenv("TEST_ENVLOAD_KEEP", "from-shell")
	defer unsetLater("TEST_ENVLOAD_OTHER")()

	path := filepath.Join(t.TempDir(), ".env")
	content := "TEST_ENVLOAD_KEEP=from-file\nTEST_ENVLOAD_OTHER=abc\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}

	n, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("set %d variables, want 1 (the pre-set one is skipped)", n)
	}
	if got := os.Getenv("TEST_ENVLOAD_KEEP"); got != "from-shell" {
		t.Errorf("TEST_ENVLOAD_KEEP = %q, want the shell value %q", got, "from-shell")
	}
}

func TestLoadMissingFileIsNotAnError(t *testing.T) {
	n, err := Load(filepath.Join(t.TempDir(), "does-not-exist"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if n != 0 {
		t.Errorf("set %d variables, want 0", n)
	}
}

func TestLoadDefaultHonoursEnvFileOverride(t *testing.T) {
	path := filepath.Join(t.TempDir(), "custom.env")
	if err := os.WriteFile(path, []byte("TEST_ENVLOAD_CUSTOM=yes\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("ENV_FILE", path)
	defer unsetLater("TEST_ENVLOAD_CUSTOM")()

	got, n, err := LoadDefault()
	if err != nil {
		t.Fatal(err)
	}
	if got != path {
		t.Errorf("path = %q, want %q", got, path)
	}
	if n != 1 || os.Getenv("TEST_ENVLOAD_CUSTOM") != "yes" {
		t.Errorf("n = %d, value = %q", n, os.Getenv("TEST_ENVLOAD_CUSTOM"))
	}
}

// unsetLater clears the given variables when the returned function is called.
func unsetLater(keys ...string) func() {
	return func() {
		for _, k := range keys {
			_ = os.Unsetenv(k)
		}
	}
}
