import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useCreateChallenge } from '@/features/challenge';
import type { ChallengeType, ChallengeVisibility } from '@varaperformance/core';

const CHALLENGE_TYPES: { value: ChallengeType; label: string }[] = [
  { value: 'WORKOUT_COUNT', label: 'Workout Count' },
  { value: 'STREAK_DAYS', label: 'Streak Days' },
  { value: 'WEIGHT_LOSS', label: 'Weight Loss' },
  { value: 'STEPS_TOTAL', label: 'Total Steps' },
  { value: 'PR_COUNT', label: 'Personal Records' },
  { value: 'CUSTOM', label: 'Custom' },
];

const VISIBILITY_OPTIONS: { value: ChallengeVisibility; label: string }[] = [
  { value: 'PUBLIC', label: 'Public — anyone can find and join' },
  { value: 'INVITE', label: 'Invite Only — joinable via link' },
  { value: 'PRIVATE', label: 'Private — hidden from browse' },
];

export function CreateChallengeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const createChallenge = useCreateChallenge();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChallengeType>('WORKOUT_COUNT');
  const [visibility, setVisibility] = useState<ChallengeVisibility>('PUBLIC');
  const [goalValue, setGoalValue] = useState('');
  const [goalUnit, setGoalUnit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('WORKOUT_COUNT');
    setVisibility('PUBLIC');
    setGoalValue('');
    setGoalUnit('');
    setStartDate('');
    setEndDate('');
    setMaxParticipants('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    if (!goalValue || !goalUnit.trim()) {
      toast.error('Goal value and unit are required');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Start and end dates are required');
      return;
    }

    try {
      const result = await createChallenge.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        type,
        visibility,
        goalValue: Number(goalValue),
        goalUnit: goalUnit.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
      });
      toast.success('Challenge created!');
      resetForm();
      onOpenChange(false);
      navigate(`/challenges/${result.data.id}`);
    } catch {
      toast.error('Failed to create challenge');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit min-w-[min(28rem,95vw)] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Create a Challenge</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. 30-Day Workout Warrior"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your challenge, rules, and what participants can expect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <Label>Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as ChallengeVisibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goalValue">Goal Value</Label>
              <Input
                id="goalValue"
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goalUnit">Goal Unit</Label>
              <Input
                id="goalUnit"
                placeholder="e.g. workouts, days, lbs"
                value={goalUnit}
                onChange={(e) => setGoalUnit(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Max Participants (optional)</Label>
            <Input
              id="maxParticipants"
              type="number"
              min="1"
              placeholder="Leave empty for unlimited"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={createChallenge.isPending}
              className="gap-1.5"
            >
              {createChallenge.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create Challenge
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
