import { useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  CheckSquare,
  ChevronDown,
  ClipboardCopy,
  ListPlus,
  MoreVertical,
  Pencil,
  Plus,
  ShoppingCart,
  Square,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useGroceryLists,
  useGroceryList,
  useCreateGroceryList,
  useUpdateGroceryList,
  useDeleteGroceryList,
  useAddGroceryItem,
  useUpdateGroceryItem,
  useRemoveGroceryItem,
  useBatchCheckItems,
} from '@/features/health/hooks/use-grocery-lists';
import type {
  GroceryListDetailResponse,
  GroceryListSummary,
  GroceryListItemResponse,
} from '@/features/health/hooks/use-grocery-lists';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-600',
  COMPLETED: 'bg-blue-500/10 text-blue-600',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

export default function GroceryListsPage() {
  const isMobile = useIsMobile();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [listName, setListName] = useState('');
  const [listToEdit, setListToEdit] = useState<GroceryListSummary | null>(null);
  const [listToDelete, setListToDelete] = useState<string | null>(null);

  // Add item state
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');

  const { data: listsData, isLoading: listsLoading } = useGroceryLists();
  const { data: listDetailData, isLoading: detailLoading } = useGroceryList(
    selectedListId ?? '',
    !!selectedListId,
  );

  const lists = listsData?.data ?? [];
  const activeList = listDetailData?.data;

  const createMutation = useCreateGroceryList({
    onSuccess: (data) => {
      toast.success('Grocery list created');
      setCreateDialogOpen(false);
      setListName('');
      setSelectedListId(data.data.id);
    },
    onError: () => toast.error('Failed to create grocery list'),
  });

  const updateMutation = useUpdateGroceryList({
    onSuccess: () => {
      toast.success('Grocery list updated');
      setEditDialogOpen(false);
      setListToEdit(null);
    },
    onError: () => toast.error('Failed to update grocery list'),
  });

  const deleteMutation = useDeleteGroceryList({
    onSuccess: () => {
      toast.success('Grocery list deleted');
      setDeleteDialogOpen(false);
      if (selectedListId === listToDelete) setSelectedListId(null);
      setListToDelete(null);
    },
    onError: () => toast.error('Failed to delete grocery list'),
  });

  const addItemMutation = useAddGroceryItem({
    onSuccess: () => {
      toast.success('Item added');
      setAddItemDialogOpen(false);
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('');
      setNewItemCategory('');
    },
    onError: () => toast.error('Failed to add item'),
  });

  const updateItemMutation = useUpdateGroceryItem({
    onError: () => toast.error('Failed to update item'),
  });

  const removeItemMutation = useRemoveGroceryItem({
    onSuccess: () => toast.success('Item removed'),
    onError: () => toast.error('Failed to remove item'),
  });

  const batchCheckMutation = useBatchCheckItems({
    onError: () => toast.error('Failed to update items'),
  });

  function handleCopyList() {
    if (!activeList) return;
    const text = activeList.items
      .map(
        (i) =>
          `${i.isChecked ? '☑' : '☐'} ${i.name}${i.quantity ? ` — ${i.quantity} ${i.unit ?? ''}` : ''}`,
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Hero header */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-950/40 via-background to-teal-950/30 border border-emerald-500/10 px-6 py-8 md:px-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-teal-500/5 blur-2xl" />

        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
          Nutrition
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Grocery Lists
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Build and manage your shopping lists, track items, and generate lists
          from your meal plans.
        </p>

        <div className="mt-5">
          <Button
            className="bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New List
          </Button>
        </div>
      </section>

      <div
        className={cn('grid grid-cols-1 gap-6', !isMobile && 'lg:grid-cols-4')}
      >
        {/* List sidebar */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Your Lists
          </h2>
          {listsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))
          ) : lists.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No grocery lists yet
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create your first list
                </Button>
              </CardContent>
            </Card>
          ) : (
            lists.map((list) => (
              <Card
                key={list.id}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-accent/50',
                  selectedListId === list.id && 'ring-2 ring-primary',
                )}
                onClick={() => setSelectedListId(list.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{list.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={STATUS_COLORS[list.status]}
                        >
                          {list.status.toLowerCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {list.checkedCount}/{list.totalCount} items
                        </span>
                      </div>
                      {list.mealPlanName && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          From: {list.mealPlanName}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setListToEdit(list);
                            setListName(list.name);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {list.status !== 'COMPLETED' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateMutation.mutate({
                                id: list.id,
                                data: { status: 'COMPLETED' },
                              });
                            }}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Mark Complete
                          </DropdownMenuItem>
                        )}
                        {list.status !== 'ARCHIVED' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateMutation.mutate({
                                id: list.id,
                                data: { status: 'ARCHIVED' },
                              });
                            }}
                          >
                            Archive
                          </DropdownMenuItem>
                        )}
                        {list.status === 'ARCHIVED' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateMutation.mutate({
                                id: list.id,
                                data: { status: 'ACTIVE' },
                              });
                            }}
                          >
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setListToDelete(list.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {list.totalCount > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.round((list.checkedCount / list.totalCount) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {detailLoading && selectedListId ? (
            <Card>
              <CardContent className="py-12">
                <Skeleton className="mx-auto h-6 w-48" />
              </CardContent>
            </Card>
          ) : activeList ? (
            <ListDetail
              list={activeList}
              onAddItem={() => setAddItemDialogOpen(true)}
              onToggleItem={(itemId, checked) => {
                if (selectedListId) {
                  updateItemMutation.mutate({
                    listId: selectedListId,
                    itemId,
                    data: { isChecked: checked },
                  });
                }
              }}
              onRemoveItem={(itemId) => {
                if (selectedListId) {
                  removeItemMutation.mutate({
                    listId: selectedListId,
                    itemId,
                  });
                }
              }}
              onCheckAll={(checked) => {
                if (selectedListId && activeList.items.length > 0) {
                  batchCheckMutation.mutate({
                    listId: selectedListId,
                    data: {
                      itemIds: activeList.items.map((i) => i.id),
                      isChecked: checked,
                    },
                  });
                }
              }}
              onCopyList={handleCopyList}
            />
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <ShoppingCart className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Select a grocery list or create a new one
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Grocery List</DialogTitle>
            <DialogDescription>
              Create an empty list and start adding items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                placeholder="e.g. Weekly Groceries"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                maxLength={120}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && listName.trim()) {
                    createMutation.mutate({ name: listName.trim() });
                  }
                }}
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
              onClick={() => createMutation.mutate({ name: listName.trim() })}
              disabled={!listName.trim() || createMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Grocery List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">List Name</Label>
              <Input
                id="edit-name"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
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
                if (listToEdit) {
                  updateMutation.mutate({
                    id: listToEdit.id,
                    data: { name: listName.trim() },
                  });
                }
              }}
              disabled={!listName.trim() || updateMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete grocery list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this grocery list and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                listToDelete && deleteMutation.mutate(listToDelete)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add an item to your grocery list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                placeholder="e.g. Chicken breast"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                maxLength={200}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    newItemName.trim() &&
                    selectedListId
                  ) {
                    addItemMutation.mutate({
                      listId: selectedListId,
                      data: {
                        name: newItemName.trim(),
                        quantity: newItemQuantity
                          ? parseFloat(newItemQuantity)
                          : undefined,
                        unit: newItemUnit || undefined,
                        category: newItemCategory || undefined,
                      },
                    });
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-qty">Quantity</Label>
                <Input
                  id="item-qty"
                  type="number"
                  placeholder="1"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-unit">Unit</Label>
                <Input
                  id="item-unit"
                  placeholder="lbs, oz, ct"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Category (optional)</Label>
              <Input
                id="item-category"
                placeholder="Produce, Dairy, Protein..."
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                maxLength={60}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddItemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedListId && newItemName.trim()) {
                  addItemMutation.mutate({
                    listId: selectedListId,
                    data: {
                      name: newItemName.trim(),
                      quantity: newItemQuantity
                        ? parseFloat(newItemQuantity)
                        : undefined,
                      unit: newItemUnit || undefined,
                      category: newItemCategory || undefined,
                    },
                  });
                }
              }}
              disabled={!newItemName.trim() || addItemMutation.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== LIST DETAIL COMPONENT ====================

function ListDetail({
  list,
  onAddItem,
  onToggleItem,
  onRemoveItem,
  onCheckAll,
  onCopyList,
}: {
  list: GroceryListDetailResponse;
  onAddItem: () => void;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckAll: (checked: boolean) => void;
  onCopyList: () => void;
}) {
  const unchecked = list.items.filter((i) => !i.isChecked);
  const checked = list.items.filter((i) => i.isChecked);

  // Group unchecked by category
  const categories = new Map<string, GroceryListItemResponse[]>();
  for (const item of unchecked) {
    const cat = item.category || 'General';
    const existing = categories.get(cat) ?? [];
    existing.push(item);
    categories.set(cat, existing);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {list.name}
              <Badge variant="secondary" className={STATUS_COLORS[list.status]}>
                {list.status.toLowerCase()}
              </Badge>
            </CardTitle>
            {list.mealPlanName && (
              <p className="text-xs text-muted-foreground mt-1">
                From meal plan: {list.mealPlanName}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {list.checkedCount}/{list.totalCount} items checked
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCopyList}>
              <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </Button>
            <Button size="sm" onClick={onAddItem}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Item
            </Button>
          </div>
        </div>
        {list.totalCount > 0 && (
          <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.round((list.checkedCount / list.totalCount) * 100)}%`,
              }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {list.items.length === 0 ? (
          <div className="py-8 text-center">
            <ListPlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No items yet — add your first item
            </p>
          </div>
        ) : (
          <>
            {/* Bulk actions */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {unchecked.length} remaining
              </span>
              <div className="flex gap-2">
                {unchecked.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCheckAll(true)}
                  >
                    <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                    Check All
                  </Button>
                )}
                {checked.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCheckAll(false)}
                  >
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    Uncheck All
                  </Button>
                )}
              </div>
            </div>

            {/* Unchecked items grouped by category */}
            {Array.from(categories.entries()).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {category}
                </h4>
                <div className="space-y-1">
                  {items.map((item) => (
                    <GroceryItem
                      key={item.id}
                      item={item}
                      onToggle={(checked) => onToggleItem(item.id, checked)}
                      onRemove={() => onRemoveItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Checked items */}
            {checked.length > 0 && (
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                  <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                  {checked.length} checked item
                  {checked.length !== 1 && 's'}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {checked.map((item) => (
                    <GroceryItem
                      key={item.id}
                      item={item}
                      onToggle={(isChecked) => onToggleItem(item.id, isChecked)}
                      onRemove={() => onRemoveItem(item.id)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== GROCERY ITEM COMPONENT ====================

function GroceryItem({
  item,
  onToggle,
  onRemove,
}: {
  item: GroceryListItemResponse;
  onToggle: (checked: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent/50 transition-colors',
        item.isChecked && 'opacity-60',
      )}
    >
      <button
        type="button"
        className="shrink-0"
        onClick={() => onToggle(!item.isChecked)}
      >
        {item.isChecked ? (
          <CheckSquare className="h-5 w-5 text-primary" />
        ) : (
          <Square className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            item.isChecked && 'line-through text-muted-foreground',
          )}
        >
          {item.name}
        </p>
        {(item.quantity || item.note) && (
          <p className="text-xs text-muted-foreground">
            {item.quantity && (
              <span>
                {item.quantity} {item.unit ?? ''}
              </span>
            )}
            {item.quantity && item.note && <span> · </span>}
            {item.note && <span>{item.note}</span>}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}
