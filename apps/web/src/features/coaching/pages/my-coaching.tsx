import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { writeClipboard } from '@/lib/clipboard';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { cn } from '@/lib/utils';
import {
  useUserBookings,
  useCancelUserBooking,
  formatPrice,
} from '@/features/coaching';
import { PaymentStep } from '@/components/payment/stripe-checkout';
import {
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Calendar,
  Package,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Users,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  PENDING: {
    label: 'Pending Approval',
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    icon: Clock,
    description: 'Waiting for coach approval',
  },
  APPROVED: {
    label: 'Ready to Pay',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: CreditCard,
    description: 'Coach approved - complete payment to start',
  },
  CONFIRMED: {
    label: 'Active',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: CheckCircle2,
    description: 'Your coaching is active',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    icon: CheckCircle2,
    description: 'Coaching completed',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: XCircle,
    description: 'Booking was cancelled',
  },
};

type BookingStatus = keyof typeof statusConfig;

export default function MyCoachingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: bookingsData, isLoading, error } = useUserBookings();
  const cancelBooking = useCancelUserBooking();

  // Handle payment redirect return from hosted checkout (Stripe)
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    const bookingId = searchParams.get('booking_id');

    if (checkoutStatus && bookingId) {
      if (checkoutStatus === 'success') {
        toast.success(
          'Payment successful. Activating your coaching subscription...',
        );
      } else if (checkoutStatus === 'cancel') {
        toast.message('Checkout cancelled');
      }

      setSearchParams({});
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const handlePaymentSuccess = useCallback(() => {
    setPayingBookingId(null);
    queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
  }, [queryClient]);

  const handleCancelBooking = (bookingId: string) => {
    setCancelBookingId(bookingId);
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-1/3 bg-muted rounded" />
                    <div className="h-4 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load your coaching bookings. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bookings = bookingsData?.data?.bookings || [];

  return (
    <>
      <div className="py-6 px-4 sm:px-6 lg:px-8 xl:px-10 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
          <div className="pointer-events-none absolute -left-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Client Portal
              </p>
              <h1 className="text-3xl font-bold tracking-tight mt-1">
                My Coaching
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your bookings, payments, and active coaching
                subscriptions.
              </p>
            </div>
            <Button
              asChild
              className="bg-linear-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <Link to="/coaches">
                <Users className="h-4 w-4 mr-2" />
                Find a Coach
              </Link>
            </Button>
          </div>
        </section>

        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const status =
                statusConfig[booking.status as BookingStatus] ||
                statusConfig.PENDING;
              const StatusIcon = status.icon;
              const coach = booking.coach;
              const pkg = booking.package;
              const subscription = booking.subscription;

              return (
                <Card key={booking.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Main Content */}
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Coach Avatar */}
                        <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                          <AvatarImage
                            src={coach?.user?.profile?.avatarUrl || undefined}
                            alt={coach?.user?.profile?.displayName || 'Coach'}
                          />
                          <AvatarFallback className="text-lg font-semibold bg-primary/10">
                            {(coach?.user?.profile?.displayName || 'C')
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <Link
                                to={`/coaches/${coach?.user?.profile?.displayName || coach?.id}`}
                                className="text-lg font-semibold hover:text-primary transition-colors"
                              >
                                {coach?.user?.profile?.displayName || 'Coach'}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {coach?.title || 'Performance Coach'}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn('shrink-0', status.color)}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>

                          {/* Booking Reference */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              Ref:{' '}
                              <code className="bg-muted px-1 py-0.5 rounded">
                                {booking.referenceCode}
                              </code>
                              <button
                                onClick={() => {
                                  writeClipboard(booking.referenceCode);
                                  toast.success('Reference code copied');
                                }}
                                className="p-0.5 hover:text-foreground transition-colors"
                                title="Copy reference code"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              ID:{' '}
                              <code className="bg-muted px-1 py-0.5 rounded font-mono text-[10px]">
                                {booking.id}
                              </code>
                              <button
                                onClick={() => {
                                  writeClipboard(booking.id);
                                  toast.success('Booking ID copied');
                                }}
                                className="p-0.5 hover:text-foreground transition-colors"
                                title="Copy booking ID"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </span>
                          </div>

                          {/* Package Info */}
                          {pkg && (
                            <div className="mt-3 flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Package className="h-4 w-4" />
                                <span>{pkg.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 font-medium">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {formatPrice(
                                    pkg.priceInCents,
                                    pkg.billingCycle,
                                  )}
                                </span>
                                <span className="text-muted-foreground font-normal">
                                  / {pkg.billingCycle?.toLowerCase()}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Subscription Period */}
                          {subscription && booking.status === 'CONFIRMED' && (
                            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Current period:{' '}
                                {new Date(
                                  subscription.currentPeriodStart,
                                ).toLocaleDateString()}{' '}
                                -{' '}
                                {new Date(
                                  subscription.currentPeriodEnd,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {/* Payment Receipt Info */}
                          {booking.paidAt && (
                            <div className="mt-3 p-2 bg-muted/50 rounded-md text-xs">
                              <div className="font-medium text-sm mb-1">
                                Payment Receipt
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                                <span>
                                  Paid:{' '}
                                  {new Date(
                                    booking.paidAt,
                                  ).toLocaleDateString()}
                                </span>
                                {(booking.stripePaymentIntentId ||
                                  booking.stripeCheckoutSessionId) && (
                                  <span>
                                    Transaction:{' '}
                                    <code className="bg-muted px-1 py-0.5 rounded">
                                      {booking.stripePaymentIntentId ||
                                        booking.stripeCheckoutSessionId}
                                    </code>
                                  </span>
                                )}
                                {pkg && (
                                  <span>
                                    Amount:{' '}
                                    {formatPrice(
                                      pkg.priceInCents,
                                      pkg.billingCycle,
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {(booking.status === 'APPROVED' ||
                      booking.status === 'PENDING') && (
                      <>
                        <Separator />
                        <div className="p-4 bg-muted/30">
                          {booking.status === 'APPROVED' ? (
                            payingBookingId === booking.id ? (
                              <PaymentStep
                                bookingId={booking.id}
                                packageName={pkg?.name}
                                amount={pkg?.priceInCents}
                                billingCycle={pkg?.billingCycle}
                                onSuccess={handlePaymentSuccess}
                                onCancel={() => setPayingBookingId(null)}
                              />
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                  <Sparkles className="h-4 w-4 text-blue-500" />
                                  <span className="text-muted-foreground">
                                    Your coach approved your request! Complete
                                    payment to start.
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleCancelBooking(booking.id)
                                    }
                                    disabled={cancelBooking.isPending}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      setPayingBookingId(booking.id)
                                    }
                                  >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Pay Now
                                  </Button>
                                </div>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-yellow-500" />
                                <span className="text-muted-foreground">
                                  Waiting for coach to review your request...
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={cancelBooking.isPending}
                              >
                                Cancel Request
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Active subscription actions */}
                    {booking.status === 'CONFIRMED' && (
                      <>
                        <Separator />
                        <div className="p-4 bg-muted/30 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Your coaching subscription is active</span>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              to={`/coaches/${coach?.user?.profile?.displayName || coach?.id}`}
                            >
                              View Coach
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No Coaching Bookings Yet</CardTitle>
              <CardDescription>
                Start your fitness journey by finding a coach that matches your
                goals.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button asChild size="lg">
                <Link to="/coaches">
                  <Users className="h-4 w-4 mr-2" />
                  Browse Coaches
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog
        open={!!cancelBookingId}
        onOpenChange={(open) => !open && setCancelBookingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this booking? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelBooking.isPending}
              onClick={() => {
                if (cancelBookingId) {
                  cancelBooking.mutate(
                    { bookingId: cancelBookingId },
                    { onSettled: () => setCancelBookingId(null) },
                  );
                }
              }}
            >
              {cancelBooking.isPending ? 'Cancelling...' : 'Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
