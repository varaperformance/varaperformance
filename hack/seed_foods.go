package main

import (
	"bufio"
	"crypto/rand"
	"encoding/csv"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

const nullToken = "__NULL__"

type seedFood struct {
	Name          string   `json:"name"`
	Brand         *string  `json:"brand,omitempty"`
	Description   *string  `json:"description,omitempty"`
	Barcode       string   `json:"barcode"`
	Source        string   `json:"source"`
	IsVerified    bool     `json:"isVerified"`
	ServingSize   float64  `json:"servingSize"`
	ServingUnit   string   `json:"servingUnit"`
	ServingLabel  string   `json:"servingLabel"`
	Calories      float64  `json:"calories"`
	Protein       float64  `json:"protein"`
	Carbohydrates float64  `json:"carbohydrates"`
	Fat           float64  `json:"fat"`
	Fiber         *float64 `json:"fiber,omitempty"`
	Sugar         *float64 `json:"sugar,omitempty"`
	SaturatedFat  *float64 `json:"saturatedFat,omitempty"`
	Sodium        *float64 `json:"sodium,omitempty"`
	Cholesterol   *float64 `json:"cholesterol,omitempty"`
}

func main() {
	inputPath := flag.String("input", "hack/foods.jsonl", "Merged food JSONL")
	envPath := flag.String("env-file", "apps/backend/.env", ".env with DATABASE_URL")
	dbURLFlag := flag.String("db-url", "", "DATABASE_URL override")
	progressEvery := flag.Int("progress", 50000, "Progress interval")
	dryRun := flag.Bool("dry-run", false, "Validate without writing")
	truncateFirst := flag.Bool("truncate", false, "TRUNCATE Food CASCADE before seed")
	flag.Parse()

	if err := run(*inputPath, *envPath, *dbURLFlag, *progressEvery, *dryRun, *truncateFirst); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run(inputPath, envPath, dbURLFlag string, progressEvery int, dryRun, truncateFirst bool) error {
	total, err := countLines(inputPath)
	if err != nil {
		return fmt.Errorf("count rows: %w", err)
	}
	fmt.Printf("Input rows: %d\n", total)

	dbURL := resolveDBURL(dbURLFlag, envPath)
	if dbURL == "" && !dryRun {
		return errors.New("DATABASE_URL not found")
	}

	if dryRun {
		fmt.Println("Dry run — no DB writes")
		return validateInput(inputPath, total, progressEvery)
	}

	psql, err := resolvePsqlPath()
	if err != nil {
		return err
	}

	if truncateFirst {
		fmt.Println("Truncating Food table (CASCADE)...")
		cmd := exec.Command(psql, dbURL, "-v", "ON_ERROR_STOP=1", "-c", `TRUNCATE "Food" CASCADE;`)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("truncate: %w", err)
		}
		fmt.Println("Truncated.")
	}

	copySQL := `COPY "Food" (` +
		`"id","name","brand","description","barcode","source","isVerified",` +
		`"servingSize","servingUnit","servingLabel",` +
		`"calories","protein","carbohydrates","fat",` +
		`"fiber","sugar","saturatedFat","sodium","cholesterol",` +
		`"updatedAt"` +
		`) FROM STDIN WITH (FORMAT csv, NULL '` + nullToken + `');`

	fmt.Println("Seeding via psql COPY...")
	cmd := exec.Command(psql, dbURL, "-v", "ON_ERROR_STOP=1", "-c", copySQL)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return fmt.Errorf("stdin pipe: %w", err)
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start psql: %w", err)
	}

	writeErr := streamJSONLToCSV(inputPath, stdin, total, progressEvery)
	closeErr := stdin.Close()
	waitErr := cmd.Wait()

	if writeErr != nil {
		return writeErr
	}
	if closeErr != nil {
		return fmt.Errorf("close stdin: %w", closeErr)
	}
	if waitErr != nil {
		return fmt.Errorf("psql: %w", waitErr)
	}

	fmt.Println("Seed complete.")
	return nil
}

