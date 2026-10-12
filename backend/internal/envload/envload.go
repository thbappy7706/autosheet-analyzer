// Package envload loads KEY=VALUE pairs from a .env file into the process
// environment.
//
// Variables that already exist in the environment always win, so a value
// exported on the command line is never silently overridden by the file.
package envload

import (
	"bufio"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// candidatePaths are searched in order, relative to the working directory.
// The second entry covers running the server from the backend/ directory while
// the file sits at the repository root.
var candidatePaths = []string{".env", "../.env"}

// LoadDefault finds a .env file and loads it. The search can be pointed at a
// specific file with the ENV_FILE environment variable.
//
// It returns the path that was loaded (empty when nothing was found) and how
// many variables were set. A missing .env file is not an error.
func LoadDefault() (string, int, error) {
	if explicit := strings.TrimSpace(os.Getenv("ENV_FILE")); explicit != "" {
		n, err := Load(explicit)
		return explicit, n, err
	}
	for _, path := range candidatePaths {
		if _, err := os.Stat(path); err != nil {
			continue
		}
		n, err := Load(path)
		abs, absErr := filepath.Abs(path)
		if absErr != nil {
			abs = path
		}
		return abs, n, err
	}
	return "", 0, nil
}

// Load reads path and sets every variable that is not already present in the
// environment. It returns the number of variables that were set.
func Load(path string) (int, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}
	defer f.Close()
	return load(f)
}

func load(r io.Reader) (int, error) {
	scanner := bufio.NewScanner(r)
	set := 0
	for scanner.Scan() {
		key, value, ok := parseLine(scanner.Text())
		if !ok {
			continue
		}
		if _, exists := os.LookupEnv(key); exists {
			continue
		}
		if err := os.Setenv(key, value); err != nil {
			return set, err
		}
		set++
	}
	return set, scanner.Err()
}

// parseLine parses one "KEY=VALUE" line. Blank lines and comments starting
// with '#' are skipped, an optional "export " prefix is accepted, and
// matching single or double quotes around the value are stripped.
func parseLine(line string) (key, value string, ok bool) {
	line = strings.TrimSpace(line)
	if line == "" || strings.HasPrefix(line, "#") {
		return "", "", false
	}
	line = strings.TrimPrefix(line, "export ")

	eq := strings.IndexByte(line, '=')
	if eq <= 0 {
		return "", "", false
	}
	key = strings.TrimSpace(line[:eq])
	if key == "" || strings.ContainsAny(key, " \t") {
		return "", "", false
	}
	value = strings.TrimSpace(line[eq+1:])
	if len(value) >= 2 {
		if (value[0] == '"' && value[len(value)-1] == '"') ||
			(value[0] == '\'' && value[len(value)-1] == '\'') {
			value = value[1 : len(value)-1]
		}
	}
	return key, value, true
}
