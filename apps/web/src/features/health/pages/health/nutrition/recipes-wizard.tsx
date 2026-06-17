import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Loader2,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  useCreateFood,
  useRecipeCategories,
  useSearchFoods,
  type FoodListItem,
} from '@/features/health';
import { useCreateRecipe, useUploadRecipeImage } from '@/features/health';
import { pickImage } from '@/lib/camera';
import type {
  CreateFood,
  CreateRecipe,
  ServingUnit,
} from '@varaperformance/core';

type Step = 1 | 2 | 3;

type IngredientDraft = {
  key: string;
  food: FoodListItem;
  amount: number;
  unit: ExtendedUnit;
  quantity: number;
  note: string;
};

type ExtendedUnit = ServingUnit | 'LB';

const STEPS = [
  {
    id: 1,
    title: 'Basics',
    icon: ChefHat,
    description: 'Name, image, directions',
  },
  {
    id: 2,
    title: 'Ingredients',
    icon: ClipboardList,
    description: 'Build ingredient list',
  },
  { id: 3, title: 'Review', icon: Check, description: 'Confirm and create' },
] as const;

const INITIAL_FORM = {
  name: '',
  description: '',
  imageUrl: '',
  totalServings: 1,
  isPublic: false,
  directionsText: '',
  categoryIds: [] as string[],
};

const MASS_UNITS = new Set<ExtendedUnit>(['G', 'OZ', 'LB']);
const VOLUME_UNITS = new Set<ExtendedUnit>(['ML', 'TSP', 'TBSP', 'CUP']);
const KITCHEN_UNITS: ExtendedUnit[] = [
  'G',
  'OZ',
  'LB',
  'ML',
  'TSP',
  'TBSP',
  'CUP',
];
const SERVING_UNIT_OPTIONS: ServingUnit[] = [
  'G',
  'ML',
  'OZ',
  'CUP',
  'TBSP',
  'TSP',
  'PIECE',
  'SERVING',
  'SLICE',
  'BOWL',
  'CONTAINER',
  'SCOOP',
];

function asExtendedUnit(unit: string): ExtendedUnit {
  return unit === 'LB' ? 'LB' : (unit as ExtendedUnit);
}

function getUnitLabel(unit: ExtendedUnit | ServingUnit): string {
  const labels: Record<string, string> = {
    G: 'g',
    ML: 'mL',
    OZ: 'oz',
    LB: 'lb',
    CUP: 'cup',
    TBSP: 'Tbsp',
    TSP: 'Tsp',
    PIECE: 'piece',
    SERVING: 'serving',
    SLICE: 'slice',
    BOWL: 'bowl',
    CONTAINER: 'container',
    SCOOP: 'scoop',
  };

  return labels[unit] ?? unit;
}

function getSelectableUnits(baseUnit: ServingUnit): ExtendedUnit[] {
  const unit = asExtendedUnit(baseUnit);

  if (MASS_UNITS.has(unit)) {
    return [...KITCHEN_UNITS, 'SERVING'];
  }

  if (VOLUME_UNITS.has(unit)) {
    return [...KITCHEN_UNITS, 'SERVING'];
  }

  return [unit, 'SERVING', ...KITCHEN_UNITS];
}

function convertMass(
  value: number,
  from: ExtendedUnit,
  to: ExtendedUnit,
): number {
  const toGram: Record<ExtendedUnit, number> = {
    G: 1,
    OZ: 28.3495,
    LB: 453.592,
    ML: 1,
    TSP: 1,
    TBSP: 1,
    CUP: 1,
    PIECE: 1,
    SERVING: 1,
    SLICE: 1,
    BOWL: 1,
    CONTAINER: 1,
    SCOOP: 1,
  };

  return (value * toGram[from]) / toGram[to];
}

function convertVolume(
  value: number,
  from: ExtendedUnit,
  to: ExtendedUnit,
): number {
  const toMl: Record<ExtendedUnit, number> = {
    ML: 1,
    TSP: 4.92892,
    TBSP: 14.7868,
    CUP: 240,
    G: 1,
    OZ: 1,
    LB: 1,
    PIECE: 1,
    SERVING: 1,
    SLICE: 1,
    BOWL: 1,
    CONTAINER: 1,
    SCOOP: 1,
  };

  return (value * toMl[from]) / toMl[to];
}

