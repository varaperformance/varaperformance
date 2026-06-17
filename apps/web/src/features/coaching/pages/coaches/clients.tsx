import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { writeClipboard } from '@/lib/clipboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  useCoachClients,
  useClientDetails,
  useClientMetrics,
  useUpdateBookingStatus,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
  useClientActivityTimeline,
  type CoachClient,
  type ClientMetrics,
  type ClientIntake,
  type ContractSignatureInfo,
  type ActivityTimelineEvent,
} from '@/features/coaching';
import {
  useClientWeeklyReport,
  type WeeklyReportData,
} from '@/features/health';

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Sort options
type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'date-asc'
  | 'date-desc'
  | 'status';

const ITEMS_PER_PAGE = 15;

// Copy to clipboard button
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await writeClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-muted transition-colors group"
      title={`Copy ${label || text}`}
    >
      {copied ? (
        <svg
          className="h-3.5 w-3.5 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

// Status configuration
const statusConfig = {
  PENDING: {
    label: 'Pending Review',
    color: 'bg-yellow-500/10 text-yellow-500',
    dot: 'bg-yellow-500',
  },
  APPROVED: {
    label: 'Awaiting Payment',
    color: 'bg-blue-500/10 text-blue-500',
    dot: 'bg-blue-500',
  },
  CONFIRMED: {
    label: 'Active',
    color: 'bg-green-500/10 text-green-500',
    dot: 'bg-green-500',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-purple-500/10 text-purple-500',
    dot: 'bg-purple-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-500/10 text-red-500',
    dot: 'bg-red-500',
  },
  REFUNDED: {
    label: 'Refunded',
    color: 'bg-gray-500/10 text-gray-500',
    dot: 'bg-gray-500',
  },
};

const subscriptionStatusConfig = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-500' },
  CANCELLING: {
    label: 'Cancelling',
    color: 'bg-orange-500/10 text-orange-500',
  },
  PAUSED: { label: 'Paused', color: 'bg-yellow-500/10 text-yellow-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500/10 text-red-500' },
  PAST_DUE: { label: 'Past Due', color: 'bg-orange-500/10 text-orange-500' },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatNumber(value: number, maxFractionDigits = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) return 'C';

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function ClientDetails({
  client,
  metrics,
  metricsError,
  intake,
  contractSignature,
  weeklyReport,
  isLoadingWeeklyReport,
  isLoadingMetrics,
  isLoadingIntake,
  activityTimeline,
  isLoadingTimeline,
  onUpdateBookingStatus,
  isUpdatingBookingStatus,
  onPause,
  onResume,
  onCancel,
  isPausing,
  isResuming,
  isCancelling,
}: {
  client: CoachClient;
  metrics: ClientMetrics | null;
  metricsError: string | null;
  intake: ClientIntake | null | undefined;
  contractSignature: ContractSignatureInfo | null | undefined;
  weeklyReport: WeeklyReportData | null;
  isLoadingWeeklyReport: boolean;
  isLoadingMetrics: boolean;
  isLoadingIntake: boolean;
  activityTimeline: ActivityTimelineEvent[] | null;
  isLoadingTimeline: boolean;
  onUpdateBookingStatus: (
    status: 'APPROVED' | 'COMPLETED' | 'CANCELLED',
  ) => void;
  isUpdatingBookingStatus: boolean;
  onPause: (subscriptionId: string) => void;
  onResume: (subscriptionId: string) => void;
  onCancel: (subscriptionId: string) => void;
  isPausing: boolean;
  isResuming: boolean;
  isCancelling: boolean;
}) {
  const isMobile = useIsMobile();
  const [showInjuries, setShowInjuries] = useState(false);
  const bookingStatus =
    statusConfig[client.status as keyof typeof statusConfig] ||
    statusConfig.PENDING;
  const hasActiveSubscription =
    client.status === 'CONFIRMED' && client.subscription?.status === 'ACTIVE';

  // Determine subscription status - show "Cancelling" if scheduled for cancellation but sub is still active
  const getSubStatus = () => {
    if (!client.subscription) return null;
    if (
      client.subscription.scheduledCancellationAt &&
      client.subscription.status === 'ACTIVE'
    ) {
      return subscriptionStatusConfig.CANCELLING;
    }
    return subscriptionStatusConfig[
      client.subscription.status as keyof typeof subscriptionStatusConfig
    ];
  };
  const subStatus = getSubStatus();

  return (
    <div className="space-y-6">
      {/* Client Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
              <AvatarImage
                src={client.user.avatarUrl ?? undefined}
                alt={client.user.displayName || 'Client'}
              />
              <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
                {getInitials(client.user.displayName || 'Client')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold">
                  {client.user.displayName || 'Client'}
                </h2>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    bookingStatus.color,
                  )}
                >
                  {bookingStatus.label}
                </span>
              </div>
              <p className="text-muted-foreground">{client.user.email}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  Ref: {client.referenceCode}
                  <CopyButton
                    text={client.referenceCode}
                    label="reference code"
                  />
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-xs">
                  Booking: {client.bookingId}
                  <CopyButton text={client.bookingId} label="booking ID" />
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {formatCurrency(client.package.priceInCents)}
              </p>
              <p className="text-sm text-muted-foreground">
                /{client.package.billingCycle.toLowerCase()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details */}
      <div
        className={cn(
          'grid gap-4',
          isMobile ? 'grid-cols-1' : 'md:grid-cols-2',
        )}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Package</span>
              <span className="font-medium">{client.package.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started</span>
              <span className="font-medium">
                {formatDate(client.createdAt)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  bookingStatus.color,
                )}
              >
                {bookingStatus.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">
                {formatCurrency(client.package.priceInCents)}/
                {client.package.billingCycle.toLowerCase()}
              </span>
            </div>

            {/* Booking Actions */}
            {(client.status === 'PENDING' ||
              client.status === 'APPROVED' ||
              client.status === 'CONFIRMED') && (
              <div className="pt-4 border-t space-y-2">
                {client.status === 'PENDING' && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => onUpdateBookingStatus('APPROVED')}
                    disabled={isUpdatingBookingStatus}
                  >
                    {isUpdatingBookingStatus
                      ? 'Approving...'
                      : 'Approve Booking'}
                  </Button>
                )}
                {client.status === 'APPROVED' && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Waiting for client to complete payment
                  </p>
                )}
                {client.status === 'CONFIRMED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onUpdateBookingStatus('COMPLETED')}
                    disabled={isUpdatingBookingStatus}
                  >
                    {isUpdatingBookingStatus
                      ? 'Completing...'
                      : 'Mark as Completed'}
                  </Button>
                )}
                {(client.status === 'PENDING' ||
                  client.status === 'APPROVED' ||
                  client.status === 'CONFIRMED') && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => onUpdateBookingStatus('CANCELLED')}
                    disabled={isUpdatingBookingStatus}
                  >
                    {isUpdatingBookingStatus
                      ? 'Cancelling...'
                      : 'Cancel Booking'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {client.subscription ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {subStatus && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        subStatus.color,
                      )}
                    >
                      {subStatus.label}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subscription Linked
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      client.subscription.stripeSubscriptionId
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-yellow-500/10 text-yellow-500',
                    )}
                  >
                    {client.subscription.stripeSubscriptionId
                      ? 'Yes'
                      : 'Pending Payment'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Period</span>
                  <span className="font-medium text-sm">
                    {formatDate(client.subscription.currentPeriodStart)} -{' '}
                    {formatDate(client.subscription.currentPeriodEnd)}
                  </span>
                </div>
                {client.subscription.scheduledCancellationAt &&
                  client.subscription.status === 'ACTIVE' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cancels On</span>
                      <span className="font-medium text-orange-500">
                        {formatDate(
                          client.subscription.scheduledCancellationAt,
                        )}
                      </span>
                    </div>
                  )}
                {client.subscription.cancelledAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cancelled</span>
                    <span className="font-medium text-red-500">
                      {formatDate(client.subscription.cancelledAt)}
                    </span>
                  </div>
                )}

                {/* Subscription actions only appear when a Stripe subscription exists */}
                {client.subscription.stripeSubscriptionId ? (
                  <div className="pt-4 border-t space-y-2">
                    {client.subscription.status === 'ACTIVE' &&
                      !client.subscription.scheduledCancellationAt && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => onPause(client.subscription!.id)}
                            disabled={isPausing}
                          >
                            {isPausing ? 'Pausing...' : 'Pause Subscription'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => onCancel(client.subscription!.id)}
                            disabled={isCancelling}
                          >
                            {isCancelling
                              ? 'Cancelling...'
                              : 'Cancel Subscription'}
                          </Button>
                        </>
                      )}
                    {client.subscription.status === 'ACTIVE' &&
                      client.subscription.scheduledCancellationAt && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Subscription will end on{' '}
                          {formatDate(
                            client.subscription.scheduledCancellationAt,
                          )}
                        </p>
                      )}
                    {client.subscription.status === 'PAUSED' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={() => onResume(client.subscription!.id)}
                          disabled={isResuming}
                        >
                          {isResuming ? 'Resuming...' : 'Resume Subscription'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => onCancel(client.subscription!.id)}
                          disabled={isCancelling}
                        >
                          {isCancelling
                            ? 'Cancelling...'
                            : 'Cancel Subscription'}
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      Subscription management available after payment completes
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No active subscription
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Client Metrics (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasActiveSubscription ? (
            <p className="text-sm text-muted-foreground">
              Metrics are available only while the client subscription is
              active.
            </p>
          ) : isLoadingMetrics ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            </div>
          ) : metricsError ? (
            <p className="text-sm text-muted-foreground">{metricsError}</p>
          ) : metrics ? (
            <div className="space-y-4">
              <div
                className={cn(
                  'grid gap-3',
                  isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-4',
                )}
              >
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Workout Sessions
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatNumber(metrics.summary.workoutSessions)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Food Entries</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatNumber(metrics.summary.foodEntries)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Weight Logs</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatNumber(metrics.summary.weightEntries)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Water Logs</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatNumber(metrics.summary.waterEntries)}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  'grid gap-3',
                  isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3',
                )}
              >
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Total Calories
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatNumber(metrics.summary.totalCalories)} kcal
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Water</p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatNumber(metrics.summary.totalWaterOunces, 1)} oz
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Latest Weight</p>
                  <p className="mt-1 text-lg font-semibold">
                    {metrics.summary.latestWeight
                      ? `${formatNumber(metrics.summary.latestWeight.value, 1)} ${metrics.summary.latestWeight.unit}`
                      : 'No recent entry'}
                  </p>
                  {metrics.summary.weightChange && (
                    <p
                      className={cn(
                        'text-xs mt-1',
                        metrics.summary.weightChange.value > 0
                          ? 'text-orange-500'
                          : metrics.summary.weightChange.value < 0
                            ? 'text-green-600'
                            : 'text-muted-foreground',
                      )}
                    >
                      {metrics.summary.weightChange.value > 0 ? '+' : ''}
                      {formatNumber(metrics.summary.weightChange.value, 2)}{' '}
                      {metrics.summary.weightChange.unit} in window
                    </p>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  'grid gap-4',
                  isMobile ? 'grid-cols-1' : 'lg:grid-cols-2',
                )}
              >
                <div>
                  <p className="text-sm font-medium mb-2">Recent Workouts</p>
                  {metrics.workoutLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No workouts logged.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {metrics.workoutLogs.slice(0, 3).map((workout) => (
                        <div
                          key={workout.id}
                          className="rounded-md border p-2.5"
                        >
                          <p className="text-sm font-medium">
                            {workout.title || 'Workout Session'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(workout.startedAt)} ·{' '}
                            {workout.exerciseCount} exercises ·{' '}
                            {workout.setCount} sets
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Recent Meals</p>
                  {metrics.foodDiary.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No food entries logged.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {metrics.foodDiary.slice(0, 3).map((meal) => (
                        <div key={meal.id} className="rounded-md border p-2.5">
                          <p className="text-sm font-medium">{meal.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(meal.loggedAt)} · {meal.calories} kcal ·{' '}
                            {meal.mealType.toLowerCase()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No metric data in this window.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Client Weekly Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Progress Report</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasActiveSubscription ? (
            <p className="text-sm text-muted-foreground">
              Weekly report is available only while the client subscription is
              active.
            </p>
          ) : isLoadingWeeklyReport ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ) : weeklyReport ? (
            <div
              className={cn(
                'grid gap-3',
                isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-4',
              )}
            >
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Workouts</p>
                <p className="mt-1 text-2xl font-semibold">
                  {weeklyReport.workoutsLogged}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Personal Records
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {weeklyReport.personalRecords}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Habits Completed
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {weeklyReport.habitsCompleted}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Water Goal Days</p>
                <p className="mt-1 text-2xl font-semibold">
                  {weeklyReport.waterGoalDaysHit} / 7
                </p>
              </div>
              {weeklyReport.currentHabitStreak > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {weeklyReport.currentHabitStreak} days
                  </p>
                </div>
              )}
              {weeklyReport.caloriesAvg !== null && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Avg Calories</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {weeklyReport.caloriesAvg}
                  </p>
                </div>
              )}
              {weeklyReport.proteinAvg !== null && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Avg Protein</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {weeklyReport.proteinAvg}g
                  </p>
                </div>
              )}
              {weeklyReport.lifestyleAdherenceScore !== null && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Lifestyle Adherence
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {weeklyReport.lifestyleAdherenceScore}%
                  </p>
                  {weeklyReport.lifestyleAdherencePrevious !== null && (
                    <p className="text-xs text-muted-foreground">
                      vs {weeklyReport.lifestyleAdherencePrevious}% prev
                    </p>
                  )}
                </div>
              )}
              {weeklyReport.stackCompliancePercent !== null && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Stack Compliance
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {weeklyReport.stackCompliancePercent}%
                  </p>
                </div>
              )}
              {weeklyReport.injectionCompliancePercent !== null && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    Injection Compliance
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {weeklyReport.injectionCompliancePercent}%
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No weekly report data available.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Client Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTimeline ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : activityTimeline && activityTimeline.length > 0 ? (
            <div className="relative space-y-0">
              {activityTimeline.slice(0, 20).map((event, idx) => {
                const icon = {
                  workout: '🏋️',
                  nutrition: '🍽️',
                  weight: '⚖️',
                  habit: '✅',
                  pr: '🏆',
                  achievement: '🏅',
                }[event.type];

                const ago = (() => {
                  const diff = Date.now() - new Date(event.timestamp).getTime();
                  const mins = Math.floor(diff / 60_000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  const days = Math.floor(hrs / 24);
                  return `${days}d ago`;
                })();

                return (
                  <div key={event.id} className="flex gap-3 pb-3">
                    <div className="relative flex flex-col items-center">
                      <span className="text-sm">{icon}</span>
                      {idx < activityTimeline.slice(0, 20).length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="truncate text-sm">{event.description}</p>
                      <p className="text-xs text-muted-foreground">{ago}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recent activity in the last 30 days.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Client Intake Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Questionnaire</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingIntake ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ) : intake ? (
            <div className="space-y-4">
              {(intake.firstName || intake.lastName) && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">
                    Full Name
                  </span>
                  <p className="font-medium">
                    {[intake.firstName, intake.lastName]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                </div>
              )}
              {intake.phone && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">
                    Phone
                  </span>
                  <p className="font-medium">{intake.phone}</p>
                </div>
              )}
              {intake.goals && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">
                    Fitness Goals
                  </span>
                  <p className="text-sm whitespace-pre-wrap">{intake.goals}</p>
                </div>
              )}
              {intake.experience && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">
                    Experience Level
                  </span>
                  <p className="font-medium capitalize">{intake.experience}</p>
                </div>
              )}
              {intake.injuries && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">
                      Injuries/Medical Notes
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowInjuries(!showInjuries)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title={showInjuries ? 'Hide injuries' : 'Show injuries'}
                    >
                      {showInjuries ? (
                        <svg
                          className="h-4 w-4 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {showInjuries ? intake.injuries : '••••••••••••'}
                  </p>
                </div>
              )}
              {!intake.firstName &&
                !intake.lastName &&
                !intake.phone &&
                !intake.goals &&
                !intake.experience &&
                !intake.injuries && (
                  <p className="text-muted-foreground text-sm">
                    No questionnaire data provided
                  </p>
                )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No questionnaire data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Contract Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract Signature</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingIntake ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
          ) : contractSignature ? (
            <div className="space-y-4">
              {/* Verification Status */}
              <div className="flex items-center gap-2">
                {contractSignature.isVerified ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-green-500">
                      Cryptographically Verified
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <svg
                      className="h-5 w-5 text-yellow-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-yellow-500">
                      Legacy Signature
                    </span>
                  </div>
                )}
              </div>

              {/* Signature Details */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract</span>
                  <span className="font-medium">
                    {contractSignature.contractTitle} (v
                    {contractSignature.contractVersion})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signed</span>
                  <span className="font-medium">
                    {new Date(contractSignature.signedAt).toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      },
                    )}
                  </span>
                </div>
                {contractSignature.userSignatureInput && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Typed Signature
                    </span>
                    <span className="font-medium italic">
                      "{contractSignature.userSignatureInput}"
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Algorithm</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium font-mono',
                      contractSignature.signatureAlgorithm.includes('ecdsa')
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-gray-500/10 text-gray-500',
                    )}
                  >
                    {contractSignature.signatureAlgorithm}
                  </span>
                </div>
              </div>

              {/* Verification Message */}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {contractSignature.verificationMessage}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No contract signed yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Send Message
            </Button>
            <Button variant="outline" size="sm">
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              View Contract
            </Button>
            <Button variant="outline" size="sm">
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Payment History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  label,
  count,
  color,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center p-3 rounded-lg border transition-all',
        isActive
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border/50 hover:border-border hover:bg-muted/30',
      )}
    >
      <span className={cn('text-2xl font-bold', color)}>{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}

// Pagination Component
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(
        1,
        '...',
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      pages.push(
        1,
        '...',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        '...',
        totalPages,
      );
    }
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Button>
      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`dots-${idx}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
            className="w-8"
          >
            {page}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Button>
    </div>
  );
}

// Table row component for table view
function ClientTableRow({
  client,
  isSelected,
  onClick,
}: {
  client: CoachClient;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config =
    statusConfig[client.status as keyof typeof statusConfig] ||
    statusConfig.PENDING;

  return (
    <TableRow
      className={cn('cursor-pointer', isSelected && 'bg-primary/5')}
      onClick={onClick}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={client.user.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {getInitials(client.user.displayName || 'Client')}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">
              {client.user.displayName || client.user.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {client.user.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-sm">{client.package.name}</span>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn('text-xs', config.color)}>
          {config.label}
        </Badge>
      </TableCell>
      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
        {formatDate(client.createdAt)}
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(client.package.priceInCents)}
      </TableCell>
    </TableRow>
  );
}

export default function CoachClientsPage() {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search for performance with many clients
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch clients
  const { data: clientsResponse, isLoading, isError } = useCoachClients();
  const clients = useMemo(
    () =>
      clientsResponse?.success ? (clientsResponse.data?.clients ?? []) : [],
    [clientsResponse],
  );

  // Fetch details for selected client (includes intake data)
  const { data: detailsResponse, isLoading: isLoadingDetails } =
    useClientDetails(selectedClientId);
  const clientDetails = detailsResponse?.success ? detailsResponse.data : null;

  const {
    data: metricsResponse,
    isLoading: isLoadingMetrics,
    error: metricsQueryError,
  } = useClientMetrics(selectedClientId, 30);
  const clientMetrics = metricsResponse?.success ? metricsResponse.data : null;
  const clientMetricsError =
    metricsResponse && !metricsResponse.success
      ? metricsResponse.error.message
      : metricsQueryError
        ? 'Unable to load client metrics'
        : null;

  // Fetch weekly report for selected client
  const { data: weeklyReportResponse, isLoading: isLoadingWeeklyReport } =
    useClientWeeklyReport(selectedClientId ?? '', 7);
  const clientWeeklyReport = weeklyReportResponse?.data ?? null;

  // Fetch activity timeline for selected client
  const { data: timelineResponse, isLoading: isLoadingTimeline } =
    useClientActivityTimeline(selectedClientId, 30, 50);
  const activityTimeline = timelineResponse?.success
    ? (timelineResponse.data?.events ?? null)
    : null;

  // Mutations
  const bookingStatusMutation = useUpdateBookingStatus();
  const pauseMutation = usePauseSubscription();
  const resumeMutation = useResumeSubscription();
  const cancelMutation = useCancelSubscription();

  // Calculate stats
  const stats = useMemo(() => {
    const counts = {
      total: clients.length,
      active: 0,
      pending: 0,
      cancelled: 0,
    };
    for (const client of clients) {
      if (client.status === 'CONFIRMED') counts.active++;
      else if (client.status === 'PENDING' || client.status === 'APPROVED')
        counts.pending++;
      else if (client.status === 'CANCELLED' || client.status === 'REFUNDED')
        counts.cancelled++;
    }
    return counts;
  }, [clients]);

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    const result = clients.filter((client) => {
      const search = debouncedSearch.toLowerCase();
      const matchesSearch =
        !search ||
        client.user.displayName?.toLowerCase().includes(search) ||
        client.user.email.toLowerCase().includes(search) ||
        client.referenceCode.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && client.status === 'CONFIRMED') ||
        (statusFilter === 'pending' &&
          (client.status === 'PENDING' || client.status === 'APPROVED')) ||
        (statusFilter === 'cancelled' &&
          (client.status === 'CANCELLED' || client.status === 'REFUNDED')) ||
        client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort
    const sortedResult = [...result].sort((a, b) => {
      const statusOrder: Record<string, number> = {
        CONFIRMED: 0,
        PENDING: 1,
        APPROVED: 2,
        COMPLETED: 3,
        CANCELLED: 4,
        REFUNDED: 5,
      };
      switch (sortBy) {
        case 'name-asc':
          return (a.user.displayName || a.user.email).localeCompare(
            b.user.displayName || b.user.email,
          );
        case 'name-desc':
          return (b.user.displayName || b.user.email).localeCompare(
            a.user.displayName || a.user.email,
          );
        case 'date-asc':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case 'date-desc':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'status':
          return (statusOrder[a.status] ?? 6) - (statusOrder[b.status] ?? 6);
        default:
          return 0;
      }
    });

    return sortedResult;
  }, [clients, debouncedSearch, statusFilter, sortBy]);

  // Pagination - auto-reset to page 1 when filters change by tracking total pages
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);

  // Ensure currentPage is within bounds when filteredClients changes
  const effectivePage =
    currentPage > totalPages && totalPages > 0 ? 1 : currentPage;

  const paginatedClients = useMemo(() => {
    const start = (effectivePage - 1) * ITEMS_PER_PAGE;
    return filteredClients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClients, effectivePage]);

  // Reset page when filters change - this is a legitimate use case for setState in effect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting pagination on filter change is intentional
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, sortBy]);

  const selectedClient =
    clients.find((c) => c.bookingId === selectedClientId) || null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading clients...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Failed to load clients</p>
        <Button asChild>
          <Link to="/coaches/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Coach CRM
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Client Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage subscriptions, bookings, and client onboarding details.
            </p>
          </div>
          <Button
            variant="outline"
            asChild
            className="transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <Link to="/coaches/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </section>

      <div>
        {clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <svg
                className="h-12 w-12 text-muted-foreground mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold">No Clients Yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-md">
                When clients book your coaching packages, they'll appear here
                for you to manage.
              </p>
            </CardContent>
          </Card>
        ) : selectedClient ? (
          /* Detail View */
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setSelectedClientId(null)}
              className="gap-2"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to all clients
            </Button>
            <ClientDetails
              client={selectedClient}
              metrics={clientMetrics}
              metricsError={clientMetricsError}
              intake={clientDetails?.intake}
              contractSignature={clientDetails?.contractSignature}
              weeklyReport={clientWeeklyReport}
              isLoadingWeeklyReport={isLoadingWeeklyReport}
              isLoadingMetrics={isLoadingMetrics}
              isLoadingIntake={isLoadingDetails}
              activityTimeline={activityTimeline}
              isLoadingTimeline={isLoadingTimeline}
              onUpdateBookingStatus={(status) =>
                bookingStatusMutation.mutate({
                  bookingId: selectedClient.bookingId,
                  status,
                })
              }
              isUpdatingBookingStatus={bookingStatusMutation.isPending}
              onPause={(id) => pauseMutation.mutate(id)}
              onResume={(id) => resumeMutation.mutate(id)}
              onCancel={(id) => cancelMutation.mutate(id)}
              isPausing={pauseMutation.isPending}
              isResuming={resumeMutation.isPending}
              isCancelling={cancelMutation.isPending}
            />
          </div>
        ) : (
          /* List View */
          <>
            {/* Stats Overview */}
            <div
              className={cn(
                'grid gap-3 mb-6',
                isMobile ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4',
              )}
            >
              <StatsCard
                label="Total"
                count={stats.total}
                color="text-foreground"
                isActive={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              <StatsCard
                label="Active"
                count={stats.active}
                color="text-green-500"
                isActive={statusFilter === 'active'}
                onClick={() => setStatusFilter('active')}
              />
              <StatsCard
                label="Pending"
                count={stats.pending}
                color="text-yellow-500"
                isActive={statusFilter === 'pending'}
                onClick={() => setStatusFilter('pending')}
              />
              <StatsCard
                label="Cancelled"
                count={stats.cancelled}
                color="text-red-500"
                isActive={statusFilter === 'cancelled'}
                onClick={() => setStatusFilter('cancelled')}
              />
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  placeholder="Search by name, email, or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                  >
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest first</SelectItem>
                  <SelectItem value="date-asc">Oldest first</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="status">By status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Package
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Started
                      </TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((client) => (
                      <ClientTableRow
                        key={client.bookingId}
                        client={client}
                        isSelected={selectedClientId === client.bookingId}
                        onClick={() => setSelectedClientId(client.bookingId)}
                      />
                    ))}
                  </TableBody>
                </Table>
                {paginatedClients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No clients match your filters
                  </p>
                )}
              </CardContent>
              <div className="p-4 border-t space-y-3">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Showing {paginatedClients.length} of {filteredClients.length}{' '}
                  clients
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
