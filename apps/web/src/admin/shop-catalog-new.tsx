import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Grid,
  Image,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAdminBrands,
  useAdminShopCategories,
  useCreateAdminShopCategory,
  useCreateAdminShopProduct,
  useUploadAdminShopProductImage,
} from '@/hooks/use-admin';

const STEPS = [
  {
    id: 1,
    title: 'Details',
    icon: ClipboardList,
    description: 'Name, category & listing options',
  },
  {
    id: 2,
    title: 'Options & Variants',
    icon: Layers,
    description: 'Define options, then add inventory items (SKUs)',
  },
  {
    id: 3,
    title: 'Photos',
    icon: Image,
    description: 'Upload product images',
  },
  {
    id: 4,
    title: 'Review',
    icon: Check,
    description: 'Confirm & create',
  },
];

type OptionDraft = { name: string; values: string[] };

type VariantDraft = {
  title: string;
  sku: string;
  priceInCents: string;
  inventoryQuantity: string;
  selections: Record<string, string>;
  images: Array<{ url: string; alt: string }>;
};

function buildVariantTitle(selections: Record<string, string>): string {
  const vals = Object.values(selections).filter(Boolean);
  return vals.length > 0 ? vals.join(' / ') : '';
}

function variantComboKey(selections: Record<string, string>): string {
  return Object.entries(selections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}::${v}`)
    .join('|');
}

const formatCurrency = (valueInCents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(valueInCents / 100);

export default function AdminShopCatalogNewPage() {
  const navigate = useNavigate();
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useAdminShopCategories();
  const { data: brandsData } = useAdminBrands();
  const createCategory = useCreateAdminShopCategory();
  const createProduct = useCreateAdminShopProduct();
  const uploadProductImage = useUploadAdminShopProductImage();

  const [currentStep, setCurrentStep] = useState(1);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<
    number | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const variantFileInputRefs = useRef<Record<number, HTMLInputElement | null>>(
    {},
  );

  const [form, setForm] = useState({
    name: '',
    slug: '',
    categoryId: '',
    brandId: '',
    description: '',
    isFeatured: false,
    isActive: true,
  });
  const [images, setImages] = useState<Array<{ url: string; alt: string }>>([]);

  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionValue, setNewOptionValue] = useState<Record<number, string>>(
    {},
  );
  const [variants, setVariants] = useState<VariantDraft[]>([
    {
      title: 'Default',
      sku: '',
      priceInCents: '',
      inventoryQuantity: '',
      selections: {},
      images: [],
    },
  ]);

  const filledOptions = options.filter((o) => o.values.length > 0);
  const hasOptions = filledOptions.length > 0;

  const categories = categoriesData?.data?.items ?? [];
  const brands = brandsData?.data?.items ?? [];
  const progress = (currentStep / STEPS.length) * 100;

  // ── Validation ──────────────────────────────────────────────

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(form.name.trim() && form.slug.trim() && form.categoryId);
      case 2:
        return (
          variants.length > 0 &&
          variants.every(
            (v) =>
              v.title.trim() &&
              v.sku.trim() &&
              !Number.isNaN(Number(v.priceInCents)) &&
              Number(v.priceInCents) >= 0 &&
              !Number.isNaN(Number(v.inventoryQuantity)) &&
              Number(v.inventoryQuantity) >= 0,
          )
        );
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceed()) {
      toast.error('Name, slug, and category are required');
      return;
    }
    if (currentStep === 2 && !canProceed()) {
      toast.error('Each variant needs title, SKU, valid price, and inventory');
      return;
    }
    if (currentStep < STEPS.length) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  // ── Category helpers ────────────────────────────────────────

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }
    try {
      const response = await createCategory.mutateAsync({ name });
      const created = response.data?.category;
      if (created?.id) {
        setForm((prev) => ({ ...prev, categoryId: created.id }));
      }
      setNewCategoryName('');
      toast.success('Category created');
    } catch {
      toast.error('Unable to create category');
    }
  };

  // ── Image helpers ───────────────────────────────────────────

  const uploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingCount(files.length);
    try {
      for (const file of Array.from(files)) {
        const response = await uploadProductImage.mutateAsync(file);
        const url = response.data?.url;
        if (url) {
          setImages((prev) => [
            ...prev,
            { url, alt: form.name || file.name.replace(/\.[^/.]+$/, '') },
          ]);
        }
      }
      toast.success('Photo upload complete');
    } catch {
      toast.error('Failed to upload one or more photos');
    } finally {
      setUploadingCount(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const uploadVariantImages = async (
    variantIndex: number,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;
    setUploadingVariantIndex(variantIndex);
    try {
      for (const file of Array.from(files)) {
        const response = await uploadProductImage.mutateAsync(file);
        const url = response.data?.url;
        if (url) {
          setVariants((prev) =>
            prev.map((v, i) =>
              i === variantIndex
                ? {
                    ...v,
                    images: [
                      ...v.images,
                      {
                        url,
                        alt:
                          v.title ||
                          form.name ||
                          file.name.replace(/\.[^/.]+$/, ''),
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
      setUploadingVariantIndex(null);
      const ref = variantFileInputRefs.current[variantIndex];
      if (ref) ref.value = '';
    }
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, images: v.images.filter((_, ii) => ii !== imageIndex) }
          : v,
      ),
    );
  };

  // ── Option helpers ──────────────────────────────────────────

  const addOption = () => {
    const name = newOptionName.trim();
    if (!name) {
      toast.error('Option name is required');
      return;
    }
    if (options.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Option already exists');
      return;
    }
    setOptions((prev) => [...prev, { name, values: [] }]);
    setNewOptionName('');
  };

  const removeOption = (index: number) => {
    const removedName = options[index].name;
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setVariants((prev) =>
      prev.map((v) => {
        const next = { ...v.selections };
        delete next[removedName];
        return { ...v, selections: next, title: buildVariantTitle(next) };
      }),
    );
  };

  const addOptionValue = (optionIndex: number) => {
    const value = (newOptionValue[optionIndex] ?? '').trim();
    if (!value) return;
    const opt = options[optionIndex];
    if (opt.values.includes(value)) return;
    setOptions((prev) =>
      prev.map((o, i) =>
        i === optionIndex ? { ...o, values: [...o.values, value] } : o,
      ),
    );
    setNewOptionValue((prev) => ({ ...prev, [optionIndex]: '' }));
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const optName = options[optionIndex].name;
    const removedValue = options[optionIndex].values[valueIndex];
    setOptions((prev) =>
      prev.map((o, i) =>
        i === optionIndex
          ? { ...o, values: o.values.filter((_, vi) => vi !== valueIndex) }
          : o,
      ),
    );
    setVariants((prev) =>
      prev
        .filter((v) => v.selections[optName] !== removedValue)
        .map((v) => {
          if (v.selections[optName] === removedValue) {
            const next = { ...v.selections };
            delete next[optName];
            return { ...v, selections: next, title: buildVariantTitle(next) };
          }
          return v;
        }),
    );
  };

  // ── Variant helpers ─────────────────────────────────────────

  const addVariant = () => {
    const emptySelections: Record<string, string> = {};
    for (const opt of filledOptions) {
      emptySelections[opt.name] = '';
    }
    setVariants((prev) => [
      ...prev,
      {
        title: '',
        sku: '',
        priceInCents: '',
        inventoryQuantity: '',
        selections: emptySelections,
        images: [],
      },
    ]);
  };

  const removeVariant = (index: number) =>
    setVariants((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });

  const updateVariantField = (
    index: number,
    field: 'title' | 'sku' | 'priceInCents' | 'inventoryQuantity',
    value: string,
  ) =>
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );

  const updateVariantSelection = (
    index: number,
    optionName: string,
    value: string,
  ) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        const next = { ...v.selections, [optionName]: value };
        return { ...v, selections: next, title: buildVariantTitle(next) };
      }),
    );
  };

  const generateAllCombinations = () => {
    if (filledOptions.length === 0) {
      toast.error('Define at least one option with values first');
      return;
    }

    const arrays = filledOptions.map((o) => o.values);
    const combos = arrays.reduce<string[][]>(
      (acc, curr) => acc.flatMap((a) => curr.map((v) => [...a, v])),
      [[]],
    );

    const existingKeys = new Set(
      variants.map((v) => variantComboKey(v.selections)),
    );

    let added = 0;
    const newVariants: VariantDraft[] = [];
    for (const combo of combos) {
      const selections: Record<string, string> = {};
      filledOptions.forEach((opt, idx) => {
        selections[opt.name] = combo[idx];
      });
      const key = variantComboKey(selections);
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      newVariants.push({
        title: buildVariantTitle(selections),
        sku: '',
        priceInCents: '',
        inventoryQuantity: '',
        selections,
        images: [],
      });
      added++;
    }

    if (added === 0) {
      toast.info('All combinations already exist');
      return;
    }

    setVariants((prev) => {
      const filtered = prev.filter(
        (v) =>
          v.sku.trim() ||
          Object.values(v.selections).some(Boolean) ||
          v.images.length > 0,
      );
      return [...filtered, ...newVariants];
    });
    toast.success(`Generated ${added} variant${added > 1 ? 's' : ''}`);
  };

  // ── Submit ──────────────────────────────────────────────────

  const submit = async () => {
    try {
      const optionsPayload =
        filledOptions.length > 0
          ? filledOptions.map((o, i) => ({
              name: o.name,
              sortOrder: i,
              values: o.values.map((v, vi) => ({ label: v, sortOrder: vi })),
            }))
          : undefined;

      await createProduct.mutateAsync({
        name: form.name.trim(),
        slug: form.slug.trim(),
        categoryId: form.categoryId,
        brandId: form.brandId || undefined,
        description: form.description.trim() || undefined,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        options: optionsPayload,
        images: images.length
          ? images.map((img, i) => ({
              url: img.url,
              alt: img.alt || undefined,
              sortOrder: i,
            }))
          : undefined,
        variants: variants.map((v) => {
          const sels = Object.entries(v.selections).filter(([, val]) => val);
          return {
            title: v.title.trim(),
            sku: v.sku.trim(),
            priceInCents: Number(v.priceInCents),
            inventoryQuantity: Number(v.inventoryQuantity),
            optionSelections:
              sels.length > 0
                ? sels.map(([optionName, value]) => ({ optionName, value }))
                : undefined,
            images: v.images.length
              ? v.images.map((img, imgIdx) => ({
                  url: img.url,
                  alt: img.alt || undefined,
                  sortOrder: imgIdx,
                }))
              : undefined,
          };
        }),
      });
      toast.success('Product created');
      navigate('/admin/shop/catalog');
    } catch {
      toast.error('Unable to create product');
    }
  };

  const categoryLabel = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  const brandLabel = (id: string) =>
    brands.find((b) => b.id === id)?.name ?? '';

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          New Product
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Add a New Product</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Fill in product details, add inventory items, and upload photos.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-4">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-1 transition-colors',
                  isActive && 'text-primary',
                  isCompleted && 'text-primary',
                  !isActive && !isCompleted && 'text-muted-foreground',
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    isActive && 'border-primary bg-primary/10',
                    isCompleted &&
                      'border-primary bg-primary text-primary-foreground',
                    !isActive && !isCompleted && 'border-muted',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs font-medium hidden sm:block">
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = STEPS[currentStep - 1].icon;
              return <StepIcon className="h-5 w-5 text-primary" />;
            })()}
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ──────── Step 1: Details ──────── */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wizard-name">Product Name</Label>
                  <Input
                    id="wizard-name"
                    placeholder="e.g. Nitro Surge Pre-Workout"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-slug">Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      id="wizard-slug"
                      placeholder="nitro-surge-pre-workout"
                      value={form.slug}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, slug: e.target.value }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          slug: p.name
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, ''),
                        }))
                      }
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-category">Category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, categoryId: v }))
                  }
                >
                  <SelectTrigger id="wizard-category">
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
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.parentId ? `  └ ${cat.name}` : cat.name}
                          {!cat.isActive ? ' (inactive)' : ''}
                        </SelectItem>
                      ))}
                    {categories
                      .filter(
                        (c) =>
                          c.parentId &&
                          !categories.some((p) => p.id === c.parentId),
                      )
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                          {!cat.isActive ? ' (inactive)' : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {categories.length === 0 && !isCategoriesLoading && (
                  <p className="text-xs text-muted-foreground">
                    No categories found. Create one below first.
                  </p>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCategory}
                    disabled={createCategory.isPending}
                  >
                    {createCategory.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
                {isCategoriesLoading && (
                  <p className="text-xs text-muted-foreground">
                    Loading categories...
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-brand">Brand (optional)</Label>
                <Select
                  value={form.brandId}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      brandId: v === '__none__' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger id="wizard-brand">
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

              <div className="space-y-2">
                <Label htmlFor="wizard-description">Description</Label>
                <Textarea
                  id="wizard-description"
                  placeholder="Product description (optional)"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>

              <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isActive: true }))}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    form.isActive
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, isActive: false }))}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    !form.isActive
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Inactive
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, isFeatured: !p.isFeatured }))
                  }
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    form.isFeatured
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Featured
                </button>
              </div>
            </div>
          )}

          {/* ──────── Step 2: Options & Variants ──────── */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Options Editor */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">
                    Product Options
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define option axes like Color, Size, or Flavor. Then add
                    inventory items below and assign option values to each. Skip
                    for simple single-SKU products.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Option name (e.g. Size, Color, Flavor)"
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addOption}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                </div>

                {options.length > 0 && (
                  <div className="space-y-3">
                    {options.map((option, oi) => (
                      <div
                        key={`option-${oi}`}
                        className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold">{option.name}</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeOption(oi)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {option.values.map((value, vi) => (
                            <Badge
                              key={`${oi}-${vi}`}
                              variant="secondary"
                              className="gap-1 pr-1"
                            >
                              {value}
                              <button
                                type="button"
                                className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                                onClick={() => removeOptionValue(oi, vi)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {option.values.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              Add values so variants can reference them.
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Input
                            placeholder={`Add ${option.name.toLowerCase()} value`}
                            value={newOptionValue[oi] ?? ''}
                            onChange={(e) =>
                              setNewOptionValue((prev) => ({
                                ...prev,
                                [oi]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addOptionValue(oi);
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOptionValue(oi)}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Variants (Inventory Items) */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Inventory Items (Variants)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {hasOptions
                        ? 'Each item is a specific SKU. Pick option values, then set price and stock.'
                        : 'No options defined — add variants manually.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {hasOptions && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateAllCombinations}
                      >
                        <Grid className="mr-2 h-4 w-4" />
                        Generate All
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addVariant}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add SKU
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div
                      key={`variant-${index}`}
                      className={cn(
                        'rounded-lg border-2 p-4 transition-all',
                        variant.sku.trim()
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border',
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">
                            {variant.title || `Variant ${index + 1}`}
                          </p>
                          {hasOptions &&
                            Object.values(variant.selections).some(Boolean) && (
                              <div className="flex gap-1">
                                {Object.entries(variant.selections)
                                  .filter(([, v]) => v)
                                  .map(([optName, val]) => (
                                    <Badge
                                      key={optName}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {val}
                                    </Badge>
                                  ))}
                              </div>
                            )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeVariant(index)}
                          disabled={variants.length === 1}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>

                      {/* Option dropdowns */}
                      {hasOptions && (
                        <div className="grid gap-3 sm:grid-cols-2 mb-3">
                          {filledOptions.map((opt) => (
                            <div key={opt.name} className="space-y-1">
                              <Label className="text-xs">{opt.name}</Label>
                              <Select
                                value={variant.selections[opt.name] || ''}
                                onValueChange={(v) =>
                                  updateVariantSelection(
                                    index,
                                    opt.name,
                                    v === '__unset__' ? '' : v,
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={`Select ${opt.name.toLowerCase()}`}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__unset__">
                                    -- None --
                                  </SelectItem>
                                  {opt.values.map((val) => (
                                    <SelectItem key={val} value={val}>
                                      {val}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}

                      <div
                        className={cn(
                          'grid gap-3',
                          hasOptions ? 'sm:grid-cols-3' : 'sm:grid-cols-4',
                        )}
                      >
                        {!hasOptions && (
                          <div className="space-y-1">
                            <Label className="text-xs">Title</Label>
                            <Input
                              placeholder="e.g. Classic"
                              value={variant.title}
                              onChange={(e) =>
                                updateVariantField(
                                  index,
                                  'title',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">SKU</Label>
                          <Input
                            placeholder="e.g. LUFFY-BLK-S"
                            value={variant.sku}
                            onChange={(e) =>
                              updateVariantField(index, 'sku', e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Price (cents)</Label>
                          <Input
                            placeholder="2999"
                            value={variant.priceInCents}
                            onChange={(e) =>
                              updateVariantField(
                                index,
                                'priceInCents',
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Inventory</Label>
                          <Input
                            placeholder="100"
                            value={variant.inventoryQuantity}
                            onChange={(e) =>
                              updateVariantField(
                                index,
                                'inventoryQuantity',
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Variant Images */}
                      <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Photos</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              variantFileInputRefs.current[index]?.click()
                            }
                            disabled={uploadingVariantIndex === index}
                          >
                            {uploadingVariantIndex === index ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="mr-1 h-3.5 w-3.5" />
                            )}
                            Upload
                          </Button>
                          <input
                            ref={(el) => {
                              variantFileInputRefs.current[index] = el;
                            }}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            multiple
                            onChange={(e) =>
                              uploadVariantImages(index, e.target.files)
                            }
                          />
                        </div>
                        {variant.images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto">
                            {variant.images.map((img, imgIdx) => (
                              <div
                                key={`vi-${index}-${imgIdx}`}
                                className="relative shrink-0"
                              >
                                <img
                                  src={img.url}
                                  alt={img.alt}
                                  className="h-16 w-16 rounded-md object-cover"
                                />
                                <button
                                  type="button"
                                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                                  onClick={() =>
                                    removeVariantImage(index, imgIdx)
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──────── Step 3: Photos ──────── */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Upload product-level hero images. These show as the default
                  gallery. You can skip this step.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCount > 0}
                >
                  {uploadingCount > 0 ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  multiple
                  onChange={(e) => uploadImages(e.target.files)}
                />
              </div>

              {images.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-muted-foreground hover:border-primary/50 transition-colors"
                >
                  <Image className="h-10 w-10" />
                  <span className="text-sm font-medium">
                    Click or drag to upload product photos
                  </span>
                  <span className="text-xs">JPEG, PNG, or WebP up to 10MB</span>
                </button>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      className="space-y-2 rounded-lg border p-3"
                    >
                      <img
                        src={image.url}
                        alt={image.alt || `Product image ${index + 1}`}
                        className="h-32 w-full rounded-md object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <Input
                        placeholder="Alt text"
                        value={image.alt}
                        onChange={(e) =>
                          setImages((prev) =>
                            prev.map((item, i) =>
                              i === index
                                ? { ...item, alt: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() =>
                          setImages((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────── Step 4: Review ──────── */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Product Info */}
              <Card className="bg-linear-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Product</p>
                      <p className="text-lg font-bold">{form.name}</p>
                    </div>
                  </div>
                  <div className="border-t border-blue-500/20 pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Slug</span>
                      <span className="font-medium">{form.slug}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-medium">
                        {categoryLabel(form.categoryId)}
                      </span>
                    </div>
                    {form.brandId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brand</span>
                        <span className="font-medium">
                          {brandLabel(form.brandId)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium">
                        {form.isActive ? 'Active' : 'Inactive'}
                        {form.isFeatured ? ' · Featured' : ''}
                      </span>
                    </div>
                    {form.description.trim() && (
                      <div className="pt-2">
                        <span className="text-muted-foreground">
                          Description
                        </span>
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {form.description}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Options + Variants */}
              <Card className="bg-linear-to-br from-purple-500/10 to-orange-500/10 border-purple-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {hasOptions ? 'Options & Inventory' : 'Inventory'}
                      </p>
                      <p className="text-lg font-bold">
                        {variants.length} SKU
                        {variants.length > 1 ? 's' : ''}
                        {hasOptions
                          ? ` across ${filledOptions.length} option${filledOptions.length > 1 ? 's' : ''}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  {hasOptions && (
                    <div className="border-t border-purple-500/20 pt-4 mb-4 space-y-2 text-sm">
                      {filledOptions.map((o, i) => (
                        <div
                          key={`review-opt-${i}`}
                          className="flex items-center justify-between rounded-lg bg-background/60 p-3"
                        >
                          <p className="font-medium">{o.name}</p>
                          <div className="flex flex-wrap gap-1">
                            {o.values.map((v, vi) => (
                              <Badge key={vi} variant="secondary">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-orange-500/20 pt-4 space-y-3 text-sm">
                    {variants.map((v, i) => (
                      <div
                        key={`review-${v.sku}-${i}`}
                        className="rounded-lg bg-background/60 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{v.title}</p>
                              {hasOptions &&
                                Object.entries(v.selections)
                                  .filter(([, val]) => val)
                                  .map(([optName, val]) => (
                                    <Badge
                                      key={optName}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {optName}: {val}
                                    </Badge>
                                  ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              SKU: {v.sku}
                              {v.images.length > 0
                                ? ` · ${v.images.length} photo${v.images.length > 1 ? 's' : ''}`
                                : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency(Number(v.priceInCents))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {v.inventoryQuantity} in stock
                            </p>
                          </div>
                        </div>
                        {v.images.length > 0 && (
                          <div className="mt-2 flex gap-1.5 overflow-x-auto">
                            {v.images.map((img, imgIdx) => (
                              <img
                                key={`rv-${i}-${imgIdx}`}
                                src={img.url}
                                alt={img.alt}
                                className="h-10 w-10 rounded object-cover shrink-0"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Photos */}
              {images.length > 0 && (
                <Card className="bg-linear-to-br from-cyan-500/10 to-sky-500/10 border-cyan-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Image className="h-5 w-5 text-cyan-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Product Photos
                        </p>
                        <p className="text-lg font-bold">
                          {images.length} image
                          {images.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-cyan-500/20 pt-4 flex gap-2 overflow-x-auto">
                      {images.map((img, i) => (
                        <img
                          key={`${img.url}-${i}`}
                          src={img.url}
                          alt={img.alt}
                          className="h-16 w-16 rounded-md object-cover shrink-0"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={
            currentStep === 1
              ? () => navigate('/admin/shop/catalog')
              : handleBack
          }
          disabled={createProduct.isPending}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={createProduct.isPending || uploadingCount > 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {createProduct.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Product
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
