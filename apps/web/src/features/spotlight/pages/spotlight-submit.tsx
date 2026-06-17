import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/features/auth';
import { useSubmitSpotlight } from '@/features/spotlight';

const INITIAL_STATE = {
  imageUrl: '',
  videoUrl: '',
  tagline: '',
  story: '',
  achievements: '',
  sport: '',
  quote: '',
  reviewNotes: '',
};

export default function SpotlightSubmitPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const submitStory = useSubmitSpotlight();
  const isMobile = useIsMobile();
  const [form, setForm] = useState(INITIAL_STATE);

  const canSubmit = useMemo(() => {
    return (
      form.imageUrl.trim() &&
      form.tagline.trim() &&
      form.story.trim() &&
      form.sport.trim()
    );
  }, [form]);

  const onSubmit = () => {
    submitStory.mutate(
      {
        imageUrl: form.imageUrl.trim(),
        videoUrl: form.videoUrl.trim() || undefined,
        tagline: form.tagline.trim(),
        story: form.story.trim(),
        achievements: form.achievements
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        sport: form.sport.trim(),
        quote: form.quote.trim() || undefined,
        reviewNotes: form.reviewNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Your story was submitted for review.');
          navigate('/spotlight');
        },
        onError: () => {
          toast.error('Unable to submit your story. Please try again.');
        },
      },
    );
  };

  return (
    <div className="container py-10 md:py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/spotlight">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Submit Your Story
            </h1>
            <p className="text-sm text-muted-foreground">
              Logged in as {user?.email}. Your submission will be reviewed by
              our team before publishing.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Spotlight Submission</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your name, handle, member since date, and social links are pulled
              from your account profile.
            </p>
          </CardHeader>
          <CardContent
            className={cn('grid gap-4', !isMobile && 'md:grid-cols-2')}
          >
            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Input
                id="sport"
                value={form.sport}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sport: event.target.value }))
                }
                placeholder="Running, strength, yoga, cycling..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tagline: event.target.value }))
                }
                placeholder="From desk job to deadlift PR"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="story">Story</Label>
              <Textarea
                id="story"
                rows={6}
                value={form.story}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, story: event.target.value }))
                }
                placeholder="Share your transformation journey..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="achievements">Achievements (one per line)</Label>
              <Textarea
                id="achievements"
                rows={4}
                value={form.achievements}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    achievements: event.target.value,
                  }))
                }
                placeholder="First 500lb deadlift"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={form.imageUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, imageUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="videoUrl">Video URL (optional)</Label>
              <Input
                id="videoUrl"
                value={form.videoUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, videoUrl: event.target.value }))
                }
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote">Quote (optional)</Label>
              <Input
                id="quote"
                value={form.quote}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quote: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reviewNotes">
                Notes for the review team (optional)
              </Label>
              <Textarea
                id="reviewNotes"
                rows={3}
                value={form.reviewNotes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    reviewNotes: event.target.value,
                  }))
                }
                placeholder="Anything the team should know before reviewing your story"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button
                disabled={!canSubmit || submitStory.isPending}
                onClick={onSubmit}
              >
                {submitStory.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Story'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