function computeServingsMultiplier(
  food: FoodListItem,
  amount: number,
  unit: ExtendedUnit,
): number {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  if (safeAmount <= 0) return 0;

  if (unit === 'SERVING') {
    return safeAmount;
  }

  const baseUnit = asExtendedUnit(food.servingUnit);
  const baseSize = food.servingSize > 0 ? food.servingSize : 1;

  if (baseUnit === 'SERVING') {
    return safeAmount;
  }

  if (unit === baseUnit) {
    return safeAmount / baseSize;
  }

  if (MASS_UNITS.has(unit) && MASS_UNITS.has(baseUnit)) {
    const normalized = convertMass(safeAmount, unit, baseUnit);
    return normalized / baseSize;
  }

  if (VOLUME_UNITS.has(unit) && VOLUME_UNITS.has(baseUnit)) {
    const normalized = convertVolume(safeAmount, unit, baseUnit);
    return normalized / baseSize;
  }

  if (
    (MASS_UNITS.has(unit) || VOLUME_UNITS.has(unit)) &&
    (MASS_UNITS.has(baseUnit) || VOLUME_UNITS.has(baseUnit))
  ) {
    let normalized: number;

    if (MASS_UNITS.has(unit)) {
      const grams = convertMass(safeAmount, unit, 'G');
      normalized = MASS_UNITS.has(baseUnit)
        ? convertMass(grams, 'G', baseUnit)
        : convertVolume(grams, 'ML', baseUnit);
    } else {
      const ml = convertVolume(safeAmount, unit, 'ML');
      normalized = VOLUME_UNITS.has(baseUnit)
        ? convertVolume(ml, 'ML', baseUnit)
        : convertMass(ml, 'G', baseUnit);
    }

    return normalized / baseSize;
  }

  return safeAmount;
}

const EMPTY_CUSTOM_INGREDIENT_FORM = {
  name: '',
  brand: '',
  servingSize: 1,
  servingUnit: 'SERVING' as ServingUnit,
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
};

function macroTotal(
  ingredients: IngredientDraft[],
  field: 'calories' | 'protein' | 'carbohydrates' | 'fat',
) {
  return ingredients.reduce((sum, ingredient) => {
    return sum + ingredient.food[field] * ingredient.quantity;
  }, 0);
}

