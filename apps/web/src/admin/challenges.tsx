import { useState } from 'react';
import { Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useAdminChallenges,
  useAdminCreateChallenge,
  useAdminUpdateChallenge,
  useAdminDeleteChallenge,
} from '@/hooks/use-admin';
import type {
  ChallengeResponse,
  ChallengeType,
  ChallengeVisibility,
} from '@varaperformance/core';

const STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  DRAFT: { label: 'Draft', variant: 'outline' },
  UPCOMING: { label: 'Upcoming', variant: 'outline' },
  ACTIVE: { label: 'Active', variant: 'default' },
  COMPLETED: { label: 'Completed', variant: 'secondary' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

const CHALLENGE_TYPES: { value: ChallengeType; label: string }[] = [
  { value: 'WORKOUT_COUNT', label: 'Workout Count' },
  { value: 'STREAK_DAYS', label: 'Streak Days' },
  { value: 'WEIGHT_LOSS', label: 'Weight Loss' },
  { value: 'STEPS_TOTAL', label: 'Total Steps' },
  { value: 'PR_COUNT', label: 'Personal Records' },
  { value: 'CUSTOM', label: 'Custom' },
];

function CreateChallengeDialog() {
  const [open, setOpen] = useState(false);
  const createChallenge = useAdminCreateChallenge();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChallengeType>('WORKOUT_COUNT');
  const [goalValue, setGoalValue] = useState('');
  const [goalUnit, setGoalUnit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');

  const handleCreate = async () => {
    if (
      !title.trim() ||
      !description.trim() ||
      !goalValue ||
      !goalUnit ||
      !startDate ||
      !endDate
    ) {
      toast.error('All fields are required');
      return;
    }

    try {
      await createChallenge.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        type,
        visibility: 'PUBLIC' as ChallengeVisibility,
        goalValue: Number(goalValue),
        goalUnit: goalUnit.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
      });
      toast.success('Official challenge created');
      setOpen(false);
      setTitle('');
      setDescription('');
      setGoalValue('');
      setGoalUnit('');
      setStartDate('');
      setEndDate('');
      setMaxParticipants('');
    } catch {
      toast.error('Failed to create challenge');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Create Official Challenge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-fit min-w-[min(28rem,95vw)] max-w-[95vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Official Vara Challenge</DialogTitle>
          <DialogDescription>
            Official challenges are highlighted and promoted to all users.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
            />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as ChallengeType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHALLENGE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Participants</Label>
              <Input
                type="number"
                min="1"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label>Goal Value</Label>
              <Input
                type="number"
                min="1"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Goal Unit</Label>
              <Input
                value={goalUnit}
                onChange={(e) => setGoalUnit(e.target.value)}
                maxLength={50}
                placeholder="workouts, days, lbs"
              />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={createChallenge.isPending}
              className="gap-1.5"
            >
              {createChallenge.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create Challenge
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminChallengesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [officialFilter, setOfficialFilter] = useState<string>('all');

  const { data, isLoading } = useAdminChallenges({
    status: statusFilter === 'all' ? undefined : statusFilter,
    isOfficial:
      officialFilter === 'all' ? undefined : officialFilter === 'true',
  });
  const updateChallenge = useAdminUpdateChallenge();
  const deleteChallenge = useAdminDeleteChallenge();

  const challenges = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateChallenge.mutateAsync({ id, data: { status } });
      toast.success(`Challenge status updated to ${status}`);
    } catch {
      toast.error('Failed to update challenge');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteChallenge.mutateAsync(id);
      toast.success(`Deleted "${title}"`);
    } catch {
      toast.error('Failed to delete challenge');
    }
  };

  const handleToggleOfficial = async (challenge: ChallengeResponse) => {
    try {
      await updateChallenge.mutateAsync({
        id: challenge.id,
        data: { isOfficial: !challenge.isOfficial },
      });
      toast.success(
        challenge.isOfficial ? 'Removed official status' : 'Marked as official',
      );
    } catch {
      toast.error('Failed to update challenge');
    }
  };

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
          <p className="mt-1 text-muted-foreground">
            Manage official and community challenges. {total} total.
          </p>
        </div>
        <CreateChallengeDialog />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={officialFilter} onValueChange={setOfficialFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="true">Official only</SelectItem>
            <SelectItem value="false">Community only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Challenges</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No challenges found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Official</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challenges.map((c) => {
                  const statusInfo =
                    STATUS_BADGE[c.status] ?? STATUS_BADGE.DRAFT;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {c.title}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={c.status}
                          onValueChange={(v) => handleStatusChange(c.id, v)}
                        >
                          <SelectTrigger className="w-28 h-7 text-xs">
                            <Badge
                              variant={statusInfo.variant}
                              className="text-[10px]"
                            >
                              {statusInfo.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="UPCOMING">Upcoming</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs">
                        {c.type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        {c.participantCount}
                        {c.maxParticipants ? `/${c.maxParticipants}` : ''}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.startDate).toLocaleDateString()} —{' '}
                        {new Date(c.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggleOfficial(c)}
                        >
                          <Star
                            className={`h-4 w-4 ${c.isOfficial ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(c.id, c.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
