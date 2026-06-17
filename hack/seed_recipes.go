// seed_recipes.go — fetch all recipes from TheMealDB and seed into the DB.
//
// Usage (from repo root):
//
//	kubectl port-forward -n infrastructure svc/postgres 5433:5432 &
//	go run ./hack/seed_recipes.go --db-url "postgresql://user:pass@localhost:5433/varaperformance"
//
// Flags:
//
//	--db-url    DATABASE_URL override (default: DATABASE_URL env)
//	--dry-run   Fetch and normalize without writing to DB

package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

// ── TheMealDB types ───────────────────────────────────────────────────────────

type mealDBResponse struct {
	Meals []mealDBMeal `json:"meals"`
}

type mealDBMeal struct {
	IDMeal         string  `json:"idMeal"`
	StrMeal        string  `json:"strMeal"`
	StrCategory    string  `json:"strCategory"`
	StrArea        string  `json:"strArea"`
	StrInstructions string `json:"strInstructions"`
	StrMealThumb   string  `json:"strMealThumb"`
	// Dynamic ingredient/measure fields parsed separately
	Raw map[string]interface{} `json:"-"`
}

func (m *mealDBMeal) UnmarshalJSON(data []byte) error {
	type Alias mealDBMeal
	aux := &struct {
		*Alias
	}{Alias: (*Alias)(m)}
	if err := json.Unmarshal(data, aux); err != nil {
		return err
	}
	// Also capture raw map for dynamic ingredient fields
	return json.Unmarshal(data, &m.Raw)
}

func (m *mealDBMeal) ingredients() []struct{ name, measure string } {
	var result []struct{ name, measure string }
	for i := 1; i <= 20; i++ {
		name := strings.TrimSpace(fmt.Sprintf("%v", m.Raw[fmt.Sprintf("strIngredient%d", i)]))
		measure := strings.TrimSpace(fmt.Sprintf("%v", m.Raw[fmt.Sprintf("strMeasure%d", i)]))
		if name == "" || name == "<nil>" {
			continue
		}
		result = append(result, struct{ name, measure string }{name, measure})
	}
	return result
}

// ── Category mapping (mirrors seed-recipes.ts) ────────────────────────────────

var categoryMap = map[string][]string{
	"Beef":        {"entrees"},
	"Chicken":     {"entrees"},
	"Dessert":     {"desserts"},
	"Lamb":        {"entrees"},
	"Miscellaneous": {},
	"Pasta":       {"entrees"},
	"Pork":        {"entrees"},
	"Seafood":     {"entrees"},
	"Side":        {"sides"},
	"Starter":     {"appetizers"},
	"Vegan":       {"vegan", "entrees"},
	"Vegetarian":  {"vegetarian", "entrees"},
	"Breakfast":   {"breakfast"},
	"Goat":        {"entrees"},
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// deterministicUUID generates a stable UUID from a seed string using SHA-256.
func deterministicUUID(namespace, seed string) string {
	h := sha256.Sum256([]byte(namespace + ":" + seed))
	h[6] = (h[6] & 0x0f) | 0x40 // version 4 bits
	h[8] = (h[8] & 0x3f) | 0x80 // variant bits
	// Each slice passed to %x prints 2 hex chars per byte — keep exact UUID segment widths
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		h[0:4], h[4:6], h[6:8], h[8:10], h[10:16]) // 4+2+2+2+6 = 16 bytes total
}

var stepRe = regexp.MustCompile(`(?i)(?:STEP\s*\d+\s*[-–:]?\s*|\n\d+\.\s*)`)
var whitespaceRe = regexp.MustCompile(`\r?\n`)

func parseDirections(raw string) []string {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	raw = strings.ReplaceAll(raw, "\r", "\n")

	// Try numbered step split
	parts := stepRe.Split(raw, -1)
	if len(parts) > 2 {
		var result []string
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if len(p) > 10 {
				result = append(result, p)
			}
		}
		if len(result) > 0 {
			return result
		}
	}

	// Double newline split
	paragraphs := strings.Split(raw, "\n\n")
	if len(paragraphs) >= 2 {
		var result []string
		for _, p := range paragraphs {
			p = strings.TrimSpace(p)
			if len(p) > 10 {
				result = append(result, p)
			}
		}
		if len(result) > 0 {
			return result
		}
	}

	// Single newline fallback
	lines := strings.Split(raw, "\n")
	var result []string
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if len(l) > 10 {
			result = append(result, l)
		}
	}
	return result
}

