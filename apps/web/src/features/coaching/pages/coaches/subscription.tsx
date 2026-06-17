import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCoachTierSubscription,
  useCoachTierCheckout,
  useCoachTierCancelEligibility,
  useCancelCoachTierSubscription,
} from '@/features/coaching';

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  ACTIVE: { label: 'Active', variant: 'default' },
  PENDING: { label: 'Pending', variant: 'secondary' },
  PAST_DUE: { label: 'Past Due', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' },
  PAUSED: { label: 'Paused', variant: 'secondary' },
};

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CoachSubscriptionPage() {
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');

  const { data: subscription, isLoading } = useCoachTierSubscription();
  const checkout = useCoachTierCheckout();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { data: eligibility, isLoading: isLoadingEligibility } =
    useCoachTierCancelEligibility(showCancelDialog);
  const cancelMutation = useCancelCoachTierSubscription();

  const handleCheckout = async () => {
    try {
      const result = await checkout.mutateAsync();
      window.location.href = result.checkoutUrl;
    } catch {
      toast.error('Failed to create checkout session. Please try again.');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync();
      setShowCancelDialog(false);
      toast.success(
        'Your subscription will be cancelled at the end of the current billing period.',
      );
    } catch {
      toast.error('Failed to cancel subscription. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasActiveSubscription =
    subscription && ['ACTIVE', 'PAST_DUE'].includes(subscription.status);

  const isScheduledForCancellation = !!subscription?.scheduledCancellationAt;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your coach tier subscription and billing.
        </p>
      </div>

      {checkoutStatus === 'success' && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Your subscription has been activated successfully!
            </p>
          </CardContent>
        </Card>
      )}

      {checkoutStatus === 'cancel' && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              Checkout was cancelled. You can try again when you&apos;re ready.
            </p>
          </CardContent>
        </Card>
      )}

      {!subscription || subscription.status === 'CANCELLED' ? (
        <NoSubscriptionCard
          onCheckout={handleCheckout}
          isLoading={checkout.isPending}
        />
      ) : (
        <>
          <SubscriptionDetailsCard
            subscription={subscription}
            isScheduledForCancellation={isScheduledForCancellation}
          />

          {hasActiveSubscription && !isScheduledForCancellation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cancel Subscription</CardTitle>
                <CardDescription>
                  Cancel your coach tier subscription. Your access will continue
                  until the end of the current billing period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Subscription
                </Button>
              </CardContent>
            </Card>
          )}

          {isScheduledForCancellation && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="flex items-center gap-3 pt-6">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    Cancellation Scheduled
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your subscription will end on{' '}
                    {formatDate(subscription.scheduledCancellationAt)}.
                    You&apos;ll retain access until then.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              {isLoadingEligibility ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking eligibility...
                </span>
              ) : eligibility && !eligibility.canCancel ? (
                <span className="space-y-2">
                  <span className="flex items-center gap-2 font-medium text-destructive">
                    <XCircle className="h-4 w-4" />
                    You cannot cancel your subscription yet:
                  </span>
                  <span className="flex flex-col gap-1">
                    {eligibility.reasons.map((reason: string, i: number) => (
                      <span key={i} className="text-sm text-muted-foreground">
                        • {reason}
                      </span>
                    ))}
                  </span>
                </span>
              ) : (
                'Your subscription will be cancelled at the end of the current billing period. You will retain access until then. This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={
                isLoadingEligibility ||
                (eligibility != null && !eligibility.canCancel) ||
                cancelMutation.isPending
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {cancelMutation.isPending
                ? 'Cancelling...'
                : 'Yes, Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NoSubscriptionCard({
  onCheckout,
  isLoading,
}: {
  onCheckout: () => void;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Get Started as a Coach</CardTitle>
        <CardDescription>
          Subscribe to the Coach tier to start accepting clients and grow your
          coaching business on Vara Performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">$19.99</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <Button onClick={onCheckout} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Redirecting to checkout...' : 'Subscribe Now'}
        </Button>
      </CardContent>
    </Card>
  );
}

function SubscriptionDetailsCard({
  subscription,
  isScheduledForCancellation,
}: {
  subscription: NonNullable<
    ReturnType<typeof useCoachTierSubscription>['data']
  >;
  isScheduledForCancellation: boolean;
}) {
  const isMobile = useIsMobile();
  const status = statusConfig[subscription.status] ?? {
    label: subscription.status,
    variant: 'secondary' as const,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{subscription.pricingPlan.name}</CardTitle>
            <CardDescription>
              {subscription.pricingPlan.description}
            </CardDescription>
          </div>
          <Badge variant={status.variant}>
            {isScheduledForCancellation ? 'Cancelling' : status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            'grid gap-4',
            isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3',
          )}
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Monthly Price</p>
              <p className="font-medium">
                {formatCurrency(subscription.pricingPlan.priceInCents)}
                <span className="text-muted-foreground">
                  /{subscription.pricingPlan.periodLabel}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Current Period</p>
              <p className="font-medium">
                {formatDate(
                  subscription.currentPeriodStart as unknown as string,
                )}{' '}
                –{' '}
                {formatDate(subscription.currentPeriodEnd as unknown as string)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <p className="font-medium">
                {isScheduledForCancellation
                  ? 'N/A'
                  : formatDate(
                      subscription.currentPeriodEnd as unknown as string,
                    )}
              </p>
            </div>
          </div>
        </div>

        {subscription.pricingPlan.features &&
          subscription.pricingPlan.features.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Plan Features</p>
              <ul className={cn('grid gap-1.5', !isMobile && 'sm:grid-cols-2')}>
                {subscription.pricingPlan.features.map(
                  (feature: { id: string; text: string }) => (
                    <li
                      key={feature.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      {feature.text}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
