import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BadgeCheck,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Lightbulb,
  Plus,
  Search,
  Share2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import {
  useSaveRecipe,
  useSearchRecipes,
  useUnsaveRecipe,
  useRecipeCategories,
} from '@/features/health';

type RecipeFilter = 'all' | 'mine' | 'saved';
type RecipeSort = 'random' | 'name' | 'newest' | 'oldest';

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

export default function RecipesPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RecipeFilter>('all');
  const [sort, setSort] = useState<RecipeSort>('random');
  const [page, setPage] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >();

  // Stable seed so random order is consistent across pages within a session
  const [randomSeed] = useState(() => Math.random());

  const categoriesQuery = useRecipeCategories();
  const categories = categoriesQuery.data?.data?.items ?? [];

  const recipesQuery = useSearchRecipes({
    query: query || undefined,
    categoryId: selectedCategoryId,
    page,
    limit: 24,
    mine: filter === 'mine' ? true : undefined,
    saved: filter === 'saved' ? true : undefined,
    sort,
    seed: sort === 'random' ? randomSeed : undefined,
  });

  const total = recipesQuery.data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / 24) || 1;

  const saveRecipe = useSaveRecipe({
    onSuccess: () => toast.success('Recipe saved'),
    onError: (error) => toast.error(error.message || 'Failed to save recipe'),
  });

  const unsaveRecipe = useUnsaveRecipe({
    onSuccess: () => toast.success('Recipe removed from saved'),
    onError: (error) => toast.error(error.message || 'Failed to unsave recipe'),
  });

  const recipes = recipesQuery.data?.data?.items || [];

  const handleShareToElevate = (recipe: (typeof recipes)[number]) => {
    const payload = buildElevateRecipePayload(recipe);
    navigate(`/elevate?compose=1&recipe=${payload}`);
    toast.success('Recipe attached to Elevate composer');
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-orange-500/10 via-transparent to-emerald-500/10" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Nutrition
            </p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">Recipes</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Create private or public recipes, save community recipes, and log
              servings directly to your diary.
            </p>
          </div>
          <Button
            asChild
            size="icon"
            aria-label="Create new recipe"
            title="Create new recipe"
          >
            <Link to="/recipes/wizard">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="relative mt-4 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Use the card actions to quickly view recipe details, share to
              Elevate, or save favorites.
            </p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Browse Recipes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                className="pl-9"
                placeholder="Search recipe name or description"
              />
            </div>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value as RecipeSort);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filter}
              onValueChange={(value) => {
                setFilter(value as RecipeFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-42.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visible</SelectItem>
                <SelectItem value="mine">My Recipes</SelectItem>
                <SelectItem value="saved">Saved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategoryId ? 'outline' : 'default'}
                className="cursor-pointer"
                onClick={() => setSelectedCategoryId(undefined)}
              >
                All
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={
                    selectedCategoryId === cat.id ? 'default' : 'outline'
                  }
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedCategoryId(
                      selectedCategoryId === cat.id ? undefined : cat.id,
                    );
                    setPage(1);
                  }}
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          )}

          {recipesQuery.isLoading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : recipes.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No recipes found for this filter.
            </div>
          ) : (
            <div
              className={cn(
                'grid gap-4',
                !isMobile && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
              )}
            >
              {recipes.map((recipe) => (
                <Card key={recipe.id} className="overflow-hidden">
                  <Link to={`/recipes/${recipe.id}`} className="block">
                    <div className="h-36 bg-muted/40">
                      {recipe.imageUrl ? (
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <ChefHat className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight flex items-center gap-1">
                          {recipe.name}
                          {recipe.isVerified && (
                            <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
                          )}
                        </h3>
                        <Badge
                          variant={recipe.isPublic ? 'secondary' : 'outline'}
                        >
                          {recipe.isPublic ? 'Public' : 'Private'}
                        </Badge>
                      </div>
                      {recipe.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {recipe.description}
                        </p>
                      )}
                      {recipe.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {recipe.categories.slice(0, 3).map((cat) => (
                            <Badge
                              key={cat.id}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {cat.name}
                            </Badge>
                          ))}
                          {recipe.categories.length > 3 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              +{recipe.categories.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Per Serving</p>
                        <p className="font-medium">
                          {Math.round(recipe.perServing.calories)} cal
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2">
                        <p className="text-muted-foreground">Servings</p>
                        <p className="font-medium inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {recipe.totalServings}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                        aria-label={`View ${recipe.name}`}
                        title={`View ${recipe.name}`}
                      >
                        <Link to={`/recipes/${recipe.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleShareToElevate(recipe)}
                        aria-label={`Share ${recipe.name} to Elevate`}
                        title={`Share ${recipe.name} to Elevate`}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      {recipe.isSaved ? (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => unsaveRecipe.mutate(recipe.id)}
                          disabled={unsaveRecipe.isPending}
                        >
                          <Heart className="h-4 w-4 fill-current text-rose-500" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => saveRecipe.mutate(recipe.id)}
                          disabled={!recipe.isPublic || saveRecipe.isPending}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 24 + 1} to {Math.min(page * 24, total)} of{' '}
                {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
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
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
