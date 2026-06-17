// seed_exercises.go — fetch all exercises from oss.exercisedb.dev and upsert into the DB.
//
// Usage (from repo root):
//
//	kubectl port-forward -n infrastructure svc/postgres 5433:5432 &
//	go run ./hack/seed_exercises.go --db-url "postgresql://user:pass@localhost:5433/varaperformance"
//
// Flags:
//
//	--db-url    DATABASE_URL override (default: DATABASE_URL env)
//	--base-url  ExerciseDB OSS API base (default: https://oss.exercisedb.dev/api/v1)
//	--batch     Exercises per API page, max 25 (default 25)
//	--dry-run   Fetch and normalize without writing to DB

package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

// ── API types ─────────────────────────────────────────────────────────────────

type apiMeta struct {
	Total       int    `json:"total"`
	HasNextPage bool   `json:"hasNextPage"`
	NextCursor  string `json:"nextCursor"`
}

type apiExercise struct {
	ExerciseID       string   `json:"exerciseId"`
	Name             string   `json:"name"`
	GifURL           string   `json:"gifUrl"`
	BodyParts        []string `json:"bodyParts"`
	Equipments       []string `json:"equipments"`
	TargetMuscles    []string `json:"targetMuscles"`
	SecondaryMuscles []string `json:"secondaryMuscles"`
	Instructions     []string `json:"instructions"`
}

type apiResponse struct {
	Success bool          `json:"success"`
	Meta    apiMeta       `json:"meta"`
	Data    []apiExercise `json:"data"`
}

// ── Normalized types ──────────────────────────────────────────────────────────

type muscleEntry struct {
	group     string
	isPrimary bool
}

type equipEntry struct {
	equip      string
	isRequired bool
}

type exercise struct {
	slug         string
	name         string
	category     string
	difficulty   string
	description  string
	instructions []string
	tips         []string
	variations   []string
	thumbnailURL string
	muscles      []muscleEntry
	equipment    []equipEntry
}

// ── Mapping (mirrors exercisedb.service.ts) ───────────────────────────────────

var reNonAlnum = regexp.MustCompile(`[^a-z0-9\s-]`)
var reSpaces = regexp.MustCompile(`\s+`)
var reDashes = regexp.MustCompile(`-+`)

func slugify(s string) string {
	s = strings.ToLower(s)
	s = reNonAlnum.ReplaceAllString(s, "")
	s = strings.TrimSpace(s)
	s = reSpaces.ReplaceAllString(s, "-")
	return reDashes.ReplaceAllString(s, "-")
}

func mapMuscle(v string) string {
	n := strings.ToLower(v)
	switch {
	case strings.Contains(n, "chest") || strings.Contains(n, "pectoral"):
		return "CHEST"
	case strings.Contains(n, "spine") || strings.Contains(n, "lat") || strings.Contains(n, "back"):
		return "BACK"
	case strings.Contains(n, "shoulder") || strings.Contains(n, "delt"):
		return "SHOULDERS"
	case strings.Contains(n, "bicep"):
		return "BICEPS"
	case strings.Contains(n, "tricep"):
		return "TRICEPS"
	case strings.Contains(n, "quad") || strings.Contains(n, "hamstring") || strings.Contains(n, "calf") || strings.Contains(n, "thigh"):
		return "LEGS"
	case strings.Contains(n, "glute"):
		return "GLUTES"
	case strings.Contains(n, "abs") || strings.Contains(n, "core") || strings.Contains(n, "oblique"):
		return "CORE"
	case strings.Contains(n, "forearm") || strings.Contains(n, "wrist"):
		return "BICEPS" // closest valid enum — no FOREARMS in MuscleGroup
	}
	return ""
}

func mapEquip(v string) string {
	n := strings.ToLower(v)
	switch {
	case strings.Contains(n, "barbell"):
		return "BARBELL"
	case strings.Contains(n, "dumbbell"):
		return "DUMBBELL"
	case strings.Contains(n, "cable"):
		return "CABLE"
	case strings.Contains(n, "machine") || strings.Contains(n, "lever") || strings.Contains(n, "smith"):
		return "MACHINE"
	case strings.Contains(n, "kettlebell"):
		return "KETTLEBELL"
	case strings.Contains(n, "band"):
		return "RESISTANCE_BAND"
	case strings.Contains(n, "treadmill") || strings.Contains(n, "bike") || strings.Contains(n, "rower") || strings.Contains(n, "elliptical") || strings.Contains(n, "stair"):
		return "CARDIO_MACHINE"
	case strings.Contains(n, "body weight") || strings.Contains(n, "bodyweight"):
		return "BODYWEIGHT"
	}
	return ""
}

