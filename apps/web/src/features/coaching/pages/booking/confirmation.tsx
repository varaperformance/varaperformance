import { Link, useParams, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useCoach } from '@/features/coaching';
import coachFallbackImg from '@/assets/images/unsplash/coach-fallback.jpg';

const BookingConfirmationPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const packageName = searchParams.get('package') || 'Pro';
  const bookingRef = searchParams.get('ref');

  // Fetch coach data
  const { data: coachData, isLoading } = useCoach(slug);
  const coach = coachData?.data;
  const coachName = coach?.profile?.displayName || 'Coach';
  const coachAvatar = coach?.profile?.avatarUrl || coachFallbackImg;
  const coachTitle = coach?.title || 'Fitness Coach';
  // Use first part if name has space, otherwise use "Your coach" to avoid showing usernames
  const coachFirstName = coachName.includes(' ')
    ? coachName.split(' ')[0]
    : 'Your coach';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container max-w-2xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container max-w-2xl">
        <Card className="overflow-hidden">
          {/* Success Header */}
          <div className="bg-linear-to-br from-green-500 to-green-600 px-6 py-12 text-center text-white">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <svg
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-3xl font-bold">Booking Confirmed!</h1>
            <p className="text-green-100">
              Your coaching journey with {coachName} begins now
            </p>
          </div>

          <CardContent className="p-6">
            {/* Booking Details */}
            <div className="mb-8 rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-4 flex items-center gap-4">
                <img
                  src={coachAvatar}
                  alt={coachName}
                  className="h-16 w-16 rounded-xl object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <h3 className="font-semibold">{coachName}</h3>
                  <p className="text-sm text-muted-foreground">{coachTitle}</p>
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">Package:</span>{' '}
                    <span className="font-medium text-primary">
                      {packageName}
                    </span>
                  </p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Booking Reference
                  </span>
                  {bookingRef ? (
                    <span className="font-mono font-medium">{bookingRef}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      Pending email confirmation
                    </span>
                  )}
                </div>
                {!bookingRef && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    We could not read a booking reference from this link. If you
                    need support, contact us with your account email.
                  </p>
                )}
              </div>
            </div>

            {/* What's Next */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold">What happens next?</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Welcome Email</h4>
                    <p className="text-sm text-muted-foreground">
                      Check your inbox for a welcome email with login
                      credentials and next steps.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Initial Consultation</h4>
                    <p className="text-sm text-muted-foreground">
                      {coachFirstName} will reach out within 24 hours to
                      schedule your kickoff call.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Your Program</h4>
                    <p className="text-sm text-muted-foreground">
                      Within 3-5 days, you'll receive your personalized training
                      program in the app.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Start Training</h4>
                    <p className="text-sm text-muted-foreground">
                      Begin your journey towards your fitness goals with expert
                      guidance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access */}
            <div className="mb-8 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h3 className="mb-3 font-medium">Quick Access</h3>
              <div className={cn('grid gap-2', !isMobile && 'sm:grid-cols-2')}>
                <a
                  href="#"
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm transition-colors hover:bg-muted"
                >
                  <svg
                    className="h-5 w-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                    />
                  </svg>
                  Download Training App
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm transition-colors hover:bg-muted"
                >
                  <svg
                    className="h-5 w-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                    />
                  </svg>
                  Message {coachFirstName}
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm transition-colors hover:bg-muted"
                >
                  <svg
                    className="h-5 w-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                    />
                  </svg>
                  Schedule Call
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm transition-colors hover:bg-muted"
                >
                  <svg
                    className="h-5 w-5 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                    />
                  </svg>
                  Help Center
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <Link to="/coaches">Browse More Coaches</Link>
              </Button>
            </div>

            {/* Receipt Note */}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              A receipt has been sent to your email. You can also view and
              manage your subscription in{' '}
              <Link to="/dashboard" className="text-primary hover:underline">
                account settings
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;