func streamJSONLToCSV(inputPath string, out io.Writer, total, prog int) error {
	file, err := os.Open(inputPath)
	if err != nil {
		return err
	}
	defer file.Close()

	sc := bufio.NewScanner(file)
	sc.Buffer(make([]byte, 0, 1024*1024), 32*1024*1024)
	w := csv.NewWriter(out)
	n := 0

	for sc.Scan() {
		n++
		var it seedFood
		if err := json.Unmarshal(sc.Bytes(), &it); err != nil {
			return fmt.Errorf("line %d: %w", n, err)
		}
		id, err := newUUIDv4()
		if err != nil {
			return fmt.Errorf("uuid line %d: %w", n, err)
		}
		ts := time.Now().UTC().Format(time.RFC3339Nano)
		rec := []string{
			id,
			it.Name,
			nStr(it.Brand),
			nStr(it.Description),
			it.Barcode,
			it.Source,
			fmt.Sprintf("%t", it.IsVerified),
			fmt.Sprintf("%.6f", it.ServingSize),
			it.ServingUnit,
			it.ServingLabel,
			fmt.Sprintf("%.6f", it.Calories),
			fmt.Sprintf("%.6f", it.Protein),
			fmt.Sprintf("%.6f", it.Carbohydrates),
			fmt.Sprintf("%.6f", it.Fat),
			nFloat(it.Fiber),
			nFloat(it.Sugar),
			nFloat(it.SaturatedFat),
			nFloat(it.Sodium),
			nFloat(it.Cholesterol),
			ts,
		}
		if err := w.Write(rec); err != nil {
			return fmt.Errorf("write line %d: %w", n, err)
		}
		if prog > 0 && n%prog == 0 {
			pct := 0.0
			if total > 0 {
				pct = float64(n) / float64(total) * 100
			}
			fmt.Fprintf(os.Stderr, "seed: %.1f%% (%d/%d)\n", pct, n, total)
		}
	}
	if err := sc.Err(); err != nil {
		return err
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return err
	}
	fmt.Fprintf(os.Stderr, "seed: done (%d rows)\n", n)
	return nil
}

func validateInput(path string, total, prog int) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 1024*1024), 32*1024*1024)
	n, usda, off := 0, 0, 0
	for sc.Scan() {
		n++
		var it seedFood
		if err := json.Unmarshal(sc.Bytes(), &it); err != nil {
			return fmt.Errorf("line %d: %w", n, err)
		}
		if it.Source == "USDA" {
			usda++
		} else {
			off++
		}
		if prog > 0 && n%prog == 0 {
			fmt.Fprintf(os.Stderr, "validate: %d/%d\n", n, total)
		}
	}
	fmt.Printf("Valid: %d rows (USDA=%d OFF=%d)\n", n, usda, off)
	return sc.Err()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func resolveDBURL(flag, envPath string) string {
	if v := strings.TrimSpace(flag); v != "" {
		return v
	}
	if v := strings.TrimSpace(os.Getenv("DATABASE_URL")); v != "" {
		return v
	}
	m, err := readEnvFile(envPath)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(m["DATABASE_URL"])
}

func countLines(path string) (int, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 1024*1024), 32*1024*1024)
	n := 0
	for sc.Scan() {
		n++
	}
	return n, sc.Err()
}

func readEnvFile(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	vals := map[string]string{}
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		eq := strings.Index(line, "=")
		if eq <= 0 {
			continue
		}
		k := strings.TrimSpace(line[:eq])
		v := strings.TrimSpace(line[eq+1:])
		v = strings.Trim(v, `"`)
		vals[k] = v
	}
	return vals, sc.Err()
}

func nStr(v *string) string {
	if v == nil {
		return nullToken
	}
	s := strings.TrimSpace(*v)
	if s == "" {
		return nullToken
	}
	return s
}

func nFloat(v *float64) string {
	if v == nil {
		return nullToken
	}
	return fmt.Sprintf("%.6f", *v)
}

func resolvePsqlPath() (string, error) {
	if p, err := exec.LookPath("psql"); err == nil {
		return p, nil
	}
	if p := strings.TrimSpace(os.Getenv("PSQL_PATH")); p != "" {
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}
	for _, p := range []string{
		"/opt/homebrew/opt/libpq/bin/psql",
		"/usr/local/opt/libpq/bin/psql",
		"/opt/homebrew/bin/psql",
		"/usr/local/bin/psql",
	} {
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}
	return "", errors.New("psql not found")
}

func newUUIDv4() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf(
		"%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
		b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7],
		b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15],
	), nil
}
