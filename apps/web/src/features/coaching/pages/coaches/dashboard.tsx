import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { AxiosError } from 'axios';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import {
  useMyCoachProfile,
  useCoachDashboard,
  useCoachClients,
  useCoachRevenueHistory,
  useUpdateCoachAvailability,
  useStripeConnectStatus,
  useCreateStripeOnboardingLink,
  useDisconnectStripeConnect,
  useCoachClientAnalytics,
  useExportClientsCsv,
  type CoachClient,
} from '@/features/coaching';
import { useConversations } from '@/features/messaging';
import { Settings, Download } from 'lucide-react';
import { toast } from 'sonner';

// Hook to get computed chart colors from CSS variables
function useChartColors() {
  const getColors = () => {
    if (typeof document === 'undefined') {
      return {
        chart1: 'oklch(0.6 0.22 255)',
        chart2: 'oklch(0.7 0.16 180)',
        chart3: 'oklch(0.75 0.14 145)',
        chart4: 'oklch(0.65 0.18 320)',
        chart5: 'oklch(0.8 0.12 60)',
        border: 'oklch(1 0 0 / 8%)',
        muted: 'oklch(0.22 0.015 270)',
        mutedForeground: 'oklch(0.65 0.01 270)',
        background: 'oklch(0.12 0.01 270)',
      };
    }
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    return {
      chart1:
        computedStyle.getPropertyValue('--chart-1').trim() ||
        'oklch(0.6 0.22 255)',
      chart2:
        computedStyle.getPropertyValue('--chart-2').trim() ||
        'oklch(0.7 0.16 180)',
      chart3:
        computedStyle.getPropertyValue('--chart-3').trim() ||
        'oklch(0.75 0.14 145)',
      chart4:
        computedStyle.getPropertyValue('--chart-4').trim() ||
        'oklch(0.65 0.18 320)',
      chart5:
        computedStyle.getPropertyValue('--chart-5').trim() ||
        'oklch(0.8 0.12 60)',
      border:
        computedStyle.getPropertyValue('--border').trim() ||
        'oklch(1 0 0 / 8%)',
      muted:
        computedStyle.getPropertyValue('--muted').trim() ||
        'oklch(0.22 0.015 270)',
      mutedForeground:
        computedStyle.getPropertyValue('--muted-foreground').trim() ||
        'oklch(0.65 0.01 270)',
      background:
        computedStyle.getPropertyValue('--background').trim() ||
        'oklch(0.12 0.01 270)',
    };
  };

  return useMemo(() => getColors(), []);
}

