package main

import (
	"bufio"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"
)

// USDA nutrient IDs we care about.
const (
	nutrientEnergy       = 1008
	nutrientEnergyAGF    = 2047
	nutrientProtein      = 1003
	nutrientCarbs        = 1005
	nutrientFat          = 1004
	nutrientFiber        = 1079
	nutrientSugar        = 2000
	nutrientSaturatedFat = 1258
	nutrientSodium       = 1093
	nutrientCholesterol  = 1253
)

var keepDataTypes = map[string]bool{
	"foundation_food":   true,
	"sr_legacy_food":    true,
	"branded_food":      true,
	"survey_fndds_food": true,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type macros struct {
	Calories, Protein, Carbs, Fat float64
	Fiber, Sugar, SaturatedFat    float64
	Sodium, Cholesterol           float64
	HasFiber, HasSugar, HasSatFat bool
	HasSodium, HasChol            bool
}

type foodRow struct {
	FdcID    int
	DataType string
	Name     string
}

type brandedRow struct {
	BrandOwner, BrandName string
	Barcode               string
	ServingSize           float64
	ServingSizeUnit       string
	HouseholdServing      string
	Discontinued          bool
}

type portionRow struct {
	Amount      float64
	UnitID      int
	Description string
	Modifier    string
	GramWeight  float64
}

type seedFood struct {
	Name          string   `json:"name"`
	Brand         *string  `json:"brand,omitempty"`
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

type extractStats struct {
	usdaFoods, usdaNutrientRows, usdaBranded, usdaPortions int
	usdaKept, usdaNoServing, usdaNoMacros                  int
	usdaAtwaterFail, usdaZeroCalFix                        int
	offLoaded, offKept, offDupBarcode                      int
	offNoServing, offAtwaterFail, offZeroCalFix            int
	totalWritten                                           int
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

func main() {
	usdaDir := flag.String("usda-dir", "hack/usda_data/FoodData_Central_csv_2025-12-18", "USDA FDC CSV directory")
	offJSONL := flag.String("off-jsonl", "hack/openfoodfacts-us-foods.jsonl", "OFF JSONL file")
	output := flag.String("output", "hack/foods.jsonl", "Output JSONL path")
	progressEvery := flag.Int("progress", 100000, "Progress interval")
	flag.Parse()

	if err := run(*usdaDir, *offJSONL, *output, *progressEvery); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run(usdaDir, offJSONL, output string, prog int) error {
	st := &extractStats{}

	// Phase 1: food.csv
	fmt.Fprintf(os.Stderr, "[1/7] Loading food.csv...\n")
	foods, err := loadFoods(filepath.Join(usdaDir, "food.csv"))
	if err != nil {
		return fmt.Errorf("load foods: %w", err)
	}
	st.usdaFoods = len(foods)
	fmt.Fprintf(os.Stderr, "  %d foods\n", st.usdaFoods)

	// Phase 2: food_nutrient.csv (27M rows)
	fmt.Fprintf(os.Stderr, "[2/7] Loading food_nutrient.csv...\n")
	nutMap, scanned, err := loadNutrients(filepath.Join(usdaDir, "food_nutrient.csv"), foods, prog)
	if err != nil {
		return fmt.Errorf("load nutrients: %w", err)
	}
	st.usdaNutrientRows = scanned
	fmt.Fprintf(os.Stderr, "  scanned %d rows, nutrients for %d foods\n", scanned, len(nutMap))

	// Phase 3: branded_food.csv
	fmt.Fprintf(os.Stderr, "[3/7] Loading branded_food.csv...\n")
	branded, err := loadBranded(filepath.Join(usdaDir, "branded_food.csv"))
	if err != nil {
		return fmt.Errorf("load branded: %w", err)
	}
	st.usdaBranded = len(branded)
	fmt.Fprintf(os.Stderr, "  %d branded entries\n", st.usdaBranded)

	// Phase 4: food_portion.csv
	fmt.Fprintf(os.Stderr, "[4/7] Loading food_portion.csv...\n")
	portions, err := loadPortions(filepath.Join(usdaDir, "food_portion.csv"), foods)
	if err != nil {
		return fmt.Errorf("load portions: %w", err)
	}
	st.usdaPortions = len(portions)
	fmt.Fprintf(os.Stderr, "  portions for %d foods\n", st.usdaPortions)

	// Phase 5: measure_unit.csv
	fmt.Fprintf(os.Stderr, "[5/7] Loading measure_unit.csv...\n")
	measureUnits, err := loadMeasureUnits(filepath.Join(usdaDir, "measure_unit.csv"))
	if err != nil {
		return fmt.Errorf("load measure units: %w", err)
	}
	fmt.Fprintf(os.Stderr, "  %d units\n", len(measureUnits))

	// Phase 6: Build USDA seed foods
	fmt.Fprintf(os.Stderr, "[6/7] Building USDA seed foods...\n")
	usdaSeeds := make([]seedFood, 0, len(foods))
	usdaBarcodes := make(map[string]bool)

	for fdcID, food := range foods {
		nut, ok := nutMap[fdcID]
		if !ok {
			st.usdaNoMacros++
			continue
		}

		var sf seedFood
		sf.Name = cleanName(food.Name)
		sf.Source = "USDA"
		sf.IsVerified = true

		if food.DataType == "branded_food" {
			bi, has := branded[fdcID]
			if !has || bi.ServingSize <= 0 || bi.Discontinued {
				st.usdaNoServing++
				continue
			}
			if bi.Barcode != "" {
				sf.Barcode = bi.Barcode
			} else {
				sf.Barcode = fmt.Sprintf("fdc-%d", fdcID)
			}
			if bi.BrandOwner != "" {
				b := cleanName(bi.BrandOwner)
				sf.Brand = &b
			} else if bi.BrandName != "" {
				b := cleanName(bi.BrandName)
				sf.Brand = &b
			}
			gramEquiv := unitToGrams(bi.ServingSizeUnit, bi.ServingSize)
			sf.ServingSize = roundTo(bi.ServingSize, 2)
			sf.ServingUnit = mapUSDAUnit(bi.ServingSizeUnit)
			sf.ServingLabel = bi.HouseholdServing
			scaleMacros(nut, gramEquiv/100.0)
		} else {
			sf.Barcode = fmt.Sprintf("fdc-%d", fdcID)
			port, has := portions[fdcID]
			if !has || port.GramWeight <= 0 {
				sf.ServingSize = 100
				sf.ServingUnit = "G"
				sf.ServingLabel = "100 g"
			} else {
				sf.ServingSize = roundTo(port.GramWeight, 2)
				sf.ServingUnit = "G"
				sf.ServingLabel = buildPortionLabel(port, measureUnits)
				scaleMacros(nut, port.GramWeight/100.0)
			}
		}

		fixed, valid := atwaterCheck(nut.Calories, nut.Protein, nut.Carbs, nut.Fat)
		if !valid {
			st.usdaAtwaterFail++
			continue
		}
		if fixed != nut.Calories {
			st.usdaZeroCalFix++
			nut.Calories = fixed
		}

		sf.Calories = roundTo(nut.Calories, 2)
		sf.Protein = roundTo(nut.Protein, 2)
		sf.Carbohydrates = roundTo(nut.Carbs, 2)
		sf.Fat = roundTo(nut.Fat, 2)
		if nut.HasFiber {
			v := roundTo(nut.Fiber, 2)
			sf.Fiber = &v
		}
		if nut.HasSugar {
			v := roundTo(nut.Sugar, 2)
			sf.Sugar = &v
		}
		if nut.HasSatFat {
			v := roundTo(nut.SaturatedFat, 2)
			sf.SaturatedFat = &v
		}
		if nut.HasSodium {
			v := roundTo(nut.Sodium, 2)
			sf.Sodium = &v
		}
		if nut.HasChol {
			v := roundTo(nut.Cholesterol, 2)
			sf.Cholesterol = &v
		}
		if sf.Name == "" {
			continue
		}

		// Deduplicate barcodes within USDA (same UPC, different formulations)
		if usdaBarcodes[sf.Barcode] {
			continue
		}
		usdaSeeds = append(usdaSeeds, sf)
		usdaBarcodes[sf.Barcode] = true
	}
	st.usdaKept = len(usdaSeeds)
	fmt.Fprintf(os.Stderr, "  kept=%d noMacros=%d noServing=%d atwaterFail=%d zeroCalFix=%d\n",
		st.usdaKept, st.usdaNoMacros, st.usdaNoServing, st.usdaAtwaterFail, st.usdaZeroCalFix)

	// Phase 7: OFF JSONL cross-reference
	fmt.Fprintf(os.Stderr, "[7/7] Loading OFF JSONL...\n")
	offSeeds, err := loadAndFilterOFF(offJSONL, usdaBarcodes, st, prog)
	if err != nil {
		return fmt.Errorf("load OFF: %w", err)
	}
	fmt.Fprintf(os.Stderr, "  OFF: loaded=%d kept=%d dup=%d noServing=%d atwaterFail=%d zeroCalFix=%d\n",
		st.offLoaded, st.offKept, st.offDupBarcode, st.offNoServing, st.offAtwaterFail, st.offZeroCalFix)

	// Write output
	if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
		return fmt.Errorf("mkdir: %w", err)
	}
	outFile, err := os.Create(output)
	if err != nil {
		return fmt.Errorf("create output: %w", err)
	}
	defer outFile.Close()

	w := bufio.NewWriterSize(outFile, 256*1024)
	enc := json.NewEncoder(w)
	for i := range usdaSeeds {
		if err := enc.Encode(&usdaSeeds[i]); err != nil {
			return err
		}
	}
	for i := range offSeeds {
		if err := enc.Encode(&offSeeds[i]); err != nil {
			return err
		}
	}
	if err := w.Flush(); err != nil {
		return err
	}

	st.totalWritten = st.usdaKept + st.offKept
	fmt.Printf("\n=== Extract complete ===\n")
	fmt.Printf("USDA foods loaded:      %d\n", st.usdaFoods)
	fmt.Printf("USDA nutrient rows:     %d\n", st.usdaNutrientRows)
	fmt.Printf("USDA kept:              %d\n", st.usdaKept)
	fmt.Printf("USDA no macros:         %d\n", st.usdaNoMacros)
	fmt.Printf("USDA no serving:        %d\n", st.usdaNoServing)
	fmt.Printf("USDA Atwater fail:      %d\n", st.usdaAtwaterFail)
	fmt.Printf("USDA zero-cal fixed:    %d\n", st.usdaZeroCalFix)
	fmt.Printf("OFF loaded:             %d\n", st.offLoaded)
	fmt.Printf("OFF kept:               %d\n", st.offKept)
	fmt.Printf("OFF dup barcode (USDA): %d\n", st.offDupBarcode)
	fmt.Printf("OFF no serving:         %d\n", st.offNoServing)
	fmt.Printf("OFF Atwater fail:       %d\n", st.offAtwaterFail)
	fmt.Printf("OFF zero-cal fixed:     %d\n", st.offZeroCalFix)
	fmt.Printf("Total written:          %d\n", st.totalWritten)
	fmt.Printf("Output: %s\n", output)
	return nil
}

// ---------------------------------------------------------------------------
// CSV loaders
// ---------------------------------------------------------------------------

func loadFoods(path string) (map[int]foodRow, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	r := csv.NewReader(bufio.NewReaderSize(f, 256*1024))
	r.LazyQuotes = true
	r.ReuseRecord = true
	hdr, err := r.Read()
	if err != nil {
		return nil, err
	}
	idx := colIdx(hdr, "fdc_id", "data_type", "description")
	foods := make(map[int]foodRow, 2100000)
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		dt := uq(rec[idx["data_type"]])
		if !keepDataTypes[dt] {
			continue
		}
		id, _ := strconv.Atoi(uq(rec[idx["fdc_id"]]))
		if id == 0 {
			continue
		}
		foods[id] = foodRow{FdcID: id, DataType: dt, Name: uq(rec[idx["description"]])}
	}
	return foods, nil
}

func loadNutrients(path string, foods map[int]foodRow, prog int) (map[int]*macros, int, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, 0, err
	}
	defer f.Close()
	r := csv.NewReader(bufio.NewReaderSize(f, 1024*1024))
	r.LazyQuotes = true
	r.ReuseRecord = true
	hdr, err := r.Read()
	if err != nil {
		return nil, 0, err
	}
	idx := colIdx(hdr, "fdc_id", "nutrient_id", "amount")
	want := map[int]bool{
		nutrientEnergy: true, nutrientEnergyAGF: true,
		nutrientProtein: true, nutrientCarbs: true, nutrientFat: true,
		nutrientFiber: true, nutrientSugar: true, nutrientSaturatedFat: true,
		nutrientSodium: true, nutrientCholesterol: true,
	}
	result := make(map[int]*macros, len(foods))
	n := 0
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		n++
		if prog > 0 && n%prog == 0 {
			fmt.Fprintf(os.Stderr, "  nutrient rows: %d\n", n)
		}
		fid, _ := strconv.Atoi(uq(rec[idx["fdc_id"]]))
		if _, ok := foods[fid]; !ok {
			continue
		}
		nid, _ := strconv.Atoi(uq(rec[idx["nutrient_id"]]))
		if !want[nid] {
			continue
		}
		amt, _ := strconv.ParseFloat(uq(rec[idx["amount"]]), 64)
		if math.IsNaN(amt) || math.IsInf(amt, 0) || amt < 0 {
			continue
		}
		m, ok := result[fid]
		if !ok {
			m = &macros{}
			result[fid] = m
		}
		switch nid {
		case nutrientEnergyAGF:
			m.Calories = amt
		case nutrientEnergy:
			if m.Calories == 0 {
				m.Calories = amt
			}
		case nutrientProtein:
			m.Protein = amt
		case nutrientCarbs:
			m.Carbs = amt
		case nutrientFat:
			m.Fat = amt
		case nutrientFiber:
			m.Fiber = amt
			m.HasFiber = true
		case nutrientSugar:
			m.Sugar = amt
			m.HasSugar = true
		case nutrientSaturatedFat:
			m.SaturatedFat = amt
			m.HasSatFat = true
		case nutrientSodium:
			m.Sodium = amt
			m.HasSodium = true
		case nutrientCholesterol:
			m.Cholesterol = amt
			m.HasChol = true
		}
	}
	return result, n, nil
}