func buildMuscles(targets, secondary []string) []muscleEntry {
	seen := map[string]bool{}
	var result []muscleEntry
	all := append(append([]string{}, targets...), secondary...)
	for i, raw := range all {
		mg := mapMuscle(raw)
		if mg == "" || seen[mg] {
			continue
		}
		seen[mg] = true
		result = append(result, muscleEntry{group: mg, isPrimary: i < len(targets)})
	}
	if len(result) == 0 {
		result = []muscleEntry{{group: "FULL_BODY", isPrimary: true}}
	}
	return result
}

func buildEquip(equipments []string) []equipEntry {
	seen := map[string]bool{}
	var result []equipEntry
	for i, raw := range equipments {
		eq := mapEquip(raw)
		if eq == "" || seen[eq] {
			continue
		}
		seen[eq] = true
		result = append(result, equipEntry{equip: eq, isRequired: i == 0})
	}
	if len(result) == 0 {
		result = []equipEntry{{equip: "BODYWEIGHT", isRequired: false}}
	}
	return result
}

func buildCategory(bodyParts []string, equip []equipEntry) string {
	for _, e := range equip {
		if e.equip == "CARDIO_MACHINE" {
			return "CARDIO"
		}
	}
	for _, bp := range bodyParts {
		if strings.Contains(strings.ToLower(bp), "cardio") {
			return "CARDIO"
		}
	}
	for _, bp := range bodyParts {
		switch strings.ToLower(bp) {
		case "waist", "neck", "lower arms", "upper arms":
			return "BODYWEIGHT"
		}
	}
	return "STRENGTH"
}

func buildDifficulty(instructions []string) string {
	n := len(instructions)
	if n >= 6 {
		return "ADVANCED"
	}
	if n >= 4 {
		return "INTERMEDIATE"
	}
	return "BEGINNER"
}

func buildDescription(name string, bodyParts []string, muscles []muscleEntry, equip []equipEntry) string {
	var primary []string
	for _, m := range muscles {
		if m.isPrimary {
			primary = append(primary, strings.ToLower(strings.ReplaceAll(m.group, "_", " ")))
		}
	}
	muscleLabel := strings.Join(primary, " and ")
	if muscleLabel == "" && len(bodyParts) > 0 {
		muscleLabel = bodyParts[0]
	}
	if muscleLabel == "" {
		muscleLabel = "multiple muscle groups"
	}
	var req []string
	for _, e := range equip {
		if e.isRequired {
			req = append(req, strings.ToLower(strings.ReplaceAll(e.equip, "_", " ")))
		}
	}
	using := ""
	if len(req) > 0 {
		using = " using " + strings.Join(req, " and ")
	}
	return fmt.Sprintf("%s is an exercise targeting the %s%s.", name, muscleLabel, using)
}

var stepPrefix = regexp.MustCompile(`^Step:\d+\s+`)

func normalize(raw apiExercise) (exercise, bool) {
	name := strings.TrimSpace(raw.Name)
	if name == "" {
		return exercise{}, false
	}

	slug := slugify(name)
	if raw.ExerciseID != "" {
		slug = slug + "-" + raw.ExerciseID
	}

	muscles := buildMuscles(raw.TargetMuscles, raw.SecondaryMuscles)
	equip := buildEquip(raw.Equipments)

	instructions := raw.Instructions
	if len(instructions) == 0 {
		instructions = []string{"Perform the movement with controlled form and full range of motion."}
	}
	for i, ins := range instructions {
		instructions[i] = stepPrefix.ReplaceAllString(ins, "")
	}

	var variations []string
	for _, sm := range raw.SecondaryMuscles {
		if len(variations) >= 3 {
			break
		}
		variations = append(variations, sm)
	}

	return exercise{
		slug:         slug,
		name:         name,
		category:     buildCategory(raw.BodyParts, equip),
		difficulty:   buildDifficulty(raw.Instructions),
		description:  buildDescription(name, raw.BodyParts, muscles, equip),
		instructions: instructions,
		tips:         []string{"Keep core braced and maintain controlled tempo."},
		variations:   variations,
		thumbnailURL: raw.GifURL,
		muscles:      muscles,
		equipment:    equip,
	}, true
}

