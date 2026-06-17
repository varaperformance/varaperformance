import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AmbassadorApplyPage() {
  const [form, setForm] = useState({
    reason: '',
    contribution: '',
    audience: '',
  });
  const [touched, setTouched] = useState({
    reason: false,
    contribution: false,
    audience: false,
  });
  const [success, setSuccess] = useState(false);

  const apply = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/team/ambassadors/apply', data).then((r) => r.data),
    onSuccess: () => setSuccess(true),
  });

  const errorMessage =
    apply.error && 'response' in (apply.error as object)
      ? ((apply.error as { response?: { data?: { message?: string } } })
          .response?.data?.message ?? 'Something went wrong. Please try again.')
      : 'Something went wrong. Please try again.';

  const isValid =
    form.reason.length >= 20 &&
    form.contribution.length >= 20 &&
    form.audience.length >= 20;

  const minLength = 20;
  const remaining = (value: string) => Math.max(0, minLength - value.length);

  if (success) {
    return (
      <div className="flex flex-col">
        <section className="py-32">
          <div className="container">
            <div className="mx-auto max-w-lg text-center">
              <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-green-500" />
              <h1 className="mb-4 text-3xl font-bold">
                Application Submitted!
              </h1>
              <p className="mb-8 text-muted-foreground">
                Thanks for applying to be a Vara Performance ambassador. We'll
                review your application and get back to you soon.
              </p>
              <Link to="/team">
                <Button variant="outline">Back to Team</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50 py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="vara-marketing-orb-drift absolute -left-40 top-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="vara-marketing-orb-drift-slow absolute -right-40 top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="vara-marketing-orb-drift-delayed absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        </div>
        <div className="container relative">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards text-4xl font-bold tracking-tight delay-100 duration-700 motion-reduce:animate-none md:text-5xl">
              Become an Ambassador
            </h1>
            <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards text-lg text-muted-foreground delay-200 duration-700 motion-reduce:animate-none">
              Join a community of movers and creators who represent Vara
              Performance. Share your journey, grow your reach, and help others
              train smarter.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16">
        <div className="container">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
            <Card className="h-fit border-border/50 bg-card/50 lg:col-span-1">
              <CardHeader>
                <CardTitle>Application Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Be specific about your training background and the type of
                  community value you create.
                </p>
                <p>
                  Include concrete examples of how you help people stay
                  consistent.
                </p>
                <p>
                  You can mention your key platforms and audience quality, not
                  just follower count.
                </p>
                <div className="pt-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/ambassadors">Back to Ambassador Page</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isValid) apply.mutate(form);
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Why do you want to be an ambassador?
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Tell us why you're passionate about Vara Performance and what being an ambassador means to you..."
                    value={form.reason}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, reason: true }))
                    }
                    onChange={(e) =>
                      setForm({ ...form, reason: e.target.value })
                    }
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.reason.length}/{minLength} minimum characters
                  </p>
                  {touched.reason && remaining(form.reason) > 0 && (
                    <p className="text-xs text-destructive">
                      Add {remaining(form.reason)} more characters.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contribution">
                    How will you contribute to the community?
                  </Label>
                  <Textarea
                    id="contribution"
                    placeholder="Describe how you plan to engage with and support the Vara community..."
                    value={form.contribution}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, contribution: true }))
                    }
                    onChange={(e) =>
                      setForm({ ...form, contribution: e.target.value })
                    }
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.contribution.length}/{minLength} minimum characters
                  </p>
                  {touched.contribution && remaining(form.contribution) > 0 && (
                    <p className="text-xs text-destructive">
                      Add {remaining(form.contribution)} more characters.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">
                    Tell us about your audience and reach
                  </Label>
                  <Textarea
                    id="audience"
                    placeholder="Share your social media presence, follower count, content style, or any platforms you're active on..."
                    value={form.audience}
                    onBlur={() =>
                      setTouched((prev) => ({ ...prev, audience: true }))
                    }
                    onChange={(e) =>
                      setForm({ ...form, audience: e.target.value })
                    }
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.audience.length}/{minLength} minimum characters
                  </p>
                  {touched.audience && remaining(form.audience) > 0 && (
                    <p className="text-xs text-destructive">
                      Add {remaining(form.audience)} more characters.
                    </p>
                  )}
                </div>

                {apply.isError && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12"
                  disabled={!isValid || apply.isPending}
                >
                  {apply.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Submit Application
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
