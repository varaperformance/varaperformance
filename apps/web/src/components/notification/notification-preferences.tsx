import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/notifications';
import { toast } from 'sonner';
import {
  Bell,
  CalendarCheck,
  Clock,
  CreditCard,
  Dumbbell,
  Heart,
  Layers,
  Mail,
  MessageSquare,
  Moon,
  Mountain,
  Megaphone,
  Package,
  ShieldCheck,
  Star,
  Syringe,
  Trophy,
  Users,
} from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${i === 0 ? '12' : i > 12 ? String(i - 12) : String(i)}:00 ${i < 12 ? 'AM' : 'PM'}`,
}));

interface CategoryToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

function CategoryToggle({
  icon,
  label,
  description,
  checked,
  onToggle,
  disabled,
}: CategoryToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md border border-primary/20 bg-primary/10 p-1.5">
          {icon}
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}

export function NotificationPreferencesContent() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const toggle = (key: string, value: boolean | number) => {
    update.mutate(
      { [key]: value },
      {
        onError: () => toast.error('Failed to update preference'),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!prefs) return null;

  return (
    <div className="space-y-6">
      {/* Category Preferences */}
      <Card className="card-elevated border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Notification Categories
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which types of notifications you want to receive.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <CategoryToggle
            icon={<CalendarCheck className="h-4 w-4 text-primary" />}
            label="Bookings"
            description="Session requests, approvals, confirmations, and cancellations"
            checked={prefs.bookings}
            onToggle={(v) => toggle('bookings', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<MessageSquare className="h-4 w-4 text-primary" />}
            label="Messages"
            description="New messages from coaches and gym partners"
            checked={prefs.messages}
            onToggle={(v) => toggle('messages', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<CreditCard className="h-4 w-4 text-primary" />}
            label="Payments"
            description="Payment confirmations and failed payment alerts"
            checked={prefs.payments}
            onToggle={(v) => toggle('payments', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<CreditCard className="h-4 w-4 text-primary" />}
            label="Subscriptions"
            description="Subscription renewals and cancellations"
            checked={prefs.subscriptions}
            onToggle={(v) => toggle('subscriptions', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Users className="h-4 w-4 text-primary" />}
            label="Gym Partners"
            description="Partner requests and accepted connections"
            checked={prefs.gymPartners}
            onToggle={(v) => toggle('gymPartners', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Dumbbell className="h-4 w-4 text-primary" />}
            label="Workout Plans"
            description="New workout plans assigned by your coach"
            checked={prefs.workoutPlans}
            onToggle={(v) => toggle('workoutPlans', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Star className="h-4 w-4 text-primary" />}
            label="Reviews"
            description="New reviews on your coaching profile"
            checked={prefs.reviews}
            onToggle={(v) => toggle('reviews', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Package className="h-4 w-4 text-primary" />}
            label="Commerce"
            description="Order confirmations, shipping updates, and refunds"
            checked={prefs.commerce}
            onToggle={(v) => toggle('commerce', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Heart className="h-4 w-4 text-primary" />}
            label="Social"
            description="High-fives and comments on your posts"
            checked={prefs.social}
            onToggle={(v) => toggle('social', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Clock className="h-4 w-4 text-primary" />}
            label="Session Reminders"
            description="Reminders before upcoming coaching sessions"
            checked={prefs.sessionReminders}
            onToggle={(v) => toggle('sessionReminders', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Layers className="h-4 w-4 text-primary" />}
            label="Stack Management"
            description="Supplement slot reminders for your active stack"
            checked={prefs.stackManagement}
            onToggle={(v) => toggle('stackManagement', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Syringe className="h-4 w-4 text-primary" />}
            label="Injection Tracker"
            description="Daily injection check-in reminders"
            checked={prefs.injectionTracker}
            onToggle={(v) => toggle('injectionTracker', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Mountain className="h-4 w-4 text-primary" />}
            label="Climb"
            description="Daily Climb selfie reminders"
            checked={prefs.climb}
            onToggle={(v) => toggle('climb', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Trophy className="h-4 w-4 text-primary" />}
            label="Ambassador"
            description="Ambassador application status updates"
            checked={prefs.ambassador}
            onToggle={(v) => toggle('ambassador', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Megaphone className="h-4 w-4 text-primary" />}
            label="System Announcements"
            description="Platform updates, profile verification, and daily digests"
            checked={prefs.systemAnnouncements}
            onToggle={(v) => toggle('systemAnnouncements', v)}
            disabled={update.isPending}
          />
        </CardContent>
      </Card>

      {/* Delivery Channels */}
      <Card className="card-elevated border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" />
            Delivery Channels
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control how notifications are delivered to you.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <CategoryToggle
            icon={<Bell className="h-4 w-4 text-primary" />}
            label="In-App Notifications"
            description="Real-time notifications inside the app"
            checked={prefs.inApp}
            onToggle={(v) => toggle('inApp', v)}
            disabled={update.isPending}
          />
          <CategoryToggle
            icon={<Mail className="h-4 w-4 text-primary" />}
            label="Daily Digest"
            description="Summary of unread notifications delivered to your inbox"
            checked={prefs.digest}
            onToggle={(v) => toggle('digest', v)}
            disabled={update.isPending}
          />
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card className="card-elevated border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4 text-primary" />
            Quiet Hours
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Silence real-time notifications during specific hours. Notifications
            are still saved and visible when you return.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <CategoryToggle
            icon={<Moon className="h-4 w-4 text-primary" />}
            label="Enable Quiet Hours"
            description="Pause real-time push notifications during the window below"
            checked={prefs.quietHoursEnabled}
            onToggle={(v) => toggle('quietHoursEnabled', v)}
            disabled={update.isPending}
          />

          {prefs.quietHoursEnabled && (
            <div className="flex flex-wrap items-center gap-3 pl-1">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  From
                </label>
                <Select
                  value={String(prefs.quietHoursStart)}
                  onValueChange={(v) => toggle('quietHoursStart', Number(v))}
                  disabled={update.isPending}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="mt-5 text-sm text-muted-foreground">to</span>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Until
                </label>
                <Select
                  value={String(prefs.quietHoursEnd)}
                  onValueChange={(v) => toggle('quietHoursEnd', Number(v))}
                  disabled={update.isPending}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-primary/30 bg-primary/8 px-3.5 py-3">
            <div className="flex items-start gap-2.5">
              <div className="rounded-md border border-primary/30 bg-primary/15 p-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Your notifications are always saved
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Quiet hours only suppress real-time push delivery. All
                  notifications are still recorded and available when you open
                  the app.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
