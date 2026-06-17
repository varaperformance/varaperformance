import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  Trophy,
  Users,
  Calendar,
  Target,
  Star,
  LogIn,
  LogOut,
  Medal,
  Share2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import {
  useChallenge,
  useChallengeLeaderboard,
  useJoinChallenge,
  useWithdrawChallenge,
  useDeleteChallenge,
  useShareChallengeToElevate,
} from '@/features/challenge';
import { EditChallengeDialog } from './edit-challenge';
import type { ChallengeLeaderboardEntry } from '@varaperformance/core';

const STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  UPCOMING: { label: 'Upcoming', variant: 'outline' },
  ACTIVE: { label: 'Active', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'secondary' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
  DRAFT: { label: 'Draft', variant: 'outline' },
};

function LeaderboardRow({ entry }: { entry: ChallengeLeaderboardEntry }) {
  const medalColors: Record<number, string> = {
    1: 'text-yellow-500',
    2: 'text-gray-400',
    3: 'text-amber-700',
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="w-7 text-center font-bold text-sm">
        {entry.rank <= 3 ? (
          <Medal className={`h-5 w-5 mx-auto ${medalColors[entry.rank]}`} />
        ) : (
          <span className="text-muted-foreground">{entry.rank}</span>
        )}
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={entry.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">
          {entry.displayName?.charAt(0)?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {entry.displayName ?? 'Anonymous'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{entry.progress}</p>
        {entry.completedAt && (
          <p className="text-[10px] text-green-500">Completed</p>
        )}
      </div>
    </div>
  );
}

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useChallenge(id!);
  const { data: lbData, isLoading: lbLoading } = useChallengeLeaderboard(id!);
  const joinMutation = useJoinChallenge();
  const withdrawMutation = useWithdrawChallenge();
  const deleteMutation = useDeleteChallenge();
  const shareMutation = useShareChallengeToElevate();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const challenge = data?.data;
  const leaderboard = lbData?.data?.items ?? [];
  const [now] = useState(Date.now);

  const isCreator = challenge && user?.sub === challenge.creator.id;
  const canEdit =
    isCreator &&
    challenge.status !== 'COMPLETED' &&
    challenge.status !== 'CANCELLED';

  const handleJoin = async () => {
    try {
      await joinMutation.mutateAsync(id!);
      toast.success('Joined the challenge!');
    } catch {
      toast.error('Failed to join challenge');
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawMutation.mutateAsync(id!);
      toast.success('Withdrawn from challenge');
    } catch {
      toast.error('Failed to withdraw');
    }
  };

  const handleShare = async () => {
    try {
      await shareMutation.mutateAsync(id!);
      toast.success('Challenge shared to Elevate!');
    } catch {
      toast.error('Already shared or failed to share');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id!);
      toast.success('Challenge deleted');
      navigate('/challenges');
    } catch {
      toast.error('Failed to delete challenge');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!challenge) return null;

  const statusInfo = STATUS_BADGE[challenge.status] ?? STATUS_BADGE.UPCOMING;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(challenge.endDate).getTime() - now) / 86400000),
  );
  const canJoin =
    !challenge.isParticipant &&
    (challenge.status === 'UPCOMING' || challenge.status === 'ACTIVE');
  const canWithdraw =
    challenge.isParticipant && challenge.status !== 'COMPLETED';

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6 animate-in fade-in slide-in-from-top-2 duration-400 motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-cyan-500/10" />

        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {challenge.isOfficial && (
              <Badge className="gap-1 text-[10px] bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                <Star className="h-3 w-3" />
                Official
              </Badge>
            )}
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {challenge.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
            {challenge.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Target className="h-4 w-4" />
              Goal: {challenge.goalValue} {challenge.goalUnit}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {challenge.participantCount} participants
              {challenge.maxParticipants
                ? ` / ${challenge.maxParticipants} max`
                : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {challenge.status === 'ACTIVE'
                ? `${daysLeft} days remaining`
                : `${new Date(challenge.startDate).toLocaleDateString()} — ${new Date(challenge.endDate).toLocaleDateString()}`}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Created by{' '}
              <span className="font-medium text-foreground">
                {challenge.creator.displayName ?? 'Unknown'}
              </span>
            </span>
          </div>

          {/* Progress bar for participant */}
          {challenge.isParticipant && challenge.myProgress !== undefined && (
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Your progress</span>
                <span className="font-medium">
                  {challenge.myProgress}/{challenge.goalValue}
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (challenge.myProgress / challenge.goalValue) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            {canJoin && (
              <Button
                onClick={handleJoin}
                disabled={joinMutation.isPending}
                className="gap-1.5"
              >
                <LogIn className="h-4 w-4" />
                {joinMutation.isPending ? 'Joining...' : 'Join Challenge'}
              </Button>
            )}
            {canWithdraw && (
              <Button
                variant="outline"
                onClick={handleWithdraw}
                disabled={withdrawMutation.isPending}
                className="gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                {withdrawMutation.isPending ? 'Leaving...' : 'Withdraw'}
              </Button>
            )}
            {challenge.isParticipant && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-500/20 text-green-700 dark:text-green-400"
              >
                Joined
              </Badge>
            )}
            {challenge.isParticipant && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={shareMutation.isPending}
                className="gap-1.5"
              >
                <Share2 className="h-4 w-4" />
                {shareMutation.isPending ? 'Sharing...' : 'Share to Elevate'}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="gap-1.5"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            {isCreator && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lbLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No participants yet. Be the first to join!
            </p>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((entry) => (
                <LeaderboardRow key={entry.userId} entry={entry} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog — key forces remount so useState re-initializes */}
      {challenge && canEdit && editOpen && (
        <EditChallengeDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          challenge={challenge}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challenge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{challenge.title}&rdquo;?
              This action cannot be undone and all participant data will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
