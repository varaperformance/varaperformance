import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useRegistrationAccessStatus,
  useValidateRegistrationCode,
} from '@/features/auth';

export default function RegistrationCodeGatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '/dashboard';
  const redirectTo =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: accessStatus, isLoading } = useRegistrationAccessStatus();
  const validateCode = useValidateRegistrationCode({
    onSuccess: () => {
      const next = new URLSearchParams({
        redirect: redirectTo,
        registrationCode: code.trim().toUpperCase(),
      });
      navigate(`/register/create?${next.toString()}`);
    },
    onError: () => {
      setError('Invalid or already used registration code');
    },
  });

  useEffect(() => {
    if (isLoading) return;
    const isPrivate = Boolean(accessStatus?.data?.privateModeEnabled);
    if (!isPrivate) {
      const next = new URLSearchParams({ redirect: redirectTo });
      navigate(`/register/create?${next.toString()}`, { replace: true });
    }
  }, [accessStatus?.data?.privateModeEnabled, isLoading, navigate, redirectTo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    validateCode.mutate(code.trim());
  };

  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Registration Code Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your code to continue to account registration.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="registration-code">Registration code</Label>
            <Input
              id="registration-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234EF"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={validateCode.isPending || code.trim().length < 6}
          >
            {validateCode.isPending ? 'Validating...' : 'Continue'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Need help or want updates? Join our Discord community at{' '}
            <a
              href="https://discord.gg/MGrfchn2kh"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              discord.gg/MGrfchn2kh
            </a>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