// ── SQL helpers ───────────────────────────────────────────────────────────────

func sqlEscape(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func sqlArray(items []string) string {
	if len(items) == 0 {
		return "ARRAY[]::text[]"
	}
	var parts []string
	for _, s := range items {
		parts = append(parts, "'"+sqlEscape(s)+"'")
	}
	return "ARRAY[" + strings.Join(parts, ",") + "]"
}

func buildSQL(exercises []exercise) string {
	var sb strings.Builder
	sb.WriteString("BEGIN;\n")

	for _, ex := range exercises {
		sb.WriteString(fmt.Sprintf(`
INSERT INTO "Exercise" (
  id, slug, name, category, difficulty, description,
  instructions, tips, variations, "videoUrl", "thumbnailUrl",
  "isActive", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  '%s', '%s', '%s'::"ExerciseCategory", '%s'::"ExerciseDifficulty",
  '%s', %s, %s, %s,
  NULL, '%s',
  true, NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  category     = EXCLUDED.category,
  difficulty   = EXCLUDED.difficulty,
  description  = EXCLUDED.description,
  instructions = EXCLUDED.instructions,
  tips         = EXCLUDED.tips,
  variations   = EXCLUDED.variations,
  "thumbnailUrl" = EXCLUDED."thumbnailUrl",
  "updatedAt"  = NOW();
`,
			sqlEscape(ex.slug),
			sqlEscape(ex.name),
			ex.category,
			ex.difficulty,
			sqlEscape(ex.description),
			sqlArray(ex.instructions),
			sqlArray(ex.tips),
			sqlArray(ex.variations),
			sqlEscape(ex.thumbnailURL),
		))

		// Muscle groups — delete+re-insert via subselect on slug
		sb.WriteString(fmt.Sprintf(`
DELETE FROM "ExerciseMuscleGroup"
WHERE "exerciseId" = (SELECT id FROM "Exercise" WHERE slug = '%s');
`, sqlEscape(ex.slug)))

		for _, m := range ex.muscles {
			sb.WriteString(fmt.Sprintf(`
INSERT INTO "ExerciseMuscleGroup" (id, "exerciseId", "muscleGroup", "isPrimary")
SELECT gen_random_uuid(), id, '%s'::"MuscleGroup", %v FROM "Exercise" WHERE slug = '%s';
`, m.group, m.isPrimary, sqlEscape(ex.slug)))
		}

		// Equipment
		sb.WriteString(fmt.Sprintf(`
DELETE FROM "ExerciseEquipment"
WHERE "exerciseId" = (SELECT id FROM "Exercise" WHERE slug = '%s');
`, sqlEscape(ex.slug)))

		for _, e := range ex.equipment {
			sb.WriteString(fmt.Sprintf(`
INSERT INTO "ExerciseEquipment" (id, "exerciseId", equipment, "isRequired")
SELECT gen_random_uuid(), id, '%s'::"Equipment", %v FROM "Exercise" WHERE slug = '%s';
`, e.equip, e.isRequired, sqlEscape(ex.slug)))
		}
	}

	sb.WriteString("COMMIT;\n")
	return sb.String()
}

// ── psql runner ───────────────────────────────────────────────────────────────

func resolvePsql() (string, error) {
	if p, err := exec.LookPath("psql"); err == nil {
		return p, nil
	}
	candidates := []string{
		"/opt/homebrew/opt/libpq/bin/psql",
		"/usr/local/opt/libpq/bin/psql",
		"/usr/local/bin/psql",
		"/usr/bin/psql",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c, nil
		}
	}
	return "", fmt.Errorf("psql not found in PATH or common locations")
}

