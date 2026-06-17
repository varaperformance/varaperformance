import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Shield,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useAdminFoods,
  useAdminCreateFood,
  useAdminUpdateFood,
  useAdminDeleteFood,
  useAdminVerifyFood,
  type AdminFood,
} from '@/hooks/use-admin';
import api from '@/lib/api';

const SERVING_UNITS = [
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
] as const;

const FOOD_SOURCES = [
  'SYSTEM',
  'USER',
  'COMMUNITY',
  'USDA',
  'OPENFOOD',
] as const;

type FoodFormState = {
  name: string;
  brand: string;
  description: string;
  source: (typeof FOOD_SOURCES)[number];
  servingSize: string;
  servingUnit: (typeof SERVING_UNITS)[number];
  servingLabel: string;
  calories: string;
  protein: string;
  carbohydrates: string;
  fat: string;
  isPrivate: boolean;
};

const DEFAULT_FORM: FoodFormState = {
  name: '',
  brand: '',
  description: '',
  source: 'USER',
  servingSize: '1',
  servingUnit: 'SERVING',
  servingLabel: '',
  calories: '0',
  protein: '0',
  carbohydrates: '0',
  fat: '0',
  isPrivate: false,
};

export default function AdminFoodsPage() {
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<
    'all' | 'verified' | 'unverified'
  >('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<AdminFood | null>(null);
  const [form, setForm] = useState<FoodFormState>(DEFAULT_FORM);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFood, setDeletingFood] = useState<AdminFood | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const verified = useMemo(() => {
    if (verifiedFilter === 'all') return undefined;
    return verifiedFilter === 'verified';
  }, [verifiedFilter]);

  const { data: foodsData, isLoading } = useAdminFoods({
    query: debouncedSearch || undefined,
    verified,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    page,
    limit: 20,
  });

  const createFood = useAdminCreateFood();
  const updateFood = useAdminUpdateFood();
  const deleteFood = useAdminDeleteFood();
  const verifyFood = useAdminVerifyFood();

  const foods = foodsData?.data?.items ?? [];
  const total = foodsData?.data?.total ?? 0;
  const limit = foodsData?.data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingFood(null);
    setForm(DEFAULT_FORM);
  };

  const openCreateDialog = () => {
    setEditingFood(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = async (food: AdminFood) => {
    setEditingFood(food);
    setDialogOpen(true);

    try {
      const response = await api.get(`/nutrition/foods/${food.id}`);
      const detail = response.data?.data;
      if (!detail) return;

      setForm({
        name: detail.name,
        brand: detail.brand ?? '',
        description: detail.description ?? '',
        source: detail.source,
        servingSize: String(detail.servingSize),
        servingUnit: detail.servingUnit,
        servingLabel: detail.servingLabel ?? '',
        calories: String(detail.calories),
        protein: String(detail.protein),
        carbohydrates: String(detail.carbohydrates),
        fat: String(detail.fat),
        isPrivate: detail.isPrivate,
      });
    } catch {
      // Keep list values if detail fetch fails; admin can still edit core fields.
      setForm((prev) => ({
        ...prev,
        name: food.name,
        brand: food.brand ?? '',
        source: food.source,
        servingSize: String(food.servingSize),
        servingUnit: food.servingUnit,
        servingLabel: food.servingLabel ?? '',
        calories: String(food.calories),
        protein: String(food.protein),
        carbohydrates: String(food.carbohydrates),
        fat: String(food.fat),
        isPrivate: food.isPrivate,
      }));
    }
  };

  const isSubmitDisabled =
    !form.name.trim() ||
    Number.isNaN(Number(form.servingSize)) ||
    Number.isNaN(Number(form.calories)) ||
    Number.isNaN(Number(form.protein)) ||
    Number.isNaN(Number(form.carbohydrates)) ||
    Number.isNaN(Number(form.fat)) ||
    createFood.isPending ||
    updateFood.isPending;

  const handleSubmit = () => {
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      description: form.description.trim() || undefined,
      source: form.source,
      servingSize: Number(form.servingSize),
      servingUnit: form.servingUnit,
      servingLabel: form.servingLabel.trim() || undefined,
      calories: Number(form.calories),
      protein: Number(form.protein),
      carbohydrates: Number(form.carbohydrates),
      fat: Number(form.fat),
      isPrivate: form.isPrivate,
    };

    if (editingFood) {
      updateFood.mutate(
        { id: editingFood.id, data: payload },
        {
          onSuccess: () => {
            toast.success('Food updated');
            resetDialog();
          },
          onError: () => toast.error('Failed to update food'),
        },
      );
      return;
    }

    createFood.mutate(payload, {
      onSuccess: () => {
        toast.success('Food created');
        resetDialog();
      },
      onError: () => toast.error('Failed to create food'),
    });
  };

  const handleDelete = () => {
    if (!deletingFood) return;
    deleteFood.mutate(deletingFood.id, {
      onSuccess: () => {
        toast.success('Food deleted');
        setDeleteDialogOpen(false);
        setDeletingFood(null);
      },
      onError: () => toast.error('Failed to delete food'),
    });
  };

  const handleToggleVerify = (food: AdminFood) => {
    verifyFood.mutate(
      { id: food.id, verified: !food.isVerified },
      {
        onSuccess: () => {
          toast.success(food.isVerified ? 'Food unverified' : 'Food verified');
        },
        onError: () => toast.error('Failed to update verification'),
      },
    );
  };

  return (
    <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Food Management</h1>
          <p className="mt-1 text-muted-foreground">
            Add, edit, verify, and remove foods in the nutrition database
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Food
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[640px]">
            <DialogHeader>
              <DialogTitle>
                {editingFood ? 'Edit Food' : 'Create Food'}
              </DialogTitle>
              <DialogDescription>
                {editingFood
                  ? 'Update food details and nutrition values'
                  : 'Add a new food to the searchable nutrition library'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="food-name">Name</Label>
                <Input
                  id="food-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Greek Yogurt"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="food-brand">Brand</Label>
                <Input
                  id="food-brand"
                  value={form.brand}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, brand: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(value: FoodFormState['source']) =>
                    setForm((prev) => ({ ...prev, source: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="food-serving-label">Serving Label</Label>
                <Input
                  id="food-serving-label"
                  value={form.servingLabel}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      servingLabel: e.target.value,
                    }))
                  }
                  placeholder="e.g., cup"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="food-serving-size">Serving Size</Label>
                <Input
                  id="food-serving-size"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.servingSize}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      servingSize: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Serving Unit</Label>
                <Select
                  value={form.servingUnit}
                  onValueChange={(value: FoodFormState['servingUnit']) =>
                    setForm((prev) => ({ ...prev, servingUnit: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVING_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="food-calories">Calories</Label>
                <Input
                  id="food-calories"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.calories}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, calories: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="food-protein">Protein (g)</Label>
                <Input
                  id="food-protein"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.protein}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, protein: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="food-carbs">Carbs (g)</Label>
                <Input
                  id="food-carbs"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.carbohydrates}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      carbohydrates: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="food-fat">Fat (g)</Label>
                <Input
                  id="food-fat"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fat}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fat: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="food-description">Description</Label>
                <Input
                  id="food-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  id="food-private"
                  type="checkbox"
                  checked={form.isPrivate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isPrivate: e.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="food-private" className="cursor-pointer">
                  Private food (only owner can see)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
                {createFood.isPending || updateFood.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingFood ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or brand..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={verifiedFilter}
              onValueChange={(value: 'all' | 'verified' | 'unverified') => {
                setVerifiedFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All foods</SelectItem>
                <SelectItem value="verified">Verified only</SelectItem>
                <SelectItem value="unverified">Unverified only</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sourceFilter}
              onValueChange={(value: string) => {
                setSourceFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="USDA">USDA</SelectItem>
                <SelectItem value="OPENFOOD">OpenFood</SelectItem>
                <SelectItem value="USER">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : foods.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No foods found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Food</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Macros</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {foods.map((food) => (
                  <TableRow key={food.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{food.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {food.brand || 'No brand'} • {food.servingSize}{' '}
                          {food.servingLabel || food.servingUnit.toLowerCase()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                        {food.barcode || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{food.source}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {food.calories}
                        </span>{' '}
                        cal • P {food.protein} • C {food.carbohydrates} • F{' '}
                        {food.fat}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={food.isPrivate ? 'secondary' : 'outline'}>
                        {food.isPrivate ? 'Private' : 'Public'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {food.isVerified ? (
                        <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Circle className="h-3 w-3" />
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(food)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleVerify(food)}
                          disabled={verifyFood.isPending}
                          aria-label={
                            food.isVerified ? 'Unverify food' : 'Verify food'
                          }
                          title={food.isVerified ? 'Unverify' : 'Verify'}
                        >
                          <Shield
                            className={[
                              'h-4 w-4',
                              food.isVerified
                                ? 'text-emerald-600'
                                : 'text-muted-foreground',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingFood(food);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{' '}
            of {total} foods
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete food?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the food from search and diary flows. This action
              can be reversed only from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingFood(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deleteFood.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
