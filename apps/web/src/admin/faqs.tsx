import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  HelpCircle,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Star,
  Eye,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useFaqCategories,
  useFaqs,
  useCreateFaqCategory,
  useUpdateFaqCategory,
  useDeleteFaqCategory,
  useCreateFaq,
  useUpdateFaq,
  useDeleteFaq,
  type FaqCategory,
  type Faq,
} from '@/features/faq';

export default function FaqManagementPage() {
  const [activeTab, setActiveTab] = useState('faqs');

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FAQ Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage frequently asked questions
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="faqs" className="space-y-6">
          <FaqsTab />
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== Categories Tab ====================

function CategoriesTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Create/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FaqCategory | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryOrder, setCategoryOrder] = useState(0);
  const [categoryActive, setCategoryActive] = useState(true);

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<FaqCategory | null>(
    null,
  );

  const debouncedSearch = useDebounce(search, 300);

  // Queries & Mutations
  const { data: categoriesData, isLoading } = useFaqCategories({
    search: debouncedSearch,
    page,
    limit: 20,
  });

  const createCategory = useCreateFaqCategory();
  const updateCategory = useUpdateFaqCategory();
  const deleteCategory = useDeleteFaqCategory();

  const categories = categoriesData?.data?.items ?? [];
  const total = categoriesData?.data?.total ?? 0;
  const limit = categoriesData?.data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategorySlug('');
    setCategoryDescription('');
    setCategoryOrder(0);
    setCategoryActive(true);
  };

  const openEditDialog = (category: FaqCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategorySlug(category.slug);
    setCategoryDescription(category.description ?? '');
    setCategoryOrder(category.order);
    setCategoryActive(category.isActive);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: categoryName,
      slug: categorySlug,
      description: categoryDescription || undefined,
      order: categoryOrder,
      isActive: categoryActive,
    };

    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, data },
        { onSuccess: resetDialog },
      );
    } else {
      createCategory.mutate(data, { onSuccess: resetDialog });
    }
  };

  const handleDelete = () => {
    if (deletingCategory) {
      deleteCategory.mutate(deletingCategory.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeletingCategory(null);
        },
      });
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setCategoryName(name);
    if (!editingCategory) {
      setCategorySlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      );
    }
  };

  return (
    <>
      {/* Header with Add Button */}
      <div className="flex items-center justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? 'Update FAQ category details'
                  : 'Add a new category for FAQs'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={categoryName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Getting Started"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  placeholder="e.g., getting-started"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Brief description of the category"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={categoryOrder}
                    onChange={(e) =>
                      setCategoryOrder(parseInt(e.target.value) || 0)
                    }
                    min={0}
                  />
                </div>

                <div className="flex items-center justify-between space-y-0 pt-6">
                  <Label htmlFor="active">Active</Label>
                  <Switch
                    id="active"
                    checked={categoryActive}
                    onCheckedChange={setCategoryActive}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !categoryName ||
                  !categorySlug ||
                  createCategory.isPending ||
                  updateCategory.isPending
                }
              >
                {createCategory.isPending || updateCategory.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingCategory ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="mb-4 h-12 w-12" />
              <p>No categories found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>FAQs</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category: FaqCategory) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{category.name}</div>
                        {category.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {category.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {category.slug}
                      </code>
                    </TableCell>
                    <TableCell>{category._count?.faqs ?? 0}</TableCell>
                    <TableCell>{category.order}</TableCell>
                    <TableCell>
                      <Badge
                        variant={category.isActive ? 'default' : 'secondary'}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingCategory(category);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={(category._count?.faqs ?? 0) > 0}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{' '}
            of {total} categories
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategory.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ==================== FAQs Tab ====================

function FaqsTab() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Create/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategoryId, setFaqCategoryId] = useState('');
  const [faqOrder, setFaqOrder] = useState(0);
  const [faqActive, setFaqActive] = useState(true);
  const [faqFeatured, setFaqFeatured] = useState(false);

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFaq, setDeletingFaq] = useState<Faq | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Queries & Mutations
  const { data: faqsData, isLoading } = useFaqs({
    search: debouncedSearch,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    page,
    limit: 20,
  });

  const { data: categoriesData } = useFaqCategories({ limit: 100 });

  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const deleteFaq = useDeleteFaq();

  const faqs = faqsData?.data?.items ?? [];
  const total = faqsData?.data?.total ?? 0;
  const limit = faqsData?.data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit) || 1;
  const categories = categoriesData?.data?.items ?? [];

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingFaq(null);
    setFaqQuestion('');
    setFaqAnswer('');
    setFaqCategoryId('');
    setFaqOrder(0);
    setFaqActive(true);
    setFaqFeatured(false);
  };

  const openEditDialog = (faq: Faq) => {
    setEditingFaq(faq);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setFaqCategoryId(faq.category.id);
    setFaqOrder(faq.order);
    setFaqActive(faq.isActive);
    setFaqFeatured(faq.isFeatured);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      question: faqQuestion,
      answer: faqAnswer,
      categoryId: faqCategoryId,
      order: faqOrder,
      isActive: faqActive,
      isFeatured: faqFeatured,
    };

    if (editingFaq) {
      updateFaq.mutate({ id: editingFaq.id, data }, { onSuccess: resetDialog });
    } else {
      createFaq.mutate(data, { onSuccess: resetDialog });
    }
  };

  const handleDelete = () => {
    if (deletingFaq) {
      deleteFaq.mutate(deletingFaq.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeletingFaq(null);
        },
      });
    }
  };

  return (
    <>
      {/* Header with Add Button */}
      <div className="flex items-center justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => resetDialog()}
              disabled={categories.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingFaq ? 'Edit FAQ' : 'Create FAQ'}
              </DialogTitle>
              <DialogDescription>
                {editingFaq
                  ? 'Update FAQ details'
                  : 'Add a new frequently asked question'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={faqCategoryId} onValueChange={setFaqCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="e.g., How do I create an account?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="Provide a detailed answer..."
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="faqOrder">Display Order</Label>
                  <Input
                    id="faqOrder"
                    type="number"
                    value={faqOrder}
                    onChange={(e) => setFaqOrder(parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>

                <div className="flex items-center justify-between space-y-0 pt-6">
                  <Label htmlFor="faqActive">Active</Label>
                  <Switch
                    id="faqActive"
                    checked={faqActive}
                    onCheckedChange={setFaqActive}
                  />
                </div>

                <div className="flex items-center justify-between space-y-0 pt-6">
                  <Label htmlFor="faqFeatured">Featured</Label>
                  <Switch
                    id="faqFeatured"
                    checked={faqFeatured}
                    onCheckedChange={setFaqFeatured}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !faqQuestion ||
                  !faqAnswer ||
                  !faqCategoryId ||
                  createFaq.isPending ||
                  updateFaq.isPending
                }
              >
                {createFaq.isPending || updateFaq.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingFaq ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : faqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <HelpCircle className="mb-4 h-12 w-12" />
              <p>No FAQs found</p>
              {categories.length === 0 && (
                <p className="mt-2 text-sm">Create a category first</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqs.map((faq: Faq) => (
                  <TableRow key={faq.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        {faq.isFeatured && (
                          <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                        )}
                        <div>
                          <div className="font-medium line-clamp-2">
                            {faq.question}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {faq.answer}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{faq.category.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {faq.views}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={faq.isActive ? 'default' : 'secondary'}>
                        {faq.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(faq)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingFaq(faq);
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)}{' '}
            of {total} FAQs
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFaq.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
