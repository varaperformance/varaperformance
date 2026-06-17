import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  SuccessResponse,
  GymResponse,
  GymsListData,
} from '@varaperformance/core';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  MapPin,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';

// Use the GymResponse type from core but extend it for our table needs
type Gym = GymResponse;

export default function GymManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Create/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [gymName, setGymName] = useState('');
  const [gymDescription, setGymDescription] = useState('');
  const [gymWebsite, setGymWebsite] = useState('');

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGym, setDeletingGym] = useState<Gym | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Queries
  const { data: gymsData, isLoading } = useQuery({
    queryKey: ['admin-gyms', { search: debouncedSearch, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', page.toString());
      params.set('limit', '20');

      const response = await api.get<SuccessResponse<GymsListData>>(
        `/gyms?${params.toString()}`,
      );
      return response.data;
    },
  });

  // Mutations
  const createGym = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      website?: string;
    }) => {
      const response = await api.post<SuccessResponse<GymResponse>>(
        '/gyms',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gyms'] });
      resetDialog();
    },
  });

  const updateGym = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      website?: string;
    }) => {
      const response = await api.patch<SuccessResponse<GymResponse>>(
        `/gyms/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gyms'] });
      resetDialog();
    },
  });

  const deleteGym = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<SuccessResponse<void>>(`/gyms/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gyms'] });
      setDeleteDialogOpen(false);
      setDeletingGym(null);
    },
  });

  const gyms = gymsData?.data?.items ?? [];
  const total = gymsData?.data?.total ?? 0;
  const limit = gymsData?.data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingGym(null);
    setGymName('');
    setGymDescription('');
    setGymWebsite('');
  };

  const openEditDialog = (gym: Gym) => {
    setEditingGym(gym);
    setGymName(gym.name);
    setGymDescription(gym.description ?? '');
    setGymWebsite(gym.website ?? '');
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: gymName,
      description: gymDescription || undefined,
      website: gymWebsite || undefined,
    };

    if (editingGym) {
      updateGym.mutate({ id: editingGym.id, ...data });
    } else {
      createGym.mutate(data);
    }
  };

  const isMutating = createGym.isPending || updateGym.isPending;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gym Management</h1>
          <p className="text-muted-foreground mt-1">
            Add and manage gym locations
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => !open && resetDialog()}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Gym
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGym ? 'Edit Gym' : 'Add New Gym'}
              </DialogTitle>
              <DialogDescription>
                {editingGym
                  ? 'Update gym information'
                  : 'Add a new gym to the platform'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Gold's Gym"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the gym"
                  value={gymDescription}
                  onChange={(e) => setGymDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://..."
                  value={gymWebsite}
                  onChange={(e) => setGymWebsite(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!gymName || isMutating}>
                {isMutating && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingGym ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search gyms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Gyms Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : gyms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No gyms found</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'Try a different search term'
                  : 'Add your first gym to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gyms.map((gym: Gym) => (
                  <TableRow key={gym.id}>
                    <TableCell className="font-medium">{gym.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {gym.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {gym.locationCount ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {gym.website ? (
                        <a
                          href={gym.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Visit
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(gym.createdAt), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(gym)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingGym(gym);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Pagination */}
      {!isLoading && gyms.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gym</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGym?.name}"? This will
              also delete all associated locations. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingGym && deleteGym.mutate(deletingGym.id)}
              disabled={deleteGym.isPending}
            >
              {deleteGym.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
