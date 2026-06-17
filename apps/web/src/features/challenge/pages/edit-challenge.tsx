import { useState } from 'react';
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
import { useUpdateChallenge } from '@/features/challenge';
import type {
  ChallengeResponse,
  ChallengeVisibility,
} from '@varaperformance/core';

const VISIBILITY_OPTIONS: { value: ChallengeVisibility; label: string }[] = [
  { value: 'PUBLIC', label: 'Public — anyone can find and join' },
  { value: 'INVITE', label: 'Invite Only — joinable via link' },
  { value: 'PRIVATE', label: 'Private — hidden from browse' },
];

export function EditChallengeDialog({
  open,
  onOpenChange,
  challenge,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: ChallengeResponse;
}) {
  const updateChallenge = useUpdateChallenge();

  const [title, setTitle] = useState(challenge.title);
  const [description, setDescription] = useState(challenge.description);
  const [visibility, setVisibility] = useState<ChallengeVisibility>(
    challenge.visibility,
  );
  const [goalValue, setGoalValue] = useState(String(challenge.goalValue));
  const [goalUnit, setGoalUnit] = useState(challenge.goalUnit);
  const [startDate, setStartDate] = useState(challenge.startDate.split('T')[0]);
  const [endDate, setEndDate] = useState(challenge.endDate.split('T')[0]);
  const [maxParticipants, setMaxParticipants] = useState(
    challenge.maxParticipants ? String(challenge.maxParticipants) : '',
  );

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
      await updateChallenge.mutateAsync({
        id: challenge.id,
        data: {
          title: title.trim(),
          description: description.trim(),
          visibility,
          goalValue: Number(goalValue),
          goalUnit: goalUnit.trim(),
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          maxParticipants: maxParticipants
            ? Number(maxParticipants)
            : undefined,
        },
      });
      toast.success('Challenge updated!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update challenge');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-fit min-w-[min(28rem,95vw)] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Edit Challenge</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              placeholder="e.g. 30-Day Workout Warrior"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Describe your challenge, rules, and what participants can expect..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
            />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-goalValue">Goal Value</Label>
              <Input
                id="edit-goalValue"
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-goalUnit">Goal Unit</Label>
              <Input
                id="edit-goalUnit"
                placeholder="e.g. workouts, days, lbs"
                value={goalUnit}
                onChange={(e) => setGoalUnit(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">End Date</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-maxParticipants">
              Max Participants (optional)
            </Label>
            <Input
              id="edit-maxParticipants"
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
              disabled={updateChallenge.isPending}
              className="gap-1.5"
            >
              {updateChallenge.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
