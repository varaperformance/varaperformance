import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Heart,
  Loader2,
  Pencil,
  Plus,
  Camera,
  Share2,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth';
import {
  useCreateFood,
  useRecipeCategories,
  useSearchFoods,
  type FoodListItem,
} from '@/features/health';
import {
  useDeleteRecipe,
  useLogRecipeToDiary,
  useRecipe,
  useSaveRecipe,
  useSeedFromRecipe,
  useUnsaveRecipe,
  useUpdateRecipe,
  useUploadRecipeImage,
  type MealType,
} from '@/features/health';
import { pickImage } from '@/lib/camera';
import { shareContent, canShare } from '@/lib/share';
import { buildDeepLinkUrl } from '@/lib/deep-links';
import type {
  CreateFood,
  ServingUnit,
  UpdateRecipe,
} from '@varaperformance/core';

type IngredientDraft = {
  key: string;
  food: FoodListItem;
  amount: number;
  unit: ExtendedUnit;
  quantity: number;
  note: string;
};

type ExtendedUnit = ServingUnit | 'LB';

const EMPTY_FORM = {
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

const buildElevateRecipePayload = (recipe: {
  id: string;
  name: string;
  perServing: { calories: number };
  totalServings: number;
  imageUrl?: string | null;
  isPublic: boolean;
}): string => {
  const payload = [
    {
      recipeId: recipe.id,
      name: recipe.name,
      caloriesPerServing: recipe.perServing.calories,
      totalServings: recipe.totalServings,
      imageUrl: recipe.imageUrl ?? null,
      visibilityLabel: recipe.isPublic ? 'Public' : 'Private',
    },
  ];

  return encodeURIComponent(JSON.stringify(payload));
};

export default function RecipeDetailPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { user } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);
  const [customIngredientOpen, setCustomIngredientOpen] = useState(false);
  const [customIngredientForm, setCustomIngredientForm] = useState(
    EMPTY_CUSTOM_INGREDIENT_FORM,
  );
  const [form, setForm] = useState(EMPTY_FORM);

  const [logMealType, setLogMealType] = useState<MealType>('BREAKFAST');
  const [logServings, setLogServings] = useState(1);
  const [logNote, setLogNote] = useState('');

  const recipeQuery = useRecipe(id, !!id);
  const recipe = recipeQuery.data?.data;
  const isOwner = !!recipe && recipe.createdById === user?.sub;

  const searchedFoodsQuery = useSearchFoods(
    ingredientSearch,
    1,
    20,
    editOpen && ingredientSearch.length >= 2,
  );

  const recipeCategories = useRecipeCategories();
  const allCategories = recipeCategories.data?.data?.items ?? [];

  const saveRecipe = useSaveRecipe({
    onSuccess: () => toast.success('Recipe saved'),
    onError: (error) => toast.error(error.message || 'Failed to save recipe'),
  });

  const unsaveRecipe = useUnsaveRecipe({
    onSuccess: () => toast.success('Recipe removed from saved'),
    onError: (error) => toast.error(error.message || 'Failed to unsave recipe'),
  });

  const logRecipe = useLogRecipeToDiary({
    onSuccess: () => toast.success('Recipe logged to diary'),
    onError: (error) => toast.error(error.message || 'Failed to log recipe'),
  });

  const updateRecipe = useUpdateRecipe({
    onSuccess: () => {
      toast.success('Recipe updated');
      setEditOpen(false);
    },
    onError: (error) => toast.error(error.message || 'Failed to update recipe'),
  });

  const deleteRecipe = useDeleteRecipe({
    onSuccess: () => {
      toast.success('Recipe deleted');
      navigate('/recipes');
    },
    onError: (error) => toast.error(error.message || 'Failed to delete recipe'),
  });

  const uploadRecipeImage = useUploadRecipeImage({
    onError: (error) => toast.error(error.message || 'Image upload failed'),
  });

  const seedFromRecipe = useSeedFromRecipe({
    onSuccess: (data) => {
      toast.success('Grocery list created', {
        action: {
          label: 'View',
          onClick: () => navigate(`/grocery-lists?id=${data.data.id}`),
        },
      });
    },
    onError: (error) =>
      toast.error(error.message || 'Failed to create grocery list'),
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

  function openEdit() {
    if (!recipe) return;

    setForm({
      name: recipe.name,
      description: recipe.description || '',
      imageUrl: recipe.imageUrl || '',
      totalServings: recipe.totalServings,
      isPublic: recipe.isPublic,
      directionsText: recipe.directions.join('\n'),
      categoryIds: recipe.categories.map((c) => c.id),
    });

    setIngredients(
      recipe.ingredients.map((ingredient) => ({
        key: ingredient.id,
        food: ingredient.food,
        amount: ingredient.quantity * ingredient.food.servingSize,
        unit: asExtendedUnit(ingredient.food.servingUnit),
        quantity: ingredient.quantity,
        note: ingredient.note || '',
      })),
    );

    setIngredientSearch('');
    setEditOpen(true);
  }

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

  function submitEdit() {
    if (!id) return;

    const directions = form.directionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!form.name.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('Add at least one ingredient');
      return;
    }

    if (directions.length === 0) {
      toast.error('Add at least one direction step');
      return;
    }

    const payload: UpdateRecipe = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      totalServings: Number(form.totalServings),
      isPublic: form.isPublic,
      categoryIds: form.categoryIds.length > 0 ? form.categoryIds : undefined,
      directions,
      ingredients: ingredients.map((ingredient, index) => ({
        foodId: ingredient.food.id,
        quantity: Number(ingredient.quantity),
        note: ingredient.note.trim() || undefined,
        sortOrder: index,
      })),
    };

    updateRecipe.mutate({ id, data: payload });
  }

  async function handleUploadImage(file: File | undefined) {
    if (!file) return;

    const uploaded = await uploadRecipeImage.mutateAsync(file);
    if (uploaded.success && uploaded.data?.url) {
      setForm((prev) => ({ ...prev, imageUrl: uploaded.data.url }));
      toast.success('Image uploaded');
    }
  }

  function submitLog() {
    if (!id) return;

    logRecipe.mutate({
      id,
      data: {
        mealType: logMealType,
        servings: Number(logServings),
        note: logNote.trim() || undefined,
      },
    });
  }

  function shareToElevate() {
    if (!recipe) {
      return;
    }

    const payload = buildElevateRecipePayload(recipe);
    navigate(`/elevate?compose=1&recipe=${payload}`);
    toast.success('Recipe attached to Elevate composer');
  }

  if (recipeQuery.isLoading) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-lg font-semibold">Recipe not found</p>
            <p className="text-sm text-muted-foreground">
              It may be private or no longer available.
            </p>
            <Button asChild>
              <Link to="/recipes">Back to Recipes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full pb-28 xl:pb-6">
      {/* ── Full-bleed Hero ────────────────────────────────── */}
      <div className="relative">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="h-64 sm:h-80 w-full object-cover"
          />
        ) : (
          <div className="h-52 w-full bg-linear-to-br from-muted/70 to-muted/30" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />

        {/* Overlay action bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <Button
            variant="secondary"
            size="sm"
            className="backdrop-blur-sm bg-background/60"
            asChild
          >
            <Link to="/recipes">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={recipe.isPublic ? 'secondary' : 'outline'}
              className="backdrop-blur-sm bg-background/60"
            >
              {recipe.isPublic ? 'Public' : 'Private'}
            </Badge>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 backdrop-blur-sm bg-background/60"
              onClick={shareToElevate}
              title="Share to Elevate"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            {canShare() && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 backdrop-blur-sm bg-background/60"
                title="Share"
                onClick={async () => {
                  const url = buildDeepLinkUrl(`/recipes/${id}`);
                  const shared = await shareContent({
                    title: recipe.name,
                    text:
                      recipe.description ||
                      `Check out this recipe: ${recipe.name}`,
                    url,
                    imageUrl: recipe.imageUrl ?? undefined,
                  });
                  if (!shared) toast.error('Unable to share');
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            {isOwner && (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 backdrop-blur-sm bg-background/60"
                onClick={openEdit}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {isOwner && (
              <Button
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => setDeleteOpen(true)}
                disabled={deleteRecipe.isPending}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            {recipe.name}
            {recipe.isVerified && (
              <BadgeCheck className="h-6 w-6 text-blue-500 shrink-0" />
            )}
          </h1>
          {recipe.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              {recipe.description}
            </p>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 space-y-6 mt-5">
        {/* ── Compact Macro Pills ────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1.5 text-sm">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{recipe.totalServings}</span>
            <span className="text-muted-foreground">servings</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-3 py-1.5 text-sm">
            <span className="font-medium">
              {Math.round(recipe.perServing.calories)}
            </span>
            <span className="text-muted-foreground">cal</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-3 py-1.5 text-sm">
            <span className="font-medium">
              {Math.round(recipe.perServing.protein)}g
            </span>
            <span className="text-muted-foreground">protein</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-3 py-1.5 text-sm">
            <span className="font-medium">
              {Math.round(recipe.perServing.carbs)}g
            </span>
            <span className="text-muted-foreground">carbs</span>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-3 py-1.5 text-sm">
            <span className="font-medium">
              {Math.round(recipe.perServing.fat)}g
            </span>
            <span className="text-muted-foreground">fat</span>
          </div>
          {recipe.categories.map((cat) => (
            <Badge key={cat.id} variant="secondary">
              {cat.name}
            </Badge>
          ))}
        </div>

        {/* ── Main content grid ────────────────────────────── */}
        <div
          className={cn(
            'grid gap-6',
            !isMobile && 'xl:grid-cols-[1.2fr_0.8fr]',
          )}
        >
          <div className="space-y-6">
            {/* Ingredients */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Ingredients</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-lg border divide-y">
                  {recipe.ingredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="px-3 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox className="shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {ingredient.food.name}
                          </p>
                          {ingredient.note && (
                            <p className="text-xs text-muted-foreground">
                              {ingredient.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {Math.round(ingredient.totalCalories)} cal
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Directions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Directions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-4">
                  {recipe.directions.map((step, index) => (
                    <li
                      key={`${index}-${step}`}
                      className="flex gap-3 items-baseline"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold translate-y-0.5">
                        {index + 1}
                      </span>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar (desktop) ────────────────────────────── */}
          <div className="hidden xl:block space-y-4 xl:sticky xl:top-20 xl:self-start">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {recipe.isSaved ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => unsaveRecipe.mutate(recipe.id)}
                      disabled={unsaveRecipe.isPending}
                    >
                      <Heart className="h-4 w-4 mr-2 fill-current text-rose-500" />
                      Saved
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => saveRecipe.mutate(recipe.id)}
                      disabled={!recipe.isPublic || saveRecipe.isPending}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      seedFromRecipe.mutate({ recipeId: recipe.id })
                    }
                    disabled={seedFromRecipe.isPending}
                  >
                    {seedFromRecipe.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    Grocery List
                  </Button>
                </div>

                <div className="border-t" />

                {/* Log to diary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Log To Food Diary
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>Meal</Label>
                      <Select
                        value={logMealType}
                        onValueChange={(value) =>
                          setLogMealType(value as MealType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BREAKFAST">Breakfast</SelectItem>
                          <SelectItem value="LUNCH">Lunch</SelectItem>
                          <SelectItem value="DINNER">Dinner</SelectItem>
                          <SelectItem value="SNACKS">Snacks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Servings</Label>
                      <Input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={logServings}
                        onChange={(event) =>
                          setLogServings(Number(event.target.value) || 1)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>Est. Calories</Label>
                      <Input
                        value={Math.round(
                          recipe.perServing.calories * logServings,
                        )}
                        readOnly
                        className="text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Note</Label>
                      <Input
                        value={logNote}
                        onChange={(event) => setLogNote(event.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={submitLog}
                    disabled={logRecipe.isPending}
                  >
                    {logRecipe.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Logging...
                      </>
                    ) : (
                      'Log Recipe'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Sticky bottom bar (mobile / tablet) ──────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-sm p-3 flex items-center gap-2 xl:hidden">
        {recipe.isSaved ? (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => unsaveRecipe.mutate(recipe.id)}
            disabled={unsaveRecipe.isPending}
          >
            <Heart className="h-4 w-4 mr-2 fill-current text-rose-500" />
            Saved
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => saveRecipe.mutate(recipe.id)}
            disabled={!recipe.isPublic || saveRecipe.isPending}
          >
            <Heart className="h-4 w-4 mr-2" />
            Save
          </Button>
        )}
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => seedFromRecipe.mutate({ recipeId: recipe.id })}
          disabled={seedFromRecipe.isPending}
        >
          {seedFromRecipe.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4 mr-2" />
          )}
          Grocery List
        </Button>
        <Button
          className="flex-1"
          onClick={submitLog}
          disabled={logRecipe.isPending}
        >
          {logRecipe.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <BookOpen className="h-4 w-4 mr-2" />
          )}
          Log to Diary
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipe</DialogTitle>
            <DialogDescription>
              Update recipe details, image, directions, and ingredients.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Recipe Name</Label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
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
                    disabled={uploadRecipeImage.isPending}
                    onClick={async () => {
                      const { file } = await pickImage();
                      if (file) handleUploadImage(file);
                    }}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                  {uploadRecipeImage.isPending && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading
                    </span>
                  )}
                  {!uploadRecipeImage.isPending && form.imageUrl && (
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
                  rows={6}
                />
              </div>
            </div>

            {allCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => {
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Ingredients</h3>
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
                <Input
                  className="pl-9"
                  value={ingredientSearch}
                  onChange={(event) => setIngredientSearch(event.target.value)}
                  placeholder="Search foods to add as ingredients"
                />
              </div>

              {ingredientSearch.length >= 2 && (
                <div className="rounded-lg border max-h-52 overflow-y-auto">
                  {searchedFoodsQuery.isLoading ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      Searching foods...
                    </div>
                  ) : (searchedFoodsQuery.data?.data?.items || []).length ===
                    0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      No foods found.
                    </div>
                  ) : (
                    (searchedFoodsQuery.data?.data?.items || []).map((food) => (
                      <button
                        type="button"
                        key={food.id}
                        className="w-full text-left p-3 border-b last:border-b-0 hover:bg-muted/40"
                        onClick={() => addIngredient(food)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-sm">{food.name}</p>
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
                      <Trash2 className="h-4 w-4" />
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
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={updateRecipe.isPending}>
              {updateRecipe.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Recipe'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently removes the recipe and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteRecipe.mutate(id)}
            >
              {deleteRecipe.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
