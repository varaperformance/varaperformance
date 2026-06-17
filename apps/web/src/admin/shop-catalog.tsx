import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Edit, Loader2, Plus, Power, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  useAdminBrands,
  useAdminShopCatalog,
  useAdminShopCategories,
  useDeleteAdminShopProduct,
  useUpdateAdminShopProduct,
  useUploadAdminShopProductImage,
  type AdminShopProduct,
} from '@/hooks/use-admin';

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

type EditableVariantForm = {
  id?: string;
  title: string;
  sku: string;
  priceInCents: string;
  inventoryQuantity: string;
  attributesText: string;
  images: Array<{ url: string; alt: string }>;
  optionLabels: Array<{ option: string; value: string }>;
};

export default function AdminShopCatalogPage() {
  const { data, isLoading } = useAdminShopCatalog();
  const { data: categoriesData } = useAdminShopCategories();
  const { data: brandsData } = useAdminBrands();
  const deleteProduct = useDeleteAdminShopProduct();
  const updateProduct = useUpdateAdminShopProduct();
  const uploadProductImage = useUploadAdminShopProductImage();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [uploadingEditVariantIndex, setUploadingEditVariantIndex] = useState<
    number | null
  >(null);
  const editVariantFileRefs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  );
  const [filterQuery, setFilterQuery] = useState('');
  const [deleteConfirmProduct, setDeleteConfirmProduct] =
    useState<AdminShopProduct | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editVariants, setEditVariants] = useState<EditableVariantForm[]>([]);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    categoryId: '',
    brandId: '',
    description: '',
    isFeatured: false,
    isActive: true,
  });

  const items = data?.data?.items ?? [];
  const categories = categoriesData?.data?.items ?? [];
  const brands = brandsData?.data?.items ?? [];
  const filteredItems = items.filter((item) => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const activeCount = items.filter((item) => item.isActive).length;
  const featuredCount = items.filter((item) => item.isFeatured).length;

  const toggleProductState = async (product: AdminShopProduct) => {
    try {
      await updateProduct.mutateAsync({
        productId: product.id,
        isActive: !product.isActive,
      });
      toast.success(`Product ${!product.isActive ? 'activated' : 'paused'}`);
    } catch {
      toast.error('Failed to update product state');
    }
  };

  const openEditModal = (product: AdminShopProduct) => {
    setEditingProductId(product.id);
    setEditForm({
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      brandId: product.brandId ?? '',
      description: product.description ?? '',
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });
    setEditVariants(
      product.variants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        priceInCents: String(variant.priceInCents),
        inventoryQuantity: String(
          variant.inventoryRecord?.quantityOnHand ?? variant.inventoryQuantity,
        ),
        attributesText: variant.attributes
          ? Object.entries(variant.attributes)
              .map(([key, value]) => `${key}=${value}`)
              .join(', ')
          : '',
        images: (variant.variantImages ?? []).map((img) => ({
          url: img.url,
          alt: img.alt ?? '',
        })),
        optionLabels: (variant.optionValues ?? []).map((ov) => ({
          option: ov.optionValue.option.name,
          value: ov.optionValue.label,
        })),
      })),
    );
    setEditModalOpen(true);
  };

  const addEditVariant = () => {
    setEditVariants((prev) => [
      ...prev,
      {
        title: '',
        sku: '',
        priceInCents: '',
        inventoryQuantity: '',
        attributesText: '',
        images: [],
        optionLabels: [],
      },
    ]);
  };

  const uploadEditVariantImages = async (
    variantIndex: number,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;
    setUploadingEditVariantIndex(variantIndex);
    try {
      for (const file of Array.from(files)) {
        const response = await uploadProductImage.mutateAsync(file);
        const url = response.data?.url;
        if (url) {
          setEditVariants((prev) =>
            prev.map((v, i) =>
              i === variantIndex
                ? {
                    ...v,
                    images: [
                      ...v.images,
                      {
                        url,
                        alt: v.title || file.name.replace(/\.[^/.]+$/, ''),
                      },
                    ],
                  }
                : v,
            ),
          );
        }
      }
      toast.success('Variant photo(s) uploaded');
    } catch {
      toast.error('Failed to upload variant image');
    } finally {
      setUploadingEditVariantIndex(null);
      const ref = editVariantFileRefs.current[variantIndex];
      if (ref) ref.value = '';
    }
  };

  const removeEditVariantImage = (variantIndex: number, imageIndex: number) => {
    setEditVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, images: v.images.filter((_, ii) => ii !== imageIndex) }
          : v,
      ),
    );
  };

  const removeEditVariant = (index: number) => {
    setEditVariants((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, variantIndex) => variantIndex !== index);
    });
  };

  const updateEditVariant = (
    index: number,
    field: keyof EditableVariantForm,
    value: string,
  ) => {
    setEditVariants((prev) =>
      prev.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    );
  };

  const parseAttributesInput = (value: string) => {
    const raw = value.trim();
    if (!raw)
      return { attributes: undefined as Record<string, string> | undefined };

    const attributes: Record<string, string> = {};
    const entries = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    for (const entry of entries) {
      const separatorIndex = Math.max(entry.indexOf('='), entry.indexOf(':'));
      if (separatorIndex <= 0 || separatorIndex >= entry.length - 1) {
        return {
          error: 'Attributes must be formatted as key=value, key2=value2',
        };
      }

      const key = entry.slice(0, separatorIndex).trim();
      const val = entry.slice(separatorIndex + 1).trim();
      if (!key || !val) {
        return {
          error: 'Attributes must be formatted as key=value, key2=value2',
        };
      }

      attributes[key] = val;
    }

    return {
      attributes: Object.keys(attributes).length ? attributes : undefined,
    };
  };

  const saveProductEdit = async () => {
    if (!editingProductId) return;
    if (!editForm.name.trim() || !editForm.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }
    if (!editForm.categoryId) {
      toast.error('Select a category');
      return;
    }

    if (editVariants.length === 0) {
      toast.error('Add at least one variant');
      return;
    }

    if (
      editVariants.some(
        (variant) =>
          !variant.title.trim() ||
          !variant.sku.trim() ||
          Number(variant.priceInCents) < 0 ||
          Number(variant.inventoryQuantity) < 0 ||
          Number.isNaN(Number(variant.priceInCents)) ||
          Number.isNaN(Number(variant.inventoryQuantity)),
      )
    ) {
      toast.error('Each variant needs title, SKU, valid price, and inventory');
      return;
    }

    const normalizedVariants: Array<{
      id?: string;
      title: string;
      sku: string;
      priceInCents: number;
      inventoryQuantity: number;
      attributes?: Record<string, string>;
      images?: Array<{ url: string; alt?: string; sortOrder?: number }>;
    }> = [];

    for (const variant of editVariants) {
      const parsedAttributes = parseAttributesInput(variant.attributesText);
      if (parsedAttributes.error) {
        toast.error(parsedAttributes.error);
        return;
      }

      normalizedVariants.push({
        id: variant.id,
        title: variant.title.trim(),
        sku: variant.sku.trim(),
        priceInCents: Number(variant.priceInCents),
        inventoryQuantity: Number(variant.inventoryQuantity),
        attributes: parsedAttributes.attributes,
        images: variant.images.length
          ? variant.images.map((img, imgIdx) => ({
              url: img.url,
              alt: img.alt || undefined,
              sortOrder: imgIdx,
            }))
          : undefined,
      });
    }

    try {
      await updateProduct.mutateAsync({
        productId: editingProductId,
        name: editForm.name.trim(),
        slug: editForm.slug.trim(),
        categoryId: editForm.categoryId,
        brandId: editForm.brandId || undefined,
        description: editForm.description.trim() || undefined,
        isFeatured: editForm.isFeatured,
        isActive: editForm.isActive,
        variants: normalizedVariants,
      });
      setEditModalOpen(false);
      setEditingProductId(null);
      setEditVariants([]);
      toast.success('Product updated');
    } catch {
      toast.error('Failed to update product');
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;

    try {
      await deleteProduct.mutateAsync(deleteConfirmProduct.id);
      setDeleteConfirmProduct(null);
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop Catalog</h1>
          <p className="mt-1 text-muted-foreground">
            Manage products, feature launches, and control stock-ready listings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/admin/shop/catalog/new">
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{featuredCount}</p>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setEditingProductId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details and category assignment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-product-name">Product Name</Label>
              <Input
                id="edit-product-name"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-product-slug">Slug</Label>
              <Input
                id="edit-product-slug"
                value={editForm.slug}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-product-category">Category</Label>
              <Select
                value={editForm.categoryId}
                onValueChange={(value) =>
                  setEditForm((prev) => ({ ...prev, categoryId: value }))
                }
              >
                <SelectTrigger id="edit-product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => !c.parentId)
                    .map((parent) => {
                      const subs = categories.filter(
                        (c) => c.parentId === parent.id,
                      );
                      return [parent, ...subs];
                    })
                    .flat()
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.parentId
                          ? `  └ ${category.name}`
                          : category.name}
                        {!category.isActive ? ' (inactive)' : ''}
                      </SelectItem>
                    ))}
                  {categories
                    .filter(
                      (c) =>
                        c.parentId &&
                        !categories.some((p) => p.id === c.parentId),
                    )
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                        {!category.isActive ? ' (inactive)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-product-brand">Brand (optional)</Label>
              <Select
                value={editForm.brandId || '__none__'}
                onValueChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    brandId: value === '__none__' ? '' : value,
                  }))
                }
              >
                <SelectTrigger id="edit-product-brand">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No brand</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                      {!brand.isActive ? ' (inactive)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-product-description">Description</Label>
              <Textarea
                id="edit-product-description"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            {/* Product Options (read-only) */}
            {(() => {
              const editingProduct = items.find(
                (p) => p.id === editingProductId,
              );
              const productOptions = editingProduct?.options ?? [];
              if (productOptions.length === 0) return null;
              return (
                <div className="space-y-2 md:col-span-2">
                  <Label>Options</Label>
                  <div className="flex flex-wrap gap-3 rounded-md border border-input p-3">
                    {productOptions.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {opt.name}:
                        </span>
                        <div className="flex gap-1">
                          {opt.values.map((val) => (
                            <Badge
                              key={val.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {val.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2 md:col-span-2">
              <Label>Variants</Label>
              <div className="mb-2 flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEditVariant}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Variant
                </Button>
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-input p-2">
                {editVariants.map((variant, index) => (
                  <div
                    key={`${variant.sku || 'variant'}-${index}`}
                    className="rounded-md border border-border/60 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {variant.optionLabels.length > 0
                            ? variant.title
                            : `Variant ${index + 1}`}
                        </p>
                        {variant.optionLabels.length > 0 && (
                          <div className="flex gap-1">
                            {variant.optionLabels.map((ol, olIdx) => (
                              <Badge
                                key={olIdx}
                                variant="outline"
                                className="text-xs"
                              >
                                {ol.option}: {ol.value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEditVariant(index)}
                        disabled={editVariants.length === 1}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input
                        placeholder="Variant title"
                        value={variant.title}
                        onChange={(event) =>
                          updateEditVariant(index, 'title', event.target.value)
                        }
                      />
                      <Input
                        placeholder="SKU"
                        value={variant.sku}
                        onChange={(event) =>
                          updateEditVariant(index, 'sku', event.target.value)
                        }
                      />
                      <Input
                        placeholder="Price in cents"
                        value={variant.priceInCents}
                        onChange={(event) =>
                          updateEditVariant(
                            index,
                            'priceInCents',
                            event.target.value,
                          )
                        }
                      />
                      <Input
                        placeholder="Inventory"
                        value={variant.inventoryQuantity}
                        onChange={(event) =>
                          updateEditVariant(
                            index,
                            'inventoryQuantity',
                            event.target.value,
                          )
                        }
                      />
                    </div>
                    <Input
                      className="mt-2"
                      placeholder="Attributes (e.g. size=2lb, flavor=Chocolate)"
                      value={variant.attributesText}
                      onChange={(event) =>
                        updateEditVariant(
                          index,
                          'attributesText',
                          event.target.value,
                        )
                      }
                    />

                    {/* Variant images */}
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editVariantFileRefs.current[index]?.click()
                        }
                        disabled={uploadingEditVariantIndex === index}
                      >
                        {uploadingEditVariantIndex === index ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="mr-1 h-3.5 w-3.5" />
                        )}
                        Photos
                      </Button>
                      <input
                        ref={(el) => {
                          editVariantFileRefs.current[index] = el;
                        }}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        multiple
                        onChange={(e) =>
                          uploadEditVariantImages(index, e.target.files)
                        }
                      />
                      {variant.images.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto">
                          {variant.images.map((img, imgIdx) => (
                            <div
                              key={`evi-${index}-${imgIdx}`}
                              className="relative shrink-0"
                            >
                              <img
                                src={img.url}
                                alt={img.alt}
                                className="h-10 w-10 rounded object-cover"
                              />
                              <button
                                type="button"
                                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                                onClick={() =>
                                  removeEditVariantImage(index, imgIdx)
                                }
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Save changes to persist all variant edits.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <label className="inline-flex items-center gap-2 rounded-md border border-input px-3 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      isActive: event.target.checked,
                    }))
                  }
                />
                Active
              </label>
              <label className="inline-flex items-center gap-2 rounded-md border border-input px-3 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.isFeatured}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      isFeatured: event.target.checked,
                    }))
                  }
                />
                Featured
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveProductEdit}
              disabled={updateProduct.isPending}
            >
              {updateProduct.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>Catalog Products</CardTitle>
            <Input
              className="md:w-72"
              placeholder="Filter by name, slug, category"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No products found. Create your first product or adjust
                      filters.
                    </TableCell>
                  </TableRow>
                )}
                {filteredItems.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.slug}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {product.brand?.name ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.variants.length}</TableCell>
                    <TableCell>
                      {product.variants.reduce(
                        (sum, variant) =>
                          sum +
                          (variant.inventoryRecord?.quantityOnHand ??
                            variant.inventoryQuantity),
                        0,
                      )}
                    </TableCell>
                    <TableCell>
                      {product.variants[0]
                        ? formatCurrency(product.variants[0].priceInCents)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={product.isActive ? 'default' : 'secondary'}
                        >
                          {product.isActive ? 'Active' : 'Paused'}
                        </Badge>
                        {product.isFeatured && (
                          <Badge variant="secondary">Featured</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openEditModal(product)}
                          aria-label={`Edit ${product.name}`}
                          title={`Edit ${product.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => toggleProductState(product)}
                          aria-label={
                            product.isActive
                              ? `Pause ${product.name}`
                              : `Activate ${product.name}`
                          }
                          title={
                            product.isActive
                              ? `Pause ${product.name}`
                              : `Activate ${product.name}`
                          }
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmProduct(product)}
                          aria-label={`Delete ${product.name}`}
                          title={`Delete ${product.name}`}
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

      <Dialog
        open={deleteConfirmProduct !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmProduct(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              This permanently deletes {deleteConfirmProduct?.name} and its
              variants/images.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmProduct(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteProduct}
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