// Helper to format relative time
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) return 'U';

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  changeType,
  icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
            {change && (
              <p
                className={cn(
                  'mt-1 text-sm',
                  changeType === 'positive' && 'text-green-500',
                  changeType === 'negative' && 'text-red-500',
                  changeType === 'neutral' && 'text-muted-foreground',
                )}
              >
                {change}
              </p>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Client status badge
function ClientStatusBadge({ status }: { status: CoachClient['status'] }) {
  const config: Record<string, { color: string }> = {
    active: { color: 'bg-green-500' },
    pending: { color: 'bg-yellow-500' },
    inactive: { color: 'bg-gray-500' },
  };

  return <span className={cn('h-2 w-2 rounded-full', config[status].color)} />;
}

const CoachesDashboard = () => {
  const isMobile = useIsMobile();
  const chartColors = useChartColors();
  const [analyticsDays, setAnalyticsDays] = useState(30);

  // Fetch real data using hooks
  const {
    data: coachProfileResponse,
    isLoading: profileLoading,
    isError: profileError,
  } = useMyCoachProfile();
  const { data: dashboardStatsResponse, isLoading: statsLoading } =
    useCoachDashboard();
  const { data: clientsResponse, isLoading: clientsLoading } =
    useCoachClients();
  const { data: revenueHistoryResponse, isLoading: revenueLoading } =
    useCoachRevenueHistory();
  const { data: conversationsResponse, isLoading: conversationsLoading } =
    useConversations({ limit: 5 });
  const updateCoachAvailability = useUpdateCoachAvailability();
  const { data: stripeConnectResponse } = useStripeConnectStatus();
  const createStripeOnboardingLink = useCreateStripeOnboardingLink();
  const disconnectStripeConnect = useDisconnectStripeConnect();
  const { data: analyticsResponse } = useCoachClientAnalytics(analyticsDays);
  const exportCsv = useExportClientsCsv();

  const isLoading =
    profileLoading ||
    statsLoading ||
    clientsLoading ||
    revenueLoading ||
    conversationsLoading;

  // Unwrap success responses
  const coachProfile = coachProfileResponse?.success
    ? coachProfileResponse.data
    : null;
  const dashboardStats = dashboardStatsResponse?.success
    ? dashboardStatsResponse.data
    : null;
  const clients = clientsResponse?.success ? clientsResponse.data?.clients : [];
  const revenueHistory = revenueHistoryResponse?.success
    ? revenueHistoryResponse.data
    : [];
  const conversations = conversationsResponse?.success
    ? conversationsResponse.data?.items
    : [];
  const totalUnread = conversationsResponse?.success
    ? (conversationsResponse.data?.totalUnread ?? 0)
    : 0;
  const stripeConnect = stripeConnectResponse?.success
    ? stripeConnectResponse.data
    : null;
  const analytics = analyticsResponse?.success ? analyticsResponse.data : null;

  // Compute derived data
  const coachName =
    coachProfile?.profile?.displayName || coachProfile?.slug || 'Coach';
  const coachAvatar = coachProfile?.profile?.avatarUrl;

  // Format revenue data for chart
  const earningsData =
    revenueHistory?.map((item) => ({
      month: item.month,
      earnings: item.revenueCents / 100,
      clients: item.clientCount,
    })) || [];

  // Get recent clients using real booking data
  const topClients = (clients || []).slice(0, 5).map((client) => ({
    id: client.bookingId,
    name: client.user?.displayName || 'Client',
    avatar: client.user?.avatarUrl,
    program: client.package?.name || 'Coaching Program',
    createdAt: client.createdAt,
    status:
      client.status === 'CONFIRMED'
        ? 'active'
        : ('pending' as 'active' | 'pending' | 'inactive'),
  }));

  const blockingDisconnectCount = (clients || []).filter(
    (client) =>
      client.status === 'CONFIRMED' &&
      client.subscription &&
      ['ACTIVE', 'PAUSED', 'PAST_DUE'].includes(client.subscription.status),
  ).length;
  const disconnectBlocked = blockingDisconnectCount > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  // Show error or not-a-coach state
  if (profileError || !coachProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">
          You are not registered as a coach.
        </p>
        <Button asChild>
          <Link to="/coaches">Browse Coaches</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10 space-y-8">
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/20">
              <AvatarImage src={coachAvatar ?? undefined} alt={coachName} />
              <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                {getInitials(coachName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Coach Command Center
              </p>
              <h1 className="text-3xl font-bold tracking-tight mt-1">
                Welcome back, {coachName}
              </h1>
              <p className="text-muted-foreground mt-1">
                Here&apos;s what&apos;s happening with your coaching business.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Coach settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Coach Settings</DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Available for new clients</p>
                    <p className="text-sm text-muted-foreground">
                      Controls whether you appear as available on the coaches
                      page.
                    </p>
                  </div>
                  <Switch
                    checked={coachProfile?.isAvailable ?? false}
                    disabled={updateCoachAvailability.isPending}
                    onCheckedChange={(checked) => {
                      updateCoachAvailability.mutate(checked);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Stripe Payouts</p>
                    <p className="text-sm text-muted-foreground">
                      Connect Stripe to receive your share of subscription
                      revenue.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Status:{' '}
                      {stripeConnect?.onboardingComplete &&
                      stripeConnect?.chargesEnabled &&
                      stripeConnect?.payoutsEnabled
                        ? 'Connected'
                        : 'Setup required'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={
                      createStripeOnboardingLink.isPending ||
                      disconnectStripeConnect.isPending
                    }
                    onClick={() => {
                      createStripeOnboardingLink.mutate(undefined, {
                        onSuccess: (response) => {
                          if (response.success) {
                            window.location.assign(response.data.url);
                          }
                        },
                      });
                    }}
                  >
                    {createStripeOnboardingLink.isPending
                      ? 'Opening...'
                      : stripeConnect?.stripeAccountId
                        ? 'Update Stripe'
                        : 'Connect Stripe'}
                  </Button>
                </div>

                {stripeConnect?.stripeAccountId ? (
                  <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                    <div>
                      <p className="font-medium text-destructive">
                        Disconnect Stripe Account
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This removes your Connect account from Vara. You will
                        need to reconnect before receiving payouts.
                      </p>
                      {disconnectBlocked ? (
                        <Badge
                          variant="outline"
                          className="mt-2 border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                        >
                          Disconnect unavailable while {blockingDisconnectCount}{' '}
                          active subscription
                          {blockingDisconnectCount === 1 ? '' : 's'} exist.
                        </Badge>
                      ) : null}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={
                            disconnectBlocked ||
                            createStripeOnboardingLink.isPending ||
                            disconnectStripeConnect.isPending
                          }
                        >
                          {disconnectBlocked
                            ? 'Disconnect Unavailable'
                            : 'Disconnect'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Disconnect Stripe Connect?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete your connected Stripe account from
                            your coach profile. If you still have active
                            subscriptions, disconnection will be blocked.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              disconnectStripeConnect.mutate(undefined, {
                                onSuccess: (response) => {
                                  if (response.success) {
                                    toast.success(
                                      'Stripe account disconnected',
                                    );
                                  }
                                },
                                onError: (error) => {
                                  const axiosError = error as AxiosError<{
                                    error?: { message?: string };
                                  }>;
                                  const message =
                                    axiosError.response?.data?.error?.message ||
                                    (error instanceof Error
                                      ? error.message
                                      : 'Unable to disconnect Stripe account');
                                  toast.error(message);
                                },
                              });
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {disconnectStripeConnect.isPending
                              ? 'Disconnecting...'
                              : 'Disconnect Stripe'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              asChild
              className="transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <Link to="/coaches/clients">View All Clients</Link>
            </Button>
            <Button
              asChild
              className="bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <Link to="/coaches/packages">Manage Packages</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div>
        <div
          className={cn(
            'grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none',
            isMobile ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-4',
          )}
        >
          <StatCard
            title="Total Clients"
            value={dashboardStats?.totalClients ?? 0}
            change={`${dashboardStats?.activeClients ?? 0} active`}
            changeType="positive"
            icon={
              <svg
                className="h-5 w-5"
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
            }
          />
          <StatCard
            title="Monthly Revenue"
            value={`$${((dashboardStats?.monthlyRevenueCents ?? 0) / 100).toLocaleString()}`}
            change={`$${((dashboardStats?.totalRevenueCents ?? 0) / 100).toLocaleString()} total`}
            changeType="positive"
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="New This Month"
            value={dashboardStats?.newClientsThisMonth ?? 0}
            subtitle={`${dashboardStats?.clientGrowthPercent ?? 0}% growth`}
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            }
          />
          <StatCard
            title="Avg Rating"
            value={dashboardStats?.avgRating?.toFixed(1) ?? 'N/A'}
            change={`${dashboardStats?.reviewCount ?? 0} reviews`}
            changeType="positive"
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            }
          />
        </div>
      </div>

      {/* Client Analytics Section */}
      {analytics && analytics.totalActiveClients > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Client Analytics</h2>
              <p className="text-sm text-muted-foreground">
                Engagement across {analytics.totalActiveClients} active client
                {analytics.totalActiveClients !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={String(analyticsDays)}
                onValueChange={(v) => setAnalyticsDays(Number(v))}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={exportCsv.isPending}
                onClick={() => {
                  exportCsv.mutate(undefined, {
                    onSuccess: (response) => {
                      if (response.success) {
                        const blob = new Blob([response.data.csv], {
                          type: 'text/csv',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Client list exported');
                      }
                    },
                    onError: () => toast.error('Failed to export client list'),
                  });
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                {exportCsv.isPending ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'grid gap-4',
              isMobile ? 'grid-cols-1' : 'sm:grid-cols-3',
            )}
          >
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Avg Workouts / Week
                </p>
                <p className="text-2xl font-bold mt-1">
                  {analytics.averageWorkoutsPerWeek}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.clientsLoggingWorkouts} of{' '}
                  {analytics.totalActiveClients} clients logging
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Avg Food Entries / Day
                </p>
                <p className="text-2xl font-bold mt-1">
                  {analytics.averageFoodEntriesPerDay}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.clientsLoggingFood} of{' '}
                  {analytics.totalActiveClients} clients logging
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Clients Tracking Weight
                </p>
                <p className="text-2xl font-bold mt-1">
                  {analytics.clientsLoggingWeight}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  of {analytics.totalActiveClients} active clients
                </p>
              </CardContent>
            </Card>
          </div>

          {analytics.workoutConsistency.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Client Workout Consistency</CardTitle>
                <CardDescription>
                  Workouts per client over the last {analyticsDays} days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[250px]">
                  <BarChart data={analytics.workoutConsistency}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.border}
                    />
                    <XAxis
                      dataKey="displayName"
                      stroke={chartColors.mutedForeground}
                      fontSize={12}
                      tickFormatter={(v) =>
                        v.length > 10 ? `${v.slice(0, 10)}...` : v
                      }
                    />
                    <YAxis stroke={chartColors.mutedForeground} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.background,
                        border: `1px solid ${chartColors.border}`,
                        borderRadius: '8px',
                      }}
                    />
                    <Bar
                      dataKey="workouts"
                      fill={chartColors.chart1}
                      name="Workouts"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="foodEntries"
                      fill={chartColors.chart2}
                      name="Food Entries"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div>
        <div
          className={cn(
            'grid gap-6',
            isMobile ? 'grid-cols-1' : 'lg:grid-cols-3',
          )}
        >
          {/* Left Column - Charts */}
          <div
            className={cn('space-y-6', isMobile ? 'order-1' : 'lg:col-span-2')}
          >
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>
                  Monthly earnings and client growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[300px]">
                  <AreaChart data={earningsData}>
                    <defs>
                      <linearGradient
                        id="earningsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={chartColors.chart1}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={chartColors.chart1}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartColors.border}
                    />
                    <XAxis
                      dataKey="month"
                      stroke={chartColors.mutedForeground}
                      fontSize={12}
                    />
                    <YAxis
                      stroke={chartColors.mutedForeground}
                      fontSize={12}
                      tickFormatter={(v) => `$${v / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.background,
                        border: `1px solid ${chartColors.border}`,
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [
                        `$${Number(value).toLocaleString()}`,
                        'Revenue',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke={chartColors.chart1}
                      fill="url(#earningsGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Recent Clients */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Clients</CardTitle>
                  <CardDescription>Latest client bookings</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/coaches/clients">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topClients.map((client) => (
                    <div key={client.id} className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={client.avatar ?? undefined}
                          alt={client.name}
                        />
                        <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                          {getInitials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <ClientStatusBadge status={client.status} />
                          <p className="font-medium truncate">{client.name}</p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {client.program}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Joined{' '}
                          {new Date(client.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {topClients.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No client bookings yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Messages & Actions */}
          <div className={cn('space-y-6', isMobile && 'order-2')}>
            {/* Recent Messages */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Messages</CardTitle>
                  {totalUnread > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {totalUnread}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/messages">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {conversations && conversations.length > 0 ? (
                  <div className="space-y-3">
                    {conversations.map((conv) => {
                      const hasUnread = conv.unreadCount > 0;
                      const timeAgo = conv.lastMessageAt
                        ? formatTimeAgo(new Date(conv.lastMessageAt))
                        : 'No messages';
                      return (
                        <Link
                          key={conv.id}
                          to={`/messages?conversation=${conv.id}`}
                          className={cn(
                            'flex items-start gap-3 rounded-lg p-3 transition-colors cursor-pointer',
                            hasUnread
                              ? 'bg-primary/5 hover:bg-primary/10'
                              : 'hover:bg-muted/50',
                          )}
                        >
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={conv.participant.avatarUrl ?? undefined}
                                alt={conv.participant.displayName || 'Client'}
                              />
                              <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                                {getInitials(
                                  conv.participant.displayName || 'Client',
                                )}
                              </AvatarFallback>
                            </Avatar>
                            {hasUnread && (
                              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={cn(
                                  'font-medium truncate',
                                  hasUnread && 'text-primary',
                                )}
                              >
                                {conv.participant.displayName || 'Client'}
                              </p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {timeAgo}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.lastMessageText || 'Start a conversation'}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">
                      Messages from clients will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'grid gap-3',
                    isMobile ? 'grid-cols-1' : 'grid-cols-2',
                  )}
                >
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-4"
                    asChild
                  >
                    <Link to="/coaches/packages">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      <span className="text-xs">New Package</span>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-4"
                    asChild
                  >
                    <Link to="/coaches/clients">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                      <span className="text-xs">View Clients</span>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-4"
                    asChild
                  >
                    <Link to="/messages">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-xs">Messages</span>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-4"
                    asChild
                  >
                    <Link to="/coaches/dashboard">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <span className="text-xs">Dashboard</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachesDashboard;