func loadBranded(path string) (map[int]brandedRow, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	r := csv.NewReader(bufio.NewReaderSize(f, 256*1024))
	r.LazyQuotes = true
	r.ReuseRecord = true
	hdr, err := r.Read()
	if err != nil {
		return nil, err
	}
	idx := colIdx(hdr, "fdc_id", "brand_owner", "brand_name", "gtin_upc",
		"serving_size", "serving_size_unit", "household_serving_fulltext", "discontinued_date")
	result := make(map[int]brandedRow, 2000000)
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		id, _ := strconv.Atoi(uq(rec[idx["fdc_id"]]))
		if id == 0 {
			continue
		}
		ss, _ := strconv.ParseFloat(uq(rec[idx["serving_size"]]), 64)
		result[id] = brandedRow{
			BrandOwner:       uq(rec[idx["brand_owner"]]),
			BrandName:        uq(rec[idx["brand_name"]]),
			Barcode:          uq(rec[idx["gtin_upc"]]),
			ServingSize:      ss,
			ServingSizeUnit:  uq(rec[idx["serving_size_unit"]]),
			HouseholdServing: uq(rec[idx["household_serving_fulltext"]]),
			Discontinued:     uq(rec[idx["discontinued_date"]]) != "",
		}
	}
	return result, nil
}

