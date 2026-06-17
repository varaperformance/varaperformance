import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAdminShopHeaderSettings,
  useUpdateAdminShopHeaderSettings,
} from '@/hooks/use-admin';

export default function AdminShopSettingsPage() {
  const { data, isLoading } = useAdminShopHeaderSettings();
  const updateSettings = useUpdateAdminShopHeaderSettings();

  const defaultMessage =
    data?.data?.freeShippingMessage || 'Free Shipping on Orders $75+';

  const [freeShippingMessage, setFreeShippingMessage] = useState<string | null>(
    null,
  );

  const displayMessage = freeShippingMessage ?? defaultMessage;

  const save = async () => {
    const message = displayMessage.trim();
    if (!message) {
      toast.error('Free shipping message is required');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        freeShippingMessage: message,
        navLinks: data?.data?.navLinks ?? [],
      });
      toast.success('Store settings updated');
    } catch {
      toast.error('Failed to update store settings');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Global configuration for the storefront experience.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Storefront Banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="free-shipping-message">Top Banner Message</Label>
              <Input
                id="free-shipping-message"
                value={displayMessage}
                onChange={(event) => setFreeShippingMessage(event.target.value)}
                placeholder="Free Shipping on Orders $75+"
              />
              <p className="text-xs text-muted-foreground">
                This message is displayed in the top bar of the shop header.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={updateSettings.isPending}>
                {updateSettings.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
