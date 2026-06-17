import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eye,
  Loader2,
  Search,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import { useAdminRecipes, useToggleRecipeVerified } from '@/hooks/use-admin';

export default function AdminRecipesPage() {
  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<
    'all' | 'verified' | 'unverified'
  >('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const debouncedSearch = useDebounce(search, 300);

  const verified = useMemo(() => {
    if (verifiedFilter === 'all') return undefined;
    return verifiedFilter === 'verified';
  }, [verifiedFilter]);

  const { data: recipesData, isLoading } = useAdminRecipes({
    page,
    limit,
    query: debouncedSearch || undefined,
    verified,
  });

  const toggleVerified = useToggleRecipeVerified();

  const recipes = recipesData?.data?.items ?? [];
  const total = recipesData?.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  function handleToggleVerified(id: string, currentlyVerified: boolean) {
    toggleVerified.mutate(id, {
      onSuccess: () =>
        toast.success(
          currentlyVerified ? 'Recipe unverified' : 'Recipe verified',
        ),
      onError: () => toast.error('Failed to update verification status'),
    });
  }

  return (
    <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Recipe Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage platform recipes and verification status
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or description..."
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
                <SelectItem value="all">All recipes</SelectItem>
                <SelectItem value="verified">Verified only</SelectItem>
                <SelectItem value="unverified">Unverified only</SelectItem>
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
          ) : recipes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No recipes found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Macros</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead className="w-30">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {recipe.imageUrl ? (
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.name}
                            loading="lazy"
                            decoding="async"
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{recipe.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {recipe.totalServings} serving
                            {recipe.totalServings !== 1 ? 's' : ''} •{' '}
                            {format(new Date(recipe.createdAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {recipe.categories.slice(0, 2).map((cat) => (
                          <Badge
                            key={cat.id}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {cat.name}
                          </Badge>
                        ))}
                        {recipe.categories.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{recipe.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {Math.round(recipe.perServing.calories)}
                        </span>{' '}
                        cal • P {Math.round(recipe.perServing.protein)} • C{' '}
                        {Math.round(recipe.perServing.carbs)} • F{' '}
                        {Math.round(recipe.perServing.fat)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={recipe.isPublic ? 'secondary' : 'outline'}
                      >
                        {recipe.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {recipe.isVerified ? (
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
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/recipes/${recipe.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleToggleVerified(recipe.id, recipe.isVerified)
                          }
                          disabled={toggleVerified.isPending}
                          aria-label={
                            recipe.isVerified
                              ? 'Unverify recipe'
                              : 'Verify recipe'
                          }
                          title={recipe.isVerified ? 'Unverify' : 'Verify'}
                        >
                          <Shield
                            className={[
                              'h-4 w-4',
                              recipe.isVerified
                                ? 'text-emerald-600'
                                : 'text-muted-foreground',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          />
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
            of {total} recipes
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
    </div>
  );
}