func loadPortions(path string, foods map[int]foodRow) (map[int]portionRow, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	r := csv.NewReader(bufio.NewReaderSize(f, 256*1024))
	r.LazyQuotes = true
	r.ReuseRecord = true
	hdr, err := r.Read()
	if err != nil {
		return nil, err
	}
	idx := colIdx(hdr, "fdc_id", "amount", "measure_unit_id", "portion_description", "modifier", "gram_weight")
	best := make(map[int]portionRow, 20000)
	isServ := make(map[int]bool, 20000)
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		fid, _ := strconv.Atoi(uq(rec[idx["fdc_id"]]))
		if _, ok := foods[fid]; !ok {
			continue
		}
		gw, _ := strconv.ParseFloat(uq(rec[idx["gram_weight"]]), 64)
		if gw <= 0 {
			continue
		}
		amt, _ := strconv.ParseFloat(uq(rec[idx["amount"]]), 64)
		uid, _ := strconv.Atoi(uq(rec[idx["measure_unit_id"]]))
		mod := uq(rec[idx["modifier"]])
		desc := uq(rec[idx["portion_description"]])
		port := portionRow{Amount: amt, UnitID: uid, Description: desc, Modifier: mod, GramWeight: gw}
		serving := strings.Contains(strings.ToLower(mod), "serving")
		prev, exists := best[fid]
		if !exists {
			best[fid] = port
			isServ[fid] = serving
		} else if serving && !isServ[fid] {
			best[fid] = port
			isServ[fid] = true
		} else if !isServ[fid] && gw < prev.GramWeight {
			best[fid] = port
		}
	}
	return best, nil
}