export default function RecipesWizardPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [customIngredientOpen, setCustomIngredientOpen] = useState(false);
  const [customIngredientForm, setCustomIngredientForm] = useState(
    EMPTY_CUSTOM_INGREDIENT_FORM,
  );

  const recipeCategories = useRecipeCategories();
  const categories = recipeCategories.data?.data?.items ?? [];

  const searchFoods = useSearchFoods(
    ingredientSearch,
    1,
    20,
    ingredientSearch.length >= 2,
  );

  const createRecipe = useCreateRecipe({
    onSuccess: (result) => {
      toast.success('Recipe created');
      const recipeId = result.data?.id;
      if (recipeId) {
        navigate(`/recipes/${recipeId}`);
      } else {
        navigate('/recipes');
      }
    },
    onError: (error) => toast.error(error.message || 'Failed to create recipe'),
  });

  const uploadImage = useUploadRecipeImage({
    onError: (error) => toast.error(error.message || 'Image upload failed'),
  });

  const createFood = useCreateFood({
    onSuccess: (response) => {
      const food: FoodListItem = {
        id: response.data.id,
        name: response.data.name,
        brand: response.data.brand,
        barcode: response.data.barcode,
        calories: response.data.calories,
        protein: response.data.protein,
        carbohydrates: response.data.carbohydrates,
        fat: response.data.fat,
        servingSize: response.data.servingSize,
        servingUnit: response.data.servingUnit,
        servingLabel: response.data.servingLabel,
        isVerified: response.data.isVerified,
        isPrivate: response.data.isPrivate,
        createdById: response.data.createdById,
        source: response.data.source,
      };

      addIngredient(food);
      setCustomIngredientOpen(false);
      setCustomIngredientForm(EMPTY_CUSTOM_INGREDIENT_FORM);
      toast.success('Custom ingredient created');
    },
    onError: (error) =>
      toast.error(error.message || 'Failed to create ingredient'),
  });

  const progress = (step / STEPS.length) * 100;

  const totalCalories = useMemo(
    () => macroTotal(ingredients, 'calories'),
    [ingredients],
  );
  const totalProtein = useMemo(
    () => macroTotal(ingredients, 'protein'),
    [ingredients],
  );
  const totalCarbs = useMemo(
    () => macroTotal(ingredients, 'carbohydrates'),
    [ingredients],
  );
  const totalFat = useMemo(() => macroTotal(ingredients, 'fat'), [ingredients]);

  const directionSteps = form.directionsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const perServing = {
    calories: form.totalServings > 0 ? totalCalories / form.totalServings : 0,
    protein: form.totalServings > 0 ? totalProtein / form.totalServings : 0,
    carbs: form.totalServings > 0 ? totalCarbs / form.totalServings : 0,
    fat: form.totalServings > 0 ? totalFat / form.totalServings : 0,
  };

  function addIngredient(food: FoodListItem) {
    if (ingredients.some((ingredient) => ingredient.food.id === food.id)) {
      toast.info('Ingredient already added');
      setIngredientSearch('');
      return;
    }

    const defaultUnit = asExtendedUnit(food.servingUnit);
    const defaultAmount = food.servingSize > 0 ? food.servingSize : 1;

    setIngredients((prev) => [
      ...prev,
      {
        key: `${food.id}-${Date.now()}`,
        food,
        amount: defaultAmount,
        unit: defaultUnit,
        quantity: computeServingsMultiplier(food, defaultAmount, defaultUnit),
        note: '',
      },
    ]);

    setIngredientSearch('');
  }

  function submitCustomIngredient() {
    if (!customIngredientForm.name.trim()) {
      toast.error('Ingredient name is required');
      return;
    }

    const payload: CreateFood = {
      name: customIngredientForm.name.trim(),
      brand: customIngredientForm.brand.trim() || undefined,
      servingSize:
        Number(customIngredientForm.servingSize) > 0
          ? Number(customIngredientForm.servingSize)
          : 1,
      servingUnit: customIngredientForm.servingUnit,
      calories: Math.max(0, Number(customIngredientForm.calories) || 0),
      protein: Math.max(0, Number(customIngredientForm.protein) || 0),
      carbohydrates: Math.max(
        0,
        Number(customIngredientForm.carbohydrates) || 0,
      ),
      fat: Math.max(0, Number(customIngredientForm.fat) || 0),
      isPrivate: true,
    };

    createFood.mutate(payload);
  }

  async function handleUploadImage(file: File | undefined) {
    if (!file) return;
    const uploaded = await uploadImage.mutateAsync(file);
    if (uploaded.success && uploaded.data?.url) {
      setForm((prev) => ({ ...prev, imageUrl: uploaded.data.url }));
      toast.success('Image uploaded');
    }
  }

  function nextStep() {
    if (step === 1) {
      if (!form.name.trim()) {
        toast.error('Recipe name is required');
        return;
      }
      if (!form.totalServings || Number(form.totalServings) <= 0) {
        toast.error('Total servings must be greater than 0');
        return;
      }
      if (directionSteps.length === 0) {
        toast.error('Add at least one direction step');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (ingredients.length === 0) {
        toast.error('Add at least one ingredient');
        return;
      }
      setStep(3);
    }
  }

  function previousStep() {
    setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as Step)));
  }

  function submit() {
    if (
      ingredients.length === 0 ||
      directionSteps.length === 0 ||
      !form.name.trim()
    ) {
      toast.error('Complete all required fields first');
      return;
    }

    const payload: CreateRecipe = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl || undefined,
      totalServings: Number(form.totalServings),
      isPublic: form.isPublic,
      categoryIds: form.categoryIds.length > 0 ? form.categoryIds : undefined,
      directions: directionSteps,
      ingredients: ingredients.map((ingredient, index) => ({
        foodId: ingredient.food.id,
        quantity: Number(ingredient.quantity),
        note: ingredient.note.trim() || undefined,
        sortOrder: index,
      })),
    };

    createRecipe.mutate(payload);
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link to="/recipes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipes
          </Link>
        </Button>
        <Badge variant="outline">Step {step} of 3</Badge>
      </div>

      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="relative space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Recipe Wizard
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">
              Create Recipe
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Use the guided flow to build and verify your recipe before
              publishing.
            </p>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="grid gap-2 sm:grid-cols-3">
            {STEPS.map((item) => {
              const Icon = item.icon;
              const active = step === item.id;
              const completed = step > item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 transition-all ${
                    active
                      ? 'border-primary/50 bg-primary/10'
                      : completed
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <p className="font-medium text-sm">{item.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1
              ? 'Step 1: Basics'
              : step === 2
                ? 'Step 2: Ingredients'
                : 'Step 3: Review'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Recipe Name</Label>
                  <Input
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="High-Protein Breakfast Bowl"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Total Servings</Label>
                  <Input
                    type="number"
                    min={1}
                    step={0.5}
                    value={form.totalServings}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        totalServings: Number(event.target.value) || 1,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Upload Recipe Image</Label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="max-w-sm"
                      onChange={(event) =>
                        handleUploadImage(event.target.files?.[0])
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadImage.isPending}
                      onClick={async () => {
                        const { file } = await pickImage();
                        if (file) handleUploadImage(file);
                      }}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Take Photo
                    </Button>
                    {uploadImage.isPending && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{' '}
                        Uploading
                      </span>
                    )}
                    {form.imageUrl && !uploadImage.isPending && (
                      <>
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <Camera className="h-3.5 w-3.5" /> Image ready
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, imageUrl: '' }))
                          }
                        >
                          Remove Image
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Optional short description"
                    rows={2}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Directions (one step per line)</Label>
                  <Textarea
                    value={form.directionsText}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        directionsText: event.target.value,
                      }))
                    }
                    placeholder="1. Mix dry ingredients\n2. Add liquids\n3. Bake for 20 minutes"
                    rows={7}
                  />
                </div>
              </div>

              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>Categories</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const checked = form.categoryIds.includes(cat.id);
                      return (
                        <label
                          key={cat.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            checked
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              setForm((prev) => ({
                                ...prev,
                                categoryIds: value
                                  ? [...prev.categoryIds, cat.id]
                                  : prev.categoryIds.filter(
                                      (cid) => cid !== cat.id,
                                    ),
                              }))
                            }
                          />
                          {cat.name}
                        </label>
                      );
                    })}
                  </div>
                  {form.categoryIds.length > 10 && (
                    <p className="text-xs text-destructive">
                      Maximum 10 categories allowed.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Switch
                  checked={form.isPublic}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isPublic: checked }))
                  }
                />
                <div>
                  <p className="text-sm font-medium">Make recipe public</p>
                  <p className="text-xs text-muted-foreground">
                    Public recipes can be discovered and saved by other users.
                  </p>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <Label>Search foods to add</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ingredients.length} added</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomIngredientOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Custom
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Upload className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={ingredientSearch}
                  onChange={(event) => setIngredientSearch(event.target.value)}
                  placeholder="Search foods"
                />
              </div>

              {ingredientSearch.length >= 2 && (
                <div className="rounded-lg border max-h-60 overflow-y-auto">
                  {searchFoods.isLoading ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      Searching foods...
                    </div>
                  ) : (searchFoods.data?.data?.items || []).length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      No foods found.
                    </div>
                  ) : (
                    (searchFoods.data?.data?.items || []).map((food) => (
                      <button
                        type="button"
                        key={food.id}
                        className="w-full text-left p-3 border-b last:border-b-0 hover:bg-muted/40"
                        onClick={() => addIngredient(food)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{food.name}</p>
                              {food.isVerified && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {food.protein}p / {food.carbohydrates}c /{' '}
                              {food.fat}f
                            </p>
                          </div>
                          <Badge variant="outline">{food.calories} cal</Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div
                    key={ingredient.key}
                    className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_220px_auto]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {ingredient.food.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(
                          ingredient.food.calories * ingredient.quantity,
                        )}{' '}
                        cal
                      </p>
                    </div>
                    <div className="grid gap-2 grid-cols-[minmax(96px,1fr)_110px]">
                      <Input
                        className="min-w-24"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={ingredient.amount}
                        onChange={(event) => {
                          const value = Number(event.target.value) || 0.01;
                          setIngredients((prev) =>
                            prev.map((item, itemIndex) => {
                              if (itemIndex !== index) return item;
                              const quantity = computeServingsMultiplier(
                                item.food,
                                value,
                                item.unit,
                              );
                              return { ...item, amount: value, quantity };
                            }),
                          );
                        }}
                      />
                      <Select
                        value={ingredient.unit}
                        onValueChange={(value) => {
                          const nextUnit = asExtendedUnit(value);
                          setIngredients((prev) =>
                            prev.map((item, itemIndex) => {
                              if (itemIndex !== index) return item;
                              const quantity = computeServingsMultiplier(
                                item.food,
                                item.amount,
                                nextUnit,
                              );
                              return { ...item, unit: nextUnit, quantity };
                            }),
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectableUnits(ingredient.food.servingUnit).map(
                            (unitOption) => (
                              <SelectItem key={unitOption} value={unitOption}>
                                {getUnitLabel(unitOption)}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      className="min-w-0 md:col-span-2"
                      value={ingredient.note}
                      onChange={(event) => {
                        const value = event.target.value;
                        setIngredients((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, note: value }
                              : item,
                          ),
                        );
                      }}
                      placeholder="Optional note"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:self-start"
                      onClick={() =>
                        setIngredients((prev) =>
                          prev.filter((item) => item.key !== ingredient.key),
                        )
                      }
                    >
                      <span className="text-lg leading-none">×</span>
                    </Button>
                  </div>
                ))}
              </div>

              <div
                className={cn(
                  'grid gap-2',
                  !isMobile && 'sm:grid-cols-2 lg:grid-cols-4',
                )}
              >
                <div className="rounded-lg bg-muted/40 p-2 text-sm">
                  <p className="text-muted-foreground text-xs">
                    Total Calories
                  </p>
                  <p className="font-medium">{Math.round(totalCalories)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2 text-sm">
                  <p className="text-muted-foreground text-xs">Protein</p>
                  <p className="font-medium">{Math.round(totalProtein)}g</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2 text-sm">
                  <p className="text-muted-foreground text-xs">Carbs</p>
                  <p className="font-medium">{Math.round(totalCarbs)}g</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2 text-sm">
                  <p className="text-muted-foreground text-xs">Fat</p>
                  <p className="font-medium">{Math.round(totalFat)}g</p>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div
                className={cn(
                  'grid gap-3',
                  !isMobile && 'sm:grid-cols-2 lg:grid-cols-4',
                )}
              >
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium mt-1">{form.name}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Servings</p>
                  <p className="font-medium mt-1">{form.totalServings}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Visibility</p>
                  <p className="font-medium mt-1">
                    {form.isPublic ? 'Public' : 'Private'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Ingredients</p>
                  <p className="font-medium mt-1">{ingredients.length}</p>
                </div>
              </div>

              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="Recipe preview"
                  className="h-44 w-full rounded-lg object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}

              <div
                className={cn(
                  'grid gap-2 text-sm',
                  !isMobile && 'sm:grid-cols-2 lg:grid-cols-4',
                )}
              >
                <div className="rounded-md bg-muted/40 p-2">
                  Per serving: {Math.round(perServing.calories)} cal
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  Protein: {Math.round(perServing.protein)}g
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  Carbs: {Math.round(perServing.carbs)}g
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  Fat: {Math.round(perServing.fat)}g
                </div>
              </div>

              {form.categoryIds.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.categoryIds.map((cid) => {
                      const cat = categories.find((c) => c.id === cid);
                      return cat ? (
                        <Badge key={cid} variant="secondary">
                          {cat.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-2">Directions</p>
                <ol className="space-y-1 text-sm list-decimal pl-5">
                  {directionSteps.map((line, index) => (
                    <li key={`${index}-${line}`}>{line}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={customIngredientOpen}
        onOpenChange={setCustomIngredientOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Ingredient</DialogTitle>
            <DialogDescription>
              Add an ingredient if you cannot find it in search.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={customIngredientForm.name}
                onChange={(event) =>
                  setCustomIngredientForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Custom ingredient name"
              />
            </div>

            <div className="space-y-2">
              <Label>Brand (optional)</Label>
              <Input
                value={customIngredientForm.brand}
                onChange={(event) =>
                  setCustomIngredientForm((prev) => ({
                    ...prev,
                    brand: event.target.value,
                  }))
                }
                placeholder="Brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Serving Size</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={customIngredientForm.servingSize}
                  onChange={(event) =>
                    setCustomIngredientForm((prev) => ({
                      ...prev,
                      servingSize: Number(event.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Serving Unit</Label>
                <Select
                  value={customIngredientForm.servingUnit}
                  onValueChange={(value) =>
                    setCustomIngredientForm((prev) => ({
                      ...prev,
                      servingUnit: value as ServingUnit,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVING_UNIT_OPTIONS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {getUnitLabel(unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Calories</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={customIngredientForm.calories}
                  onChange={(event) =>
                    setCustomIngredientForm((prev) => ({
                      ...prev,
                      calories: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={customIngredientForm.protein}
                  onChange={(event) =>
                    setCustomIngredientForm((prev) => ({
                      ...prev,
                      protein: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Carbs (g)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={customIngredientForm.carbohydrates}
                  onChange={(event) =>
                    setCustomIngredientForm((prev) => ({
                      ...prev,
                      carbohydrates: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Fat (g)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={customIngredientForm.fat}
                  onChange={(event) =>
                    setCustomIngredientForm((prev) => ({
                      ...prev,
                      fat: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomIngredientOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitCustomIngredient}
              disabled={createFood.isPending}
            >
              {createFood.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create & Add'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="sticky bottom-4 z-10">
        <Card className="shadow-lg">
          <CardContent className="py-3 flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={step === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {step < 3 ? (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={createRecipe.isPending}>
                {createRecipe.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Recipe
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