func runSQL(psql, dbURL, sqlStr string) error {
	tmp, err := os.CreateTemp("", "seed_exercises_*.sql")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	defer os.Remove(tmp.Name())

	if _, err := tmp.WriteString(sqlStr); err != nil {
		tmp.Close()
		return fmt.Errorf("write temp file: %w", err)
	}
	tmp.Close()

	cmd := exec.Command(psql, dbURL, "-v", "ON_ERROR_STOP=1", "-f", tmp.Name())
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("psql: %w\n%s", err, stderr.String())
	}
	return nil
}

// ── API fetcher ───────────────────────────────────────────────────────────────

func fetchPage(client *http.Client, baseURL, cursor string, limit int) (*apiResponse, error) {
	u, _ := url.Parse(baseURL + "/exercises")
	q := u.Query()
	q.Set("limit", fmt.Sprintf("%d", limit))
	if cursor != "" {
		q.Set("after", cursor)
	}
	u.RawQuery = q.Encode()

	var resp *http.Response
	var err error
	for attempt := 1; attempt <= 5; attempt++ {
		resp, err = client.Get(u.String())
		if err != nil {
			return nil, fmt.Errorf("GET %s: %w", u.String(), err)
		}
		if resp.StatusCode == 429 {
			resp.Body.Close()
			wait := time.Duration(attempt*2) * time.Second
			log.Printf("rate limited — waiting %s before retry %d/5", wait, attempt)
			time.Sleep(wait)
			continue
		}
		break
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d from %s", resp.StatusCode, u.String())
	}

	var payload apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	return &payload, nil
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	dbURL := flag.String("db-url", "", "DATABASE_URL (overrides env)")
	baseURL := flag.String("base-url", "https://oss.exercisedb.dev/api/v1", "ExerciseDB OSS base URL")
	batch := flag.Int("batch", 25, "Exercises per API page (max 25)")
	dryRun := flag.Bool("dry-run", false, "Fetch and normalize without writing to DB")
	flag.Parse()

	connStr := *dbURL
	if connStr == "" {
		connStr = os.Getenv("DATABASE_URL")
	}
	if connStr == "" && !*dryRun {
		log.Fatal("--db-url or DATABASE_URL env required")
	}

	if *batch < 1 || *batch > 25 {
		*batch = 25
	}

	var psqlPath string
	if !*dryRun {
		var err error
		psqlPath, err = resolvePsql()
		if err != nil {
			log.Fatalf("psql: %v", err)
		}
	}

	client := &http.Client{Timeout: 30 * time.Second}

	// Fetch all pages
	var rawAll []apiExercise
	cursor := ""
	page := 1
	for {
		r, err := fetchPage(client, *baseURL, cursor, *batch)
		if err != nil {
			log.Fatalf("page %d: %v", page, err)
		}
		rawAll = append(rawAll, r.Data...)
		log.Printf("fetched page %d — %d/%d exercises", page, len(rawAll), r.Meta.Total)
		if !r.Meta.HasNextPage || r.Meta.NextCursor == "" {
			break
		}
		cursor = r.Meta.NextCursor
		page++
		time.Sleep(250 * time.Millisecond) // avoid 429s
	}

	log.Printf("Total fetched: %d", len(rawAll))

	// Normalize
	var exercises []exercise
	skipped := 0
	for _, raw := range rawAll {
		ex, ok := normalize(raw)
		if !ok {
			skipped++
			continue
		}
		exercises = append(exercises, ex)
	}
	log.Printf("Normalized: %d exercises (%d skipped)", len(exercises), skipped)

	if *dryRun {
		log.Println("dry-run — not writing to DB")
		for i, ex := range exercises[:min(5, len(exercises))] {
			log.Printf("  [%d] %s [%s/%s] muscles:%d equip:%d", i+1, ex.name, ex.category, ex.difficulty, len(ex.muscles), len(ex.equipment))
		}
		return
	}

	// Build and run SQL
	log.Println("Building SQL and running via psql...")
	sqlStr := buildSQL(exercises)

	if err := runSQL(psqlPath, connStr, sqlStr); err != nil {
		log.Fatalf("seed failed: %v", err)
	}

	log.Printf("Done — seeded %d exercises", len(exercises))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