func loadMeasureUnits(path string) (map[int]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	r := csv.NewReader(bufio.NewReaderSize(f, 32*1024))
	r.LazyQuotes = true
	hdr, err := r.Read()
	if err != nil {
		return nil, err
	}
	idx := colIdx(hdr, "id", "name")
	result := make(map[int]string, 200)
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}
		id, _ := strconv.Atoi(uq(rec[idx["id"]]))
		result[id] = uq(rec[idx["name"]])
	}
	return result, nil
}

// ---------------------------------------------------------------------------
// OFF loader
// ---------------------------------------------------------------------------

func loadAndFilterOFF(path string, usdaBarcodes map[string]bool, st *extractStats, prog int) ([]seedFood, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "  OFF not found, skipping\n")
			return nil, nil
		}
		return nil, err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 1024*1024), 32*1024*1024)
	var result []seedFood
	seen := make(map[string]bool)
	for sc.Scan() {
		st.offLoaded++
		if prog > 0 && st.offLoaded%prog == 0 {
			fmt.Fprintf(os.Stderr, "  OFF: loaded=%d kept=%d\n", st.offLoaded, st.offKept)
		}
		var it seedFood
		if err := json.Unmarshal(sc.Bytes(), &it); err != nil {
			continue
		}
		if it.ServingUnit == "G" && it.ServingSize == 100 &&
			(it.ServingLabel == "100g" || it.ServingLabel == "100 g" || it.ServingLabel == "") {
			st.offNoServing++
			continue
		}
		if it.Barcode != "" {
			if seen[it.Barcode] || usdaBarcodes[it.Barcode] {
				st.offDupBarcode++
				continue
			}
			seen[it.Barcode] = true
		}
		fixed, valid := atwaterCheck(it.Calories, it.Protein, it.Carbohydrates, it.Fat)
		if !valid {
			st.offAtwaterFail++
			continue
		}
		if fixed != it.Calories {
			st.offZeroCalFix++
			it.Calories = roundTo(fixed, 2)
		}
		it.Source = "OPENFOOD"
		it.IsVerified = false
		result = append(result, it)
		st.offKept++
	}
	return result, sc.Err()
}

