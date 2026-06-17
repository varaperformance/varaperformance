import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Copy,
  ListPlus,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  Utensils,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { ScrollIndicator } from '@/components/ui/scroll-indicator';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useMealPlans,
  useMealPlan,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
  useAddMealPlanItem,
  useRemoveMealPlanItem,
  useCopyMealPlanDay,
  useQuickLogMealPlan,
  useGenerateFromMacros,
} from '@/features/health/hooks/use-meal-plans';
import { useSearchFoods, useSeedFromMealPlan } from '@/features/health';
import type {
  MealPlanResponse,
  MealPlanListItem,
  MealPlanItemResponse,
} from '@/features/health/hooks/use-meal-plans';
import type { MealType } from '@varaperformance/core';

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MEAL_TYPES: { value: MealType; label: string; icon: typeof Utensils }[] =
  [
    { value: 'BREAKFAST', label: 'Breakfast', icon: Utensils },
    { value: 'LUNCH', label: 'Lunch', icon: Utensils },
    { value: 'DINNER', label: 'Dinner', icon: ChefHat },
    { value: 'SNACKS', label: 'Snacks', icon: Utensils },
  ];

export default function MealPlansPage() {
  const isMobile = useIsMobile();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [copyDayDialogOpen, setCopyDayDialogOpen] = useState(false);
  const [quickLogDialogOpen, setQuickLogDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planToEdit, setPlanToEdit] = useState<MealPlanListItem | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  // Add item state
  const [addItemDay, setAddItemDay] = useState(0);
  const [addItemMealType, setAddItemMealType] = useState<MealType>('BREAKFAST');
  const [addItemSource, setAddItemSource] = useState<'food' | 'custom'>('food');
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [selectedFoodName, setSelectedFoodName] = useState('');
  const [addItemServings, setAddItemServings] = useState('1');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');

  // Copy day state
  const [copySourceDay, setCopySourceDay] = useState(0);
  const [copyTargetDays, setCopyTargetDays] = useState<number[]>([]);

  // Quick log state
  const [quickLogDay, setQuickLogDay] = useState<number | undefined>(undefined);
  const [quickLogMealType, setQuickLogMealType] = useState<
    MealType | undefined
  >(undefined);

  // Auto-generate state
  const [generateName, setGenerateName] = useState('');
  const [generateVary, setGenerateVary] = useState(false);

  const { data: plansData, isLoading: plansLoading } = useMealPlans();
  const { data: planDetailData, isLoading: detailLoading } = useMealPlan(
    selectedPlanId ?? '',
    !!selectedPlanId,
  );
  const { data: foodResults } = useSearchFoods(foodSearchQuery, 1, 10);

  const plans = plansData?.data ?? [];
  const activePlan = planDetailData?.data;

  const createMutation = useCreateMealPlan({
    onSuccess: (data) => {
      toast.success('Meal plan created');
      setCreateDialogOpen(false);
      setPlanName('');
      setSelectedPlanId(data.data.id);
    },
    onError: () => toast.error('Failed to create meal plan'),
  });

  const updateMutation = useUpdateMealPlan({
    onSuccess: () => {
      toast.success('Meal plan updated');
      setEditDialogOpen(false);
      setPlanToEdit(null);
    },
    onError: () => toast.error('Failed to update meal plan'),
  });

  const deleteMutation = useDeleteMealPlan({
    onSuccess: () => {
      toast.success('Meal plan deleted');
      setDeleteDialogOpen(false);
      if (selectedPlanId === planToDelete) setSelectedPlanId(null);
      setPlanToDelete(null);
    },
    onError: () => toast.error('Failed to delete meal plan'),
  });

  const addItemMutation = useAddMealPlanItem({
    onSuccess: () => {
      toast.success('Item added');
      setAddItemDialogOpen(false);
      resetAddItemForm();
    },
    onError: () => toast.error('Failed to add item'),
  });

  const removeItemMutation = useRemoveMealPlanItem({
    onSuccess: () => toast.success('Item removed'),
    onError: () => toast.error('Failed to remove item'),
  });

  const copyDayMutation = useCopyMealPlanDay({
    onSuccess: () => {
      toast.success('Day copied successfully');
      setCopyDayDialogOpen(false);
      setCopyTargetDays([]);
    },
    onError: () => toast.error('Failed to copy day'),
  });

  const quickLogMutation = useQuickLogMealPlan({
    onSuccess: (data) => {
      toast.success(`${data.data.length} items logged to diary`);
      setQuickLogDialogOpen(false);
    },
    onError: () => toast.error('Failed to log meals'),
  });

  const seedGroceryMutation = useSeedFromMealPlan({
    onSuccess: () => {
      toast.success('Grocery list created — opening it now');
      navigate('/grocery-lists');
    },
    onError: () => toast.error('Failed to create grocery list from meal plan'),
  });

  const generateMutation = useGenerateFromMacros({
    onSuccess: (data) => {
      toast.success('Meal plan generated from your macro targets');
      setGenerateDialogOpen(false);
      setSelectedPlanId(data.data.id);
      setGenerateName('');
    },
    onError: () =>
      toast.error(
        'Failed to generate plan. Make sure you have favorites, saved recipes, or recent food logs.',
      ),
  });

  function resetAddItemForm() {
    setFoodSearchQuery('');
    setSelectedFoodId(null);
    setSelectedFoodName('');
    setAddItemServings('1');
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setAddItemSource('food');
  }

  function handleAddItem() {
    if (!selectedPlanId) return;

    if (addItemSource === 'food') {
      if (!selectedFoodId) return;
      addItemMutation.mutate({
        planId: selectedPlanId,
        data: {
          dayOfWeek: addItemDay,
          mealType: addItemMealType,
          foodId: selectedFoodId,
          servings: parseFloat(addItemServings) || 1,
        },
      });
    } else {
      addItemMutation.mutate({
        planId: selectedPlanId,
        data: {
          dayOfWeek: addItemDay,
          mealType: addItemMealType,
          customName: customName || 'Custom item',
          customCalories: parseFloat(customCalories) || 0,
          customProtein: parseFloat(customProtein) || undefined,
          customCarbs: parseFloat(customCarbs) || undefined,
          customFat: parseFloat(customFat) || undefined,
          servings: parseFloat(addItemServings) || 1,
        },
      });
    }
  }

  // Group items by day
  function groupByDay(items: MealPlanItemResponse[]) {
    const grouped = new Map<number, MealPlanItemResponse[]>();
    for (const item of items) {
      const existing = grouped.get(item.dayOfWeek) ?? [];
      existing.push(item);
      grouped.set(item.dayOfWeek, existing);
    }
    return grouped;
  }

  // Group items within a day by meal type
  function groupByMeal(items: MealPlanItemResponse[]) {
    const grouped: Record<string, MealPlanItemResponse[]> = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
      SNACKS: [],
    };
    for (const item of items) {
      grouped[item.mealType]?.push(item);
    }
    return grouped;
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Hero header */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-orange-950/40 via-background to-amber-950/30 border border-orange-500/10 px-6 py-8 md:px-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/5 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-amber-500/5 blur-2xl" />

        <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-2">
          Nutrition
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Meal Plans
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Plan your weekly meals, copy days for routines, generate grocery
          lists, and quick-log to your diary.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            className="bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-md"
            onClick={() => {
              setPlanName('');
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Meal Plan
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setGenerateName('');
              setGenerateVary(false);
              setGenerateDialogOpen(true);
            }}
          >
            <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
            Auto-Generate from Macros
          </Button>
        </div>
      </section>

      {/* Plan selector + detail */}
      <div
        className={cn('grid grid-cols-1 gap-6', !isMobile && 'lg:grid-cols-4')}
      >
        {/* Plan list sidebar */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Your Plans
          </h2>
          {plansLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <CalendarDays className="mx-auto h-8 w-8 mb-2 opacity-40" />
                No meal plans yet. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            plans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg',
                  selectedPlanId === plan.id &&
                    'ring-2 ring-orange-500/50 border-orange-500/30',
                )}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate text-sm">
                          {plan.name}
                        </p>
                        {plan.isActive && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-green-500/20 text-green-400"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.itemCount} items · ~{plan.totalDailyCalories}{' '}
                        cal/day
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!plan.isActive && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateMutation.mutate({
                                id: plan.id,
                                data: { isActive: true },
                              });
                            }}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Set Active
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlanToEdit(plan);
                            setPlanName(plan.name);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlanToDelete(plan.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Plan detail */}
        <div className="lg:col-span-3">
          {!selectedPlanId ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-muted-foreground">
                <ClipboardList className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">
                  Select a meal plan to view its weekly schedule
                </p>
              </CardContent>
            </Card>
          ) : detailLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : activePlan ? (
            <PlanDetail
              plan={activePlan}
              onAddItem={(day, mealType) => {
                setAddItemDay(day);
                setAddItemMealType(mealType);
                resetAddItemForm();
                setAddItemDialogOpen(true);
              }}
              onRemoveItem={(itemId) => {
                removeItemMutation.mutate({
                  planId: selectedPlanId,
                  itemId,
                });
              }}
              onCopyDay={(day, targets) => {
                setCopySourceDay(day);
                if (targets) {
                  // Direct copy-to-all shortcut
                  setCopyTargetDays(targets);
                  if (selectedPlanId) {
                    copyDayMutation.mutate({
                      planId: selectedPlanId,
                      data: {
                        sourceDay: day,
                        targetDays: targets,
                      },
                    });
                  }
                } else {
                  setCopyTargetDays([]);
                  setCopyDayDialogOpen(true);
                }
              }}
              onQuickLog={(day, mealType) => {
                setQuickLogDay(day);
                setQuickLogMealType(mealType);
                if (day !== undefined) {
                  // Direct quick-log for a specific day/meal — no dialog needed
                  quickLogMutation.mutate({
                    planId: selectedPlanId,
                    data: {
                      dayOfWeek: day,
                      mealType,
                    },
                  });
                } else {
                  setQuickLogDialogOpen(true);
                }
              }}
              onGenerateGrocery={(days) => {
                if (selectedPlanId) {
                  seedGroceryMutation.mutate({
                    mealPlanId: selectedPlanId,
                    days: days,
                    servingsMultiplier: 1,
                  });
                }
              }}
              groupByDay={groupByDay}
              groupByMeal={groupByMeal}
            />
          ) : null}
        </div>
      </div>

      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Meal Plan</DialogTitle>
            <DialogDescription>
              Create a weekly meal plan template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                placeholder="e.g., Weekday Routine, Cut Diet"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ name: planName })}
              disabled={!planName.trim() || createMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Meal Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-plan-name">Plan Name</Label>
              <Input
                id="edit-plan-name"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                maxLength={120}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (planToEdit) {
                  updateMutation.mutate({
                    id: planToEdit.id,
                    data: { name: planName },
                  });
                }
              }}
              disabled={!planName.trim() || updateMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this meal plan and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (planToDelete) deleteMutation.mutate(planToDelete);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add to {DAY_LABELS[addItemDay]} —{' '}
              {MEAL_TYPES.find((m) => m.value === addItemMealType)?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Tabs
              value={addItemSource}
              onValueChange={(v) => setAddItemSource(v as 'food' | 'custom')}
            >
              <TabsList className="w-full">
                <TabsTrigger value="food" className="flex-1">
                  Search Food
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">
                  Custom Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="food" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label>Search Foods</Label>
                  <Input
                    placeholder="Search by name..."
                    value={foodSearchQuery}
                    onChange={(e) => {
                      setFoodSearchQuery(e.target.value);
                      setSelectedFoodId(null);
                      setSelectedFoodName('');
                    }}
                  />
                  {foodSearchQuery.length >= 3 &&
                    foodResults?.data?.items &&
                    !selectedFoodId && (
                      <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                        {foodResults.data.items.map((food) => (
                          <button
                            key={food.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              setSelectedFoodId(food.id);
                              setSelectedFoodName(
                                food.brand
                                  ? `${food.name} (${food.brand})`
                                  : food.name,
                              );
                            }}
                          >
                            <span className="font-medium">{food.name}</span>
                            {food.isVerified && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ml-1">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Verified
                              </span>
                            )}
                            {food.brand && (
                              <span className="text-muted-foreground">
                                {' '}
                                · {food.brand}
                              </span>
                            )}
                            <span className="float-right text-muted-foreground">
                              {food.calories} cal
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  {selectedFoodId && (
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                      <Utensils className="h-4 w-4 text-orange-400" />
                      <span className="flex-1 truncate">
                        {selectedFoodName}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedFoodId(null);
                          setSelectedFoodName('');
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Servings</Label>
                  <Input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={addItemServings}
                    onChange={(e) => setAddItemServings(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., Protein shake"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Calories</Label>
                    <Input
                      type="number"
                      min="0"
                      value={customCalories}
                      onChange={(e) => setCustomCalories(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Protein (g)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={customProtein}
                      onChange={(e) => setCustomProtein(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Carbs (g)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={customCarbs}
                      onChange={(e) => setCustomCarbs(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fat (g)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={customFat}
                      onChange={(e) => setCustomFat(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Servings</Label>
                  <Input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={addItemServings}
                    onChange={(e) => setAddItemServings(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddItemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={
                addItemMutation.isPending ||
                (addItemSource === 'food' && !selectedFoodId) ||
                (addItemSource === 'custom' && !customCalories)
              }
            >
              <ListPlus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Day Dialog */}
      <Dialog open={copyDayDialogOpen} onOpenChange={setCopyDayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Copy {DAY_LABELS[copySourceDay]} to Other Days
            </DialogTitle>
            <DialogDescription>
              All existing items on target days will be replaced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {DAY_LABELS.map((day, idx) => {
              if (idx === copySourceDay) return null;
              return (
                <label
                  key={idx}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={copyTargetDays.includes(idx)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setCopyTargetDays((prev) => [...prev, idx]);
                      } else {
                        setCopyTargetDays((prev) =>
                          prev.filter((d) => d !== idx),
                        );
                      }
                    }}
                  />
                  <span className="text-sm">{day}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCopyDayDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPlanId && copyTargetDays.length > 0) {
                  copyDayMutation.mutate({
                    planId: selectedPlanId,
                    data: {
                      sourceDay: copySourceDay,
                      targetDays: copyTargetDays,
                    },
                  });
                }
              }}
              disabled={
                copyTargetDays.length === 0 || copyDayMutation.isPending
              }
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy to {copyTargetDays.length} day
              {copyTargetDays.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Log Dialog */}
      <Dialog open={quickLogDialogOpen} onOpenChange={setQuickLogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick-Log to Diary</DialogTitle>
            <DialogDescription>
              Log all meals from a specific day to today's food diary.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select
                value={quickLogDay?.toString() ?? 'today'}
                onValueChange={(v) =>
                  setQuickLogDay(v === 'today' ? undefined : parseInt(v))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Today's day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">
                    Today ({DAY_LABELS[new Date().getDay()]})
                  </SelectItem>
                  {DAY_LABELS.map((day, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meal (optional)</Label>
              <Select
                value={quickLogMealType ?? 'all'}
                onValueChange={(v) =>
                  setQuickLogMealType(v === 'all' ? undefined : (v as MealType))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All meals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All meals</SelectItem>
                  {MEAL_TYPES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickLogDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPlanId) {
                  quickLogMutation.mutate({
                    planId: selectedPlanId,
                    data: {
                      dayOfWeek: quickLogDay,
                      mealType: quickLogMealType,
                    },
                  });
                }
              }}
              disabled={quickLogMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Log Meals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Generate Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Sparkles className="inline mr-2 h-5 w-5 text-amber-400" />
              Auto-Generate from Macros
            </DialogTitle>
            <DialogDescription>
              Creates a plan using your nutrition goals, favorite foods, saved
              recipes, and recently logged foods.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="gen-name">Plan Name (optional)</Label>
              <Input
                id="gen-name"
                placeholder="Auto-generated Plan"
                value={generateName}
                onChange={(e) => setGenerateName(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="space-y-0.5">
                <Label>Vary meals by day</Label>
                <p className="text-xs text-muted-foreground">
                  Off = same template every day (great for consistent eaters)
                </p>
              </div>
              <Switch
                checked={generateVary}
                onCheckedChange={setGenerateVary}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                generateMutation.mutate({
                  name: generateName || undefined,
                  varyByDay: generateVary,
                })
              }
              disabled={generateMutation.isPending}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {generateMutation.isPending ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== PLAN DETAIL COMPONENT ====================

function PlanDetail({
  plan,
  onAddItem,
  onRemoveItem,
  onCopyDay,
  onQuickLog,
  onGenerateGrocery,
  groupByDay,
  groupByMeal,
}: {
  plan: MealPlanResponse;
  onAddItem: (day: number, mealType: MealType) => void;
  onRemoveItem: (itemId: string) => void;
  onCopyDay: (day: number, targets?: number[]) => void;
  onQuickLog: (day?: number, mealType?: MealType) => void;
  onGenerateGrocery: (days?: number[]) => void;
  groupByDay: (
    items: MealPlanItemResponse[],
  ) => Map<number, MealPlanItemResponse[]>;
  groupByMeal: (
    items: MealPlanItemResponse[],
  ) => Record<string, MealPlanItemResponse[]>;
}) {
  const dayGroups = groupByDay(plan.items);
  const totalItems = plan.items.length;
  const totalCal = plan.items.reduce((s, i) => s + i.totalCalories, 0);
  const uniqueDays = new Set(plan.items.map((i) => i.dayOfWeek));
  const avgDaily =
    uniqueDays.size > 0 ? Math.round(totalCal / uniqueDays.size) : 0;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">{plan.name}</h2>
          {totalItems > 0 && (
            <p className="text-xs text-muted-foreground">
              {totalItems} items · ~{avgDaily} cal/day avg
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Quick Log
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onQuickLog(undefined, undefined)}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Choose day & meal...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onQuickLog(new Date().getDay(), undefined)}
            >
              <Play className="mr-2 h-4 w-4" />
              Log today's meals ({DAY_SHORT[new Date().getDay()]})
            </DropdownMenuItem>
            {MEAL_TYPES.map((m) => (
              <DropdownMenuItem
                key={m.value}
                onClick={() => onQuickLog(new Date().getDay(), m.value)}
              >
                <Utensils className="mr-2 h-4 w-4" />
                Log today's {m.label.toLowerCase()}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
              Grocery List
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onGenerateGrocery(undefined)}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Full week
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onGenerateGrocery([1, 2, 3, 4, 5])}
            >
              Weekdays only (Mon-Fri)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGenerateGrocery([0, 6])}>
              Weekend only (Sat-Sun)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Weekly view tabs */}
      <Tabs defaultValue="0">
        <ScrollIndicator>
          <TabsList className="w-full justify-start">
            {DAY_SHORT.map((day, idx) => {
              const dayItems = dayGroups.get(idx) ?? [];
              return (
                <TabsTrigger
                  key={idx}
                  value={idx.toString()}
                  className="text-xs"
                >
                  {day}
                  {dayItems.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-4 min-w-4 px-1 text-[10px]"
                    >
                      {dayItems.length}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollIndicator>

        {DAY_LABELS.map((dayLabel, dayIdx) => {
          const dayItems = dayGroups.get(dayIdx) ?? [];
          const meals = groupByMeal(dayItems);
          const dayTotal = dayItems.reduce(
            (sum, i) => sum + i.totalCalories,
            0,
          );

          return (
            <TabsContent
              key={dayIdx}
              value={dayIdx.toString()}
              className="space-y-4 mt-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{dayLabel}</h3>
                  {dayTotal > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {dayTotal} calories total
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {dayItems.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onQuickLog(dayIdx, undefined)}
                        title={`Log ${dayLabel} to diary`}
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Log Day
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Copy Day
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onCopyDay(dayIdx)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Choose days...
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              const allOtherDays = [0, 1, 2, 3, 4, 5, 6].filter(
                                (d) => d !== dayIdx,
                              );
                              onCopyDay(dayIdx, allOtherDays);
                            }}
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            Copy to all other days
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>

              {MEAL_TYPES.map(({ value: mealType, label }) => {
                const items = meals[mealType] ?? [];
                const mealCals = items.reduce(
                  (sum, i) => sum + i.totalCalories,
                  0,
                );

                return (
                  <Card key={mealType}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {label}
                          {mealCals > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              {mealCals} cal
                            </span>
                          )}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onAddItem(dayIdx, mealType)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    {items.length > 0 && (
                      <CardContent className="pt-0 px-4 pb-3">
                        <div className="space-y-1.5">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 group animate-in fade-in duration-400 motion-reduce:animate-none"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">
                                  {item.food?.name ??
                                    item.recipe?.name ??
                                    item.customName ??
                                    'Item'}
                                  {item.food?.brand && (
                                    <span className="text-muted-foreground">
                                      {' '}
                                      · {item.food.brand}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.servings}× · {item.totalCalories} cal ·{' '}
                                  {item.totalProtein}p · {item.totalCarbs}c ·{' '}
                                  {item.totalFat}f
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => onRemoveItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