func sqlEscapeStr(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func sqlArray(items []string) string {
	if len(items) == 0 {
		return "ARRAY[]::text[]"
	}
	var parts []string
	for _, s := range items {
		parts = append(parts, "'"+sqlEscapeStr(s)+"'")
	}
	return "ARRAY[" + strings.Join(parts, ",") + "]"
}

// ── API fetch ─────────────────────────────────────────────────────────────────

func fetchMealsByLetter(client *http.Client, letter string) ([]mealDBMeal, error) {
	url := fmt.Sprintf("https://www.themealdb.com/api/json/v1/1/search.php?f=%s", letter)
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	var payload mealDBResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload.Meals, nil
}

// ── psql helpers ──────────────────────────────────────────────────────────────

func resolvePsql() (string, error) {
	if p, err := exec.LookPath("psql"); err == nil {
		return p, nil
	}
	for _, c := range []string{
		"/opt/homebrew/opt/libpq/bin/psql",
		"/usr/local/opt/libpq/bin/psql",
		"/usr/local/bin/psql",
		"/usr/bin/psql",
	} {
		if _, err := os.Stat(c); err == nil {
			return c, nil
		}
	}
	return "", fmt.Errorf("psql not found")
}

func queryOne(psql, dbURL, query string) (string, error) {
	out, err := exec.Command(psql, dbURL, "-t", "-A", "-c", query).Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

func queryRows(psql, dbURL, query string) ([][]string, error) {
	out, err := exec.Command(psql, dbURL, "-t", "-A", "-F", "\t", "-c", query).Output()
	if err != nil {
		return nil, err
	}
	var rows [][]string
	for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
		if line == "" {
			continue
		}
		rows = append(rows, strings.Split(line, "\t"))
	}
	return rows, nil
}

func runSQLFile(psql, dbURL, sqlStr string) error {
	tmp, err := os.CreateTemp("", "seed_recipes_*.sql")
	if err != nil {
		return fmt.Errorf("create temp: %w", err)
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.WriteString(sqlStr); err != nil {
		tmp.Close()
		return err
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

// ── SQL generation ────────────────────────────────────────────────────────────

const defaultCalories = 50.0
const defaultProtein = 2.0
const defaultCarbs = 5.0
const defaultFat = 2.0
const defaultServings = 4

type recipeRow struct {
	meal         mealDBMeal
	recipeUUID   string
	ingredients  []ingredientRow
	categoryIDs  []string
	directions   []string
	totalCal     float64
	totalProtein float64
	totalCarbs   float64
	totalFat     float64
}

type ingredientRow struct {
	foodUUID string
	foodName string
	measure  string
	sortOrder int
}

func buildRecipes(meals []mealDBMeal, adminUserID string, catSlugToID map[string]string) []recipeRow {
	var rows []recipeRow
	for _, meal := range meals {
		if strings.TrimSpace(meal.StrMeal) == "" {
			continue
		}

		recipeUUID := deterministicUUID("recipe", strings.ToLower(meal.StrMeal))
		directions := parseDirections(meal.StrInstructions)
		if len(directions) == 0 {
			directions = []string{"Prepare all ingredients and follow the cooking method."}
		}

		rawIngredients := meal.ingredients()
		var ingRows []ingredientRow
		for i, ing := range rawIngredients {
			foodUUID := deterministicUUID("food", strings.ToLower(strings.TrimSpace(ing.name)))
			ingRows = append(ingRows, ingredientRow{
				foodUUID:  foodUUID,
				foodName:  strings.TrimSpace(ing.name),
				measure:   strings.TrimSpace(ing.measure),
				sortOrder: i,
			})
		}

		n := float64(len(ingRows))
		totalCal := n * defaultCalories
		totalProtein := n * defaultProtein
		totalCarbs := n * defaultCarbs
		totalFat := n * defaultFat

		// Resolve category IDs
		slugs := categoryMap[meal.StrCategory]
		var catIDs []string
		for _, slug := range slugs {
			if id, ok := catSlugToID[slug]; ok {
				catIDs = append(catIDs, id)
			}
		}

		rows = append(rows, recipeRow{
			meal:         meal,
			recipeUUID:   recipeUUID,
			ingredients:  ingRows,
			categoryIDs:  catIDs,
			directions:   directions,
			totalCal:     totalCal,
			totalProtein: totalProtein,
			totalCarbs:   totalCarbs,
			totalFat:     totalFat,
		})
	}
	return rows
}

func generateSQL(recipes []recipeRow, adminUserID string) string {
	var sb strings.Builder

	sb.WriteString("BEGIN;\n\n")

	// Collect unique foods
	foodSeen := map[string]string{} // uuid → name
	for _, r := range recipes {
		for _, ing := range r.ingredients {
			if _, exists := foodSeen[ing.foodUUID]; !exists {
				foodSeen[ing.foodUUID] = ing.foodName
			}
		}
	}

	// Upsert foods
	sb.WriteString("-- Foods (ingredients)\n")
	for uuid, name := range foodSeen {
		servingLabel := "1 serving of " + strings.ToLower(name)
		titleName := strings.ToUpper(name[:1]) + name[1:]
		sb.WriteString(fmt.Sprintf(
			`INSERT INTO "Food" (id, name, source, "isVerified", "servingSize", "servingUnit", "servingLabel", calories, protein, carbohydrates, fat, "createdAt", "updatedAt")
VALUES ('%s', '%s', 'SYSTEM', false, 1, 'SERVING', '%s', %v, %v, %v, %v, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`,
			uuid, sqlEscapeStr(titleName), sqlEscapeStr(servingLabel),
			defaultCalories, defaultProtein, defaultCarbs, defaultFat,
		))
	}

	sb.WriteString("\n-- Recipes, ingredients, and categories\n")
	for _, r := range recipes {
		meal := r.meal
		perServingCal := r.totalCal / float64(defaultServings)
		perServingProtein := r.totalProtein / float64(defaultServings)
		perServingCarbs := r.totalCarbs / float64(defaultServings)
		perServingFat := r.totalFat / float64(defaultServings)

		desc := fmt.Sprintf("%s %s dish", meal.StrArea, strings.ToLower(meal.StrCategory))
		imageURL := ""
		if meal.StrMealThumb != "" {
			imageURL = meal.StrMealThumb
		}

		sb.WriteString(fmt.Sprintf(`
INSERT INTO "Recipe" (id, "createdById", name, description, "imageUrl", directions, "totalServings", "isPublic", "isVerified", "totalCalories", "totalProtein", "totalCarbs", "totalFat", "perServingCalories", "perServingProtein", "perServingCarbs", "perServingFat", "createdAt", "updatedAt")
VALUES ('%s', '%s', '%s', '%s', %s, %s, %d, true, true, %.1f, %.1f, %.1f, %.1f, %.1f, %.1f, %.1f, %.1f, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`,
			r.recipeUUID,
			adminUserID,
			sqlEscapeStr(meal.StrMeal),
			sqlEscapeStr(desc),
			func() string {
				if imageURL == "" {
					return "NULL"
				}
				return "'" + sqlEscapeStr(imageURL) + "'"
			}(),
			sqlArray(r.directions),
			defaultServings,
			r.totalCal, r.totalProtein, r.totalCarbs, r.totalFat,
			perServingCal, perServingProtein, perServingCarbs, perServingFat,
		))

		// Ingredients
		for _, ing := range r.ingredients {
			totalCal := defaultCalories * 1
			totalProt := defaultProtein * 1
			totalCarbs := defaultCarbs * 1
			totalFat := defaultFat * 1
			note := ""
			if ing.measure != "" {
				note = "'" + sqlEscapeStr(ing.measure) + "'"
			} else {
				note = "NULL"
			}
			ingUUID := deterministicUUID("ingredient", r.recipeUUID+":"+ing.foodUUID)
			sb.WriteString(fmt.Sprintf(
				`INSERT INTO "RecipeIngredient" (id, "recipeId", "foodId", quantity, note, "sortOrder", "totalCalories", "totalProtein", "totalCarbs", "totalFat", "createdAt", "updatedAt")
VALUES ('%s', '%s', '%s', 1, %s, %d, %.1f, %.1f, %.1f, %.1f, NOW(), NOW())
ON CONFLICT DO NOTHING;
`,
				ingUUID, r.recipeUUID, ing.foodUUID,
				note, ing.sortOrder,
				totalCal, totalProt, totalCarbs, totalFat,
			))
		}

		// Categories
		for _, catID := range r.categoryIDs {
			sb.WriteString(fmt.Sprintf(
				`INSERT INTO "RecipeCategoryOnRecipe" ("recipeId", "recipeCategoryId", "assignedAt")
VALUES ('%s', '%s', NOW())
ON CONFLICT DO NOTHING;
`,
				r.recipeUUID, catID,
			))
		}
	}

	sb.WriteString("\nCOMMIT;\n")
	return sb.String()
}

// ── Main ──────────────────────────────────────────────────────────────────────

func main() {
	dbURL := flag.String("db-url", "", "DATABASE_URL (overrides env)")
	dryRun := flag.Bool("dry-run", false, "Fetch and normalize without writing to DB")
	flag.Parse()

	connStr := *dbURL
	if connStr == "" {
		connStr = os.Getenv("DATABASE_URL")
	}
	if connStr == "" && !*dryRun {
		log.Fatal("--db-url or DATABASE_URL env required")
	}

	var psqlPath string
	var adminUserID string
	catSlugToID := map[string]string{}

	if !*dryRun {
		var err error
		psqlPath, err = resolvePsql()
		if err != nil {
			log.Fatalf("psql: %v", err)
		}

		// Get admin user ID
		adminUserID, err = queryOne(psqlPath, connStr, `
			SELECT u.id FROM "User" u
			JOIN "UserRole" ur ON ur."userId" = u.id
			JOIN "Role" r ON r.id = ur."roleId"
			WHERE r.name = 'Administrator'
			LIMIT 1;`)
		if err != nil || adminUserID == "" {
			log.Fatal("No Administrator user found — register and promote a user first")
		}
		log.Printf("Admin user: %s", adminUserID)

		// Get recipe category slugs → IDs
		rows, err := queryRows(psqlPath, connStr, `SELECT slug, id FROM "RecipeCategory";`)
		if err != nil {
			log.Fatalf("fetch categories: %v", err)
		}
		for _, row := range rows {
			if len(row) == 2 {
				catSlugToID[row[0]] = row[1]
			}
		}
		log.Printf("Loaded %d recipe categories", len(catSlugToID))
	}

	// Fetch all meals from TheMealDB (a–z)
	client := &http.Client{Timeout: 15 * time.Second}
	var allMeals []mealDBMeal
	letters := "abcdefghijklmnopqrstuvwxyz"

	for _, letter := range letters {
		meals, err := fetchMealsByLetter(client, string(letter))
		if err != nil {
			log.Printf("  warn: letter %s: %v", string(letter), err)
		} else {
			allMeals = append(allMeals, meals...)
			log.Printf("  %s → %d meals (total: %d)", string(letter), len(meals), len(allMeals))
		}
		time.Sleep(300 * time.Millisecond)
	}
	log.Printf("Total meals fetched: %d", len(allMeals))

	if *dryRun {
		log.Println("dry-run — not writing to DB")
		for i, m := range allMeals[:min(5, len(allMeals))] {
			log.Printf("  [%d] %s (%s/%s) ingredients:%d", i+1, m.StrMeal, m.StrCategory, m.StrArea, len(m.ingredients()))
		}
		return
	}

	// Build recipe rows and generate SQL
	recipes := buildRecipes(allMeals, adminUserID, catSlugToID)
	log.Printf("Built %d recipes", len(recipes))

	log.Println("Generating SQL and seeding...")
	sqlStr := generateSQL(recipes, adminUserID)

	if err := runSQLFile(psqlPath, connStr, sqlStr); err != nil {
		log.Fatalf("seed failed: %v", err)
	}

	log.Printf("Done — seeded %d recipes", len(recipes))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