// ---------------------------------------------------------------------------
// Atwater validation
// ---------------------------------------------------------------------------

func atwaterCheck(cal, protein, carbs, fat float64) (float64, bool) {
	computed := 4*protein + 4*carbs + 9*fat
	if computed < 1 && cal < 1 {
		return 0, false
	}
	if cal < 1 && computed >= 5 {
		return roundTo(computed, 2), true
	}
	if computed < 5 {
		return cal, true
	}
	ratio := cal / computed
	if ratio < 0.4 || ratio > 2.5 {
		return 0, false
	}
	return cal, true
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func scaleMacros(m *macros, ratio float64) {
	m.Calories *= ratio
	m.Protein *= ratio
	m.Carbs *= ratio
	m.Fat *= ratio
	m.Fiber *= ratio
	m.Sugar *= ratio
	m.SaturatedFat *= ratio
	m.Sodium *= ratio
	m.Cholesterol *= ratio
}

func unitToGrams(unit string, size float64) float64 {
	switch strings.ToLower(strings.TrimSpace(unit)) {
	case "g", "grm", "gram", "grams":
		return size
	case "ml", "mlt", "milliliter", "milliliters":
		return size
	case "oz", "ounce", "ounces":
		return size * 28.3495
	case "lb":
		return size * 453.592
	default:
		return size
	}
}

func mapUSDAUnit(unit string) string {
	switch strings.ToLower(strings.TrimSpace(unit)) {
	case "g", "grm", "gram", "grams":
		return "G"
	case "ml", "mlt", "milliliter", "milliliters":
		return "ML"
	case "oz", "ounce", "ounces":
		return "OZ"
	case "cup", "cups":
		return "CUP"
	case "tbsp", "tablespoon":
		return "TBSP"
	case "tsp", "teaspoon":
		return "TSP"
	default:
		return "G"
	}
}

func buildPortionLabel(p portionRow, units map[int]string) string {
	var parts []string
	if p.Amount > 0 {
		if p.Amount == float64(int(p.Amount)) {
			parts = append(parts, strconv.Itoa(int(p.Amount)))
		} else {
			parts = append(parts, strconv.FormatFloat(p.Amount, 'f', 1, 64))
		}
	}
	u := units[p.UnitID]
	if u != "" && u != "undetermined" {
		parts = append(parts, u)
	}
	if p.Modifier != "" {
		parts = append(parts, p.Modifier)
	} else if p.Description != "" {
		parts = append(parts, p.Description)
	}
	if len(parts) == 0 {
		return fmt.Sprintf("%.0f g", p.GramWeight)
	}
	return strings.Join(parts, " ") + fmt.Sprintf(" (%.0fg)", p.GramWeight)
}

func cleanName(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}
	upper, total := 0, 0
	for _, r := range s {
		if unicode.IsLetter(r) {
			total++
			if unicode.IsUpper(r) {
				upper++
			}
		}
	}
	if total > 3 && float64(upper)/float64(total) > 0.6 {
		return smartTitle(s)
	}
	return s
}

func smartTitle(s string) string {
	words := strings.Fields(strings.ToLower(s))
	for i, w := range words {
		runes := []rune(w)
		if len(runes) > 0 {
			runes[0] = unicode.ToUpper(runes[0])
			words[i] = string(runes)
		}
	}
	return strings.Join(words, " ")
}

func colIdx(header []string, cols ...string) map[string]int {
	idx := make(map[string]int, len(cols))
	for i, h := range header {
		h = uq(h)
		for _, c := range cols {
			if strings.EqualFold(h, c) {
				idx[c] = i
			}
		}
	}
	return idx
}

func uq(s string) string {
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		return s[1 : len(s)-1]
	}
	return s
}

func roundTo(v float64, d int) float64 {
	p := math.Pow(10, float64(d))
	return math.Round(v*p) / p
}
