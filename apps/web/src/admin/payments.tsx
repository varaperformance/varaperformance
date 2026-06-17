import { useState } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCcw,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingBag,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useAdminSubscriptions,
  useAdminPayments,
  usePaymentStats,
  useAdminPricingPlans,
  useCreatePricingPlan,
  useUpdatePricingPlan,
  usePlatformFeeSetting,
  useUpdatePlatformFeeSetting,
  useAdminShopOrderSummary,
  type AdminSubscription,
  type AdminPayment,
} from '@/hooks/use-admin';
import { toast } from 'sonner';

const SUBSCRIPTION_STATUSES = ['ACTIVE', 'PAUSED', 'CANCELLED', 'PAST_DUE'];
const PAYMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
];

export default function PaymentManagementPage() {
  const [activeTab, setActiveTab] = useState<
    'subscriptions' | 'payments' | 'settings'
  >('subscriptions');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [platformFeeInput, setPlatformFeeInput] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({
    slug: '',
    name: '',
    audience: 'COACH' as 'FREE' | 'COACH' | 'GYM',
    priceInCents: '1999',
    periodLabel: '/month',
    cta: 'Get Started',
    ctaLink: '/register',
    features: '',
  });

  // Queries
  const { data: statsData, isLoading: statsLoading } = usePaymentStats();
  const { data: subscriptionsData, isLoading: subscriptionsLoading } =
    useAdminSubscriptions({
      status: subscriptionStatus === 'all' ? undefined : subscriptionStatus,
      page: subscriptionPage,
      limit: 20,
    });
  const { data: paymentsData, isLoading: paymentsLoading } = useAdminPayments({
    status: paymentStatus === 'all' ? undefined : paymentStatus,
    page: paymentPage,
    limit: 20,
  });
  const { data: pricingPlansData, isLoading: pricingPlansLoading } =
    useAdminPricingPlans();
  const { data: platformFeeData } = usePlatformFeeSetting();
  const { data: shopSummaryData, isLoading: shopSummaryLoading } =
    useAdminShopOrderSummary();
  const createPricingPlan = useCreatePricingPlan();
  const updatePricingPlan = useUpdatePricingPlan();
  const updatePlatformFee = useUpdatePlatformFeeSetting();

  const stats = statsData?.data;
  const shopSummary = shopSummaryData?.data;
  const subscriptions = subscriptionsData?.data?.items ?? [];
  const subscriptionsTotal = subscriptionsData?.data?.total ?? 0;
  const subscriptionsTotalPages =
    Math.ceil(subscriptionsTotal / (subscriptionsData?.data?.limit ?? 20)) || 1;

  const payments = paymentsData?.data?.items ?? [];
  const paymentsTotal = paymentsData?.data?.total ?? 0;
  const paymentsTotalPages =
    Math.ceil(paymentsTotal / (paymentsData?.data?.limit ?? 20)) || 1;
  const pricingPlans = pricingPlansData?.data?.plans ?? [];

  const effectivePlatformFee = platformFeeData?.data?.percent ?? 15;

  const platformFeeValue = platformFeeInput ?? String(effectivePlatformFee);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getSubscriptionStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'PAUSED':
        return <Badge variant="secondary">Paused</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'PAST_DUE':
        return <Badge className="bg-orange-500">Past Due</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Succeeded
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge variant="secondary">
            <RefreshCcw className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      case 'REFUNDED':
        return <Badge className="bg-purple-500">Refunded</Badge>;
      case 'PARTIALLY_REFUNDED':
        return <Badge className="bg-purple-400">Partial Refund</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Payment Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View subscriptions, payments, and revenue
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.totalRevenueInCents ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.successfulPayments} successful payments
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Subscriptions
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeSubscriptions ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Past Due</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {stats?.pastDueSubscriptions ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.cancelledSubscriptions ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Total cancelled</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shop Snapshot */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Shop Revenue Snapshot</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Commerce KPIs from shop orders
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/shop/orders">View Shop Orders</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {shopSummaryLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading shop snapshot...
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Shop Revenue</span>
                  <ShoppingBag className="h-3.5 w-3.5" />
                </div>
                <p className="text-xl font-bold">
                  {formatCurrency(shopSummary?.paidRevenueInCents ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {shopSummary?.paidOrders ?? 0} paid orders
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Last 30 Days Revenue</span>
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    shopSummary?.paidRevenueLast30DaysInCents ?? 0,
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {shopSummary?.ordersLast30Days ?? 0} orders created
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  Order Status Mix
                </div>
                <p className="text-xl font-bold">
                  {shopSummary?.pendingOrders ?? 0} pending
                </p>
                <p className="text-xs text-muted-foreground">
                  {shopSummary?.cancelledOrders ?? 0} cancelled /{' '}
                  {shopSummary?.refundedOrders ?? 0} refunded
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-1 text-xs text-muted-foreground">
                  Total Shop Orders
                </div>
                <p className="text-xl font-bold">
                  {shopSummary?.totalOrders ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">All-time orders</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'subscriptions' | 'payments')}
      >
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <>
          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <Select
                value={subscriptionStatus}
                onValueChange={(v) => {
                  setSubscriptionStatus(v);
                  setSubscriptionPage(1);
                }}
              >
                <SelectTrigger className="w-50">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {SUBSCRIPTION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0) +
                        status.slice(1).toLowerCase().replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="gap-0 py-0">
            <CardContent className="p-0">
              {subscriptionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CreditCard className="mb-4 h-12 w-12" />
                  <p>No subscriptions found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Coach</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period End</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub: AdminSubscription) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {sub.booking.referenceCode}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {sub.booking.user.profile?.displayName ||
                                'No name'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sub.booking.user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.booking.coach.user.profile?.displayName ||
                            'No name'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {sub.package.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sub.package.billingCycle.toLowerCase()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(sub.package.priceInCents)}
                        </TableCell>
                        <TableCell>
                          {getSubscriptionStatusBadge(sub.status)}
                          {sub.scheduledCancellationAt && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Cancels:{' '}
                              {format(
                                new Date(sub.scheduledCancellationAt),
                                'MMM d',
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(sub.currentPeriodEnd),
                            'MMM d, yyyy',
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {subscriptionsTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(subscriptionPage - 1) * 20 + 1} to{' '}
                {Math.min(subscriptionPage * 20, subscriptionsTotal)} of{' '}
                {subscriptionsTotal} subscriptions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubscriptionPage((p) => Math.max(1, p - 1))}
                  disabled={subscriptionPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {subscriptionPage} of {subscriptionsTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSubscriptionPage((p) =>
                      Math.min(subscriptionsTotalPages, p + 1),
                    )
                  }
                  disabled={subscriptionPage === subscriptionsTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <>
          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <Select
                value={paymentStatus}
                onValueChange={(v) => {
                  setPaymentStatus(v);
                  setPaymentPage(1);
                }}
              >
                <SelectTrigger className="w-50">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {PAYMENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0) +
                        status.slice(1).toLowerCase().replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="gap-0 py-0">
            <CardContent className="p-0">
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <DollarSign className="mb-4 h-12 w-12" />
                  <p>No payments found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: AdminPayment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {payment.stripePaymentIntentId ||
                              payment.stripeCheckoutSessionId ||
                              payment.id.slice(0, 8)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {payment.customer.user.profile?.displayName ||
                                'No name'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {payment.customer.user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.type.charAt(0) +
                              payment.type
                                .slice(1)
                                .toLowerCase()
                                .replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amountInCents)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.feeInCents
                            ? formatCurrency(payment.feeInCents)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(payment.status)}
                          {payment.failureMessage && (
                            <div className="mt-1 max-w-37.5 truncate text-xs text-destructive">
                              {payment.failureMessage}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(payment.paidAt || payment.createdAt),
                            'MMM d, yyyy',
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {paymentsTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(paymentPage - 1) * 20 + 1} to{' '}
                {Math.min(paymentPage * 20, paymentsTotal)} of {paymentsTotal}{' '}
                payments
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                  disabled={paymentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {paymentPage} of {paymentsTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPaymentPage((p) => Math.min(paymentsTotalPages, p + 1))
                  }
                  disabled={paymentPage === paymentsTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Fee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Current platform fee applied to Stripe subscriptions and ledger
                entries.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={platformFeeValue}
                  onChange={(e) => setPlatformFeeInput(e.target.value)}
                  className="w-45"
                />
                <Button
                  onClick={async () => {
                    const next = Number(platformFeeValue);
                    if (!Number.isFinite(next) || next < 0 || next > 100) {
                      toast.error('Platform fee must be between 0 and 100');
                      return;
                    }
                    await updatePlatformFee.mutateAsync(next);
                    setPlatformFeeInput(String(next));
                    toast.success('Platform fee updated');
                  }}
                  disabled={updatePlatformFee.isPending}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Effective fee: {effectivePlatformFee}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Pricing Plan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Slug (e.g. coaches)"
                value={newPlan.slug}
                onChange={(e) =>
                  setNewPlan((prev) => ({ ...prev, slug: e.target.value }))
                }
              />
              <Input
                placeholder="Name"
                value={newPlan.name}
                onChange={(e) =>
                  setNewPlan((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <Select
                value={newPlan.audience}
                onValueChange={(value) =>
                  setNewPlan((prev) => ({
                    ...prev,
                    audience: value as 'FREE' | 'COACH' | 'GYM',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">FREE</SelectItem>
                  <SelectItem value="COACH">COACH</SelectItem>
                  <SelectItem value="GYM">GYM</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Price in cents"
                value={newPlan.priceInCents}
                onChange={(e) =>
                  setNewPlan((prev) => ({
                    ...prev,
                    priceInCents: e.target.value,
                  }))
                }
              />
              <Input
                placeholder="Period label (e.g. /month)"
                value={newPlan.periodLabel}
                onChange={(e) =>
                  setNewPlan((prev) => ({
                    ...prev,
                    periodLabel: e.target.value,
                  }))
                }
              />
              <Input
                placeholder="CTA"
                value={newPlan.cta}
                onChange={(e) =>
                  setNewPlan((prev) => ({ ...prev, cta: e.target.value }))
                }
              />
              <Input
                className="md:col-span-2"
                placeholder="CTA link"
                value={newPlan.ctaLink}
                onChange={(e) =>
                  setNewPlan((prev) => ({ ...prev, ctaLink: e.target.value }))
                }
              />
              <Textarea
                className="md:col-span-2"
                placeholder="One feature per line"
                value={newPlan.features}
                onChange={(e) =>
                  setNewPlan((prev) => ({ ...prev, features: e.target.value }))
                }
              />
              <div className="md:col-span-2">
                <Button
                  onClick={async () => {
                    const features = newPlan.features
                      .split('\n')
                      .map((feature) => feature.trim())
                      .filter(Boolean);

                    await createPricingPlan.mutateAsync({
                      slug: newPlan.slug.trim(),
                      name: newPlan.name.trim(),
                      audience: newPlan.audience,
                      priceInCents: Number(newPlan.priceInCents || 0),
                      periodLabel: newPlan.periodLabel.trim() || undefined,
                      cta: newPlan.cta.trim(),
                      ctaLink: newPlan.ctaLink.trim(),
                      features,
                    });

                    setNewPlan({
                      slug: '',
                      name: '',
                      audience: 'COACH',
                      priceInCents: '1999',
                      periodLabel: '/month',
                      cta: 'Get Started',
                      ctaLink: '/register',
                      features: '',
                    });
                    toast.success('Pricing plan created');
                  }}
                  disabled={createPricingPlan.isPending}
                >
                  Create Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Plans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pricingPlansLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading pricing plans...
                </div>
              ) : pricingPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans yet.</p>
              ) : (
                pricingPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.audience} · {formatCurrency(plan.priceInCents)}
                        {plan.periodLabel || ''}
                      </p>
                    </div>
                    <Button
                      variant={plan.isActive ? 'outline' : 'default'}
                      size="sm"
                      onClick={async () => {
                        await updatePricingPlan.mutateAsync({
                          id: plan.id,
                          isActive: !plan.isActive,
                        });
                        toast.success(
                          `${plan.name} ${plan.isActive ? 'disabled' : 'enabled'}`,
                        );
                      }}
                    >
                      {plan.isActive ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
