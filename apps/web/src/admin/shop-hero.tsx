import { useRef, useState } from 'react';
import {
  Edit,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAdminHeroBanners,
  useCreateAdminHeroBanner,
  useUpdateAdminHeroBanner,
  useDeleteAdminHeroBanner,
  useUploadAdminShopProductImage,
} from '@/hooks/use-admin';

export default function AdminShopHeroPage() {
  const { data, isLoading } = useAdminHeroBanners();
  const createBanner = useCreateAdminHeroBanner();
  const updateBanner = useUpdateAdminHeroBanner();
  const deleteBanner = useDeleteAdminHeroBanner();
  const uploadImage = useUploadAdminShopProductImage();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<{
    id: string;
    imageUrl: string;
    linkUrl: string;
    alt: string;
    isActive: boolean;
    sortOrder: number;
  } | null>(null);

  const [createForm, setCreateForm] = useState({
    imageUrl: '',
    linkUrl: '',
    alt: '',
    sortOrder: 0,
  });

  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const banners = data?.data?.items ?? [];

  const handleCreateUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadImage.mutateAsync(file);
      setCreateForm((prev) => ({ ...prev, imageUrl: result.data.url }));
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleEditUpload = async (file: File) => {
    if (!editingBanner) return;
    setUploading(true);
    try {
      const result = await uploadImage.mutateAsync(file);
      setEditingBanner((prev) =>
        prev ? { ...prev, imageUrl: result.data.url } : null,
      );
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.imageUrl.trim()) {
      toast.error('Please upload a banner image');
      return;
    }
    if (!createForm.linkUrl.trim()) {
      toast.error('Link URL is required');
      return;
    }
    try {
      await createBanner.mutateAsync({
        imageUrl: createForm.imageUrl,
        linkUrl: createForm.linkUrl,
        alt: createForm.alt || undefined,
        sortOrder: createForm.sortOrder,
      });
      toast.success('Banner created');
      setShowCreateDialog(false);
      setCreateForm({ imageUrl: '', linkUrl: '', alt: '', sortOrder: 0 });
    } catch {
      toast.error('Failed to create banner');
    }
  };

  const handleUpdate = async () => {
    if (!editingBanner) return;
    try {
      await updateBanner.mutateAsync({
        bannerId: editingBanner.id,
        imageUrl: editingBanner.imageUrl,
        linkUrl: editingBanner.linkUrl,
        alt: editingBanner.alt || null,
        isActive: editingBanner.isActive,
        sortOrder: editingBanner.sortOrder,
      });
      toast.success('Banner updated');
      setEditingBanner(null);
    } catch {
      toast.error('Failed to update banner');
    }
  };

  const handleDelete = async (bannerId: string) => {
    try {
      await deleteBanner.mutateAsync(bannerId);
      toast.success('Banner deleted');
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  const handleToggleActive = async (bannerId: string, isActive: boolean) => {
    try {
      await updateBanner.mutateAsync({ bannerId, isActive });
    } catch {
      toast.error('Failed to toggle banner');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hero Banners</h1>
          <p className="mt-1 text-muted-foreground">
            Manage the rotating hero carousel on the shop page. Each banner is a
            full-width image that links wherever you want.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : banners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <ImagePlus className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-semibold">No hero banners yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first banner to display a hero carousel on the shop.
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Banner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden">
              <div className="flex items-stretch">
                <div className="flex w-10 shrink-0 items-center justify-center border-r border-border/50 bg-muted/30">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="relative h-36 w-64 shrink-0 overflow-hidden border-r border-border/50 sm:w-80">
                  <img
                    src={banner.imageUrl}
                    alt={banner.alt || 'Hero banner'}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="flex flex-1 items-center justify-between gap-4 p-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={banner.isActive ? 'default' : 'secondary'}
                      >
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Order: {banner.sortOrder}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium">
                      {banner.linkUrl}
                    </p>
                    {banner.alt && (
                      <p className="truncate text-xs text-muted-foreground">
                        Alt: {banner.alt}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={banner.isActive}
                      onCheckedChange={(checked) =>
                        handleToggleActive(banner.id, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setEditingBanner({
                          id: banner.id,
                          imageUrl: banner.imageUrl,
                          linkUrl: banner.linkUrl,
                          alt: banner.alt || '',
                          isActive: banner.isActive,
                          sortOrder: banner.sortOrder,
                        })
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(banner.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Hero Banner</DialogTitle>
            <DialogDescription>
              Upload an image and set where it links to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <input
                ref={createFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCreateUpload(file);
                  e.target.value = '';
                }}
              />
              {createForm.imageUrl ? (
                <div className="relative overflow-hidden rounded-lg border border-border">
                  <img
                    src={createForm.imageUrl}
                    alt="Preview"
                    className="h-40 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={() =>
                      setCreateForm((prev) => ({ ...prev, imageUrl: '' }))
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => createFileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-link">Link URL</Label>
              <Input
                id="create-link"
                placeholder="/shop?category=Protein"
                value={createForm.linkUrl}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    linkUrl: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Where the banner links to when clicked, e.g. /shop?category=All
                or /shop/product/my-product
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-alt">Alt Text (optional)</Label>
              <Input
                id="create-alt"
                placeholder="Spring sale banner"
                value={createForm.alt}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, alt: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sort">Sort Order</Label>
              <Input
                id="create-sort"
                type="number"
                value={createForm.sortOrder}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    sortOrder: Number(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createBanner.isPending || uploading}
              >
                {createBanner.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Banner
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={Boolean(editingBanner)}
        onOpenChange={(open) => {
          if (!open) setEditingBanner(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Hero Banner</DialogTitle>
            <DialogDescription>
              Update the banner image or link.
            </DialogDescription>
          </DialogHeader>
          {editingBanner && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Banner Image</Label>
                <input
                  ref={editFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleEditUpload(file);
                    e.target.value = '';
                  }}
                />
                <div className="relative overflow-hidden rounded-lg border border-border">
                  <img
                    src={editingBanner.imageUrl}
                    alt="Preview"
                    className="h-40 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    disabled={uploading}
                    onClick={() => editFileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Replace
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-link">Link URL</Label>
                <Input
                  id="edit-link"
                  value={editingBanner.linkUrl}
                  onChange={(e) =>
                    setEditingBanner((prev) =>
                      prev ? { ...prev, linkUrl: e.target.value } : null,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-alt">Alt Text (optional)</Label>
                <Input
                  id="edit-alt"
                  value={editingBanner.alt}
                  onChange={(e) =>
                    setEditingBanner((prev) =>
                      prev ? { ...prev, alt: e.target.value } : null,
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sort">Sort Order</Label>
                  <Input
                    id="edit-sort"
                    type="number"
                    value={editingBanner.sortOrder}
                    onChange={(e) =>
                      setEditingBanner((prev) =>
                        prev
                          ? {
                              ...prev,
                              sortOrder: Number(e.target.value) || 0,
                            }
                          : null,
                      )
                    }
                  />
                </div>
                <div className="flex items-end gap-2 pb-0.5">
                  <Switch
                    id="edit-active"
                    checked={editingBanner.isActive}
                    onCheckedChange={(checked) =>
                      setEditingBanner((prev) =>
                        prev ? { ...prev, isActive: checked } : null,
                      )
                    }
                  />
                  <Label htmlFor="edit-active">Active</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingBanner(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updateBanner.isPending || uploading}
                >
                  {updateBanner.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
