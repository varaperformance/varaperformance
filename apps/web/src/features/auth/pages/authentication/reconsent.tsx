import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useConsentCheck,
  useActiveLegalDocuments,
  useSubmitReconsent,
  type ConsentGrant,
} from '@/features/auth';
import api from '@/lib/api';
import type { SuccessResponse, ProfileResponse } from '@varaperformance/core';

const consentLabelMap: Record<string, string> = {
  TERMS_OF_SERVICE: 'Terms of Service',
  PRIVACY_POLICY: 'Privacy Policy',
  MARKETING: 'Marketing Communications',
  DATA_PROCESSING: 'Data Processing Agreement',
  AI_FEATURES_CONSENT: 'AI Features Consent',
  HIPAA_AUTHORIZATION: 'HIPAA Authorization',
  DATA_SHARING: 'Data Sharing Agreement',
  COOKIES: 'Cookie Policy',
  HEALTH_DATA_CONSENT: 'Health Data Sharing Agreement',
  SECURITY_POLICY: 'Security Policy',
  ACCESSIBILITY_STATEMENT: 'Accessibility Statement',
};

const consentLinkMap: Record<string, string> = {
  TERMS_OF_SERVICE: '/terms',
  PRIVACY_POLICY: '/privacy',
  MARKETING: '/privacy',
  DATA_PROCESSING: '/privacy',
  AI_FEATURES_CONSENT: '/ai-legal',
  HIPAA_AUTHORIZATION: '/hipaa',
  DATA_SHARING: '/privacy',
  COOKIES: '/privacy',
  HEALTH_DATA_CONSENT: '/health-data-consent',
  SECURITY_POLICY: '/security',
  ACCESSIBILITY_STATEMENT: '/accessibility',
};

/**
 * Check if user's profile is complete and navigate accordingly
 */
async function checkProfileAndNavigate(
  navigate: ReturnType<typeof useNavigate>,
  defaultPath: string,
) {
  try {
    const response = await api.get<SuccessResponse<ProfileResponse>>('profile');
    if (response.data.success && response.data.data.completedAt === null) {
      navigate('/profile/create', { replace: true });
    } else {
      navigate(defaultPath, { replace: true });
    }
  } catch {
    // Profile doesn't exist or error - redirect to create
    navigate('/profile/create', { replace: true });
  }
}

/**
 * SOC2/HIPAA: Re-consent page for updated legal documents
 * Displayed when a user's previously accepted consent versions are outdated
 */
const ReconsentPage = () => {
  const navigate = useNavigate();
  const [acceptedConsents, setAcceptedConsents] = useState<
    Record<string, boolean>
  >({});

  const { data: consentCheck, isLoading: isCheckLoading } = useConsentCheck();
  const { data: legalDocsResponse, isLoading: isDocsLoading } =
    useActiveLegalDocuments();
  const submitMutation = useSubmitReconsent({
    onSuccess: async () => {
      await checkProfileAndNavigate(navigate, '/dashboard');
    },
  });

  const checkResult = consentCheck?.data;
  const legalDocs = legalDocsResponse?.data ?? [];

  // Redirect if no re-consent needed
  useEffect(() => {
    if (checkResult && !checkResult.needsReconsent) {
      checkProfileAndNavigate(navigate, '/dashboard');
    }
  }, [checkResult, navigate]);

  // Get documents that need re-consent
  const outdatedTypes = checkResult?.outdatedConsents.map((c) => c.type) ?? [];
  const missingTypes = checkResult?.missingConsents ?? [];
  const allRequiredTypes = [...new Set([...outdatedTypes, ...missingTypes])];

  const documentsToAccept = legalDocs.filter((doc) =>
    allRequiredTypes.includes(doc.type),
  );

  // Check if all required consents are accepted
  const allAccepted = documentsToAccept.every(
    (doc) => acceptedConsents[doc.type],
  );

  const handleToggle = (type: string, checked: boolean) => {
    setAcceptedConsents((prev) => ({ ...prev, [type]: checked }));
  };

  const handleSubmit = () => {
    const consents: ConsentGrant[] = documentsToAccept.map((doc) => ({
      type: doc.type,
      version: doc.version,
    }));
    submitMutation.mutate(consents);
  };

  const isLoading = isCheckLoading || isDocsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Checking consent status...</p>
        </div>
      </div>
    );
  }

  if (!checkResult?.needsReconsent) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden py-12">
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-80 w-80 animate-pulse rounded-full bg-amber-500/20 blur-3xl" />
          <div
            className="absolute -right-40 bottom-0 h-96 w-96 animate-pulse rounded-full bg-amber-500/10 blur-3xl"
            style={{ animationDelay: '1s' }}
          />
        </div>

        <div className="container relative z-10">
          <div className="mx-auto max-w-lg">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <svg
                  className="h-8 w-8 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Legal Documents Updated
              </h1>
              <p className="text-muted-foreground">
                We've updated our legal agreements. Please review and accept the
                changes to continue using Vara Performance.
              </p>
            </div>

            {/* Consent Card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 p-8 shadow-xl backdrop-blur-sm">
              {/* Outdated consents info */}
              {checkResult.outdatedConsents.length > 0 && (
                <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <h3 className="mb-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                    Updated Documents
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {checkResult.outdatedConsents.map((consent) => (
                      <li key={consent.type}>
                        {consentLabelMap[consent.type] ??
                          consent.type.replace(/_/g, ' ')}{' '}
                        — {consent.userVersion} → {consent.currentVersion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing consents info */}
              {checkResult.missingConsents.length > 0 && (
                <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h3 className="mb-2 text-sm font-medium text-primary">
                    New Required Agreements
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {checkResult.missingConsents.map((type) => (
                      <li key={type}>
                        {consentLabelMap[type] ?? type.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Consent checkboxes */}
              <div className="space-y-4">
                {documentsToAccept.map((doc) => {
                  const isOutdated = outdatedTypes.includes(doc.type);
                  const isMissing = missingTypes.includes(doc.type);

                  return (
                    <div
                      key={doc.type}
                      className="flex items-start space-x-3 rounded-lg border border-border/50 bg-background/50 p-4"
                    >
                      <Checkbox
                        id={doc.type}
                        checked={acceptedConsents[doc.type] ?? false}
                        onCheckedChange={(checked) =>
                          handleToggle(doc.type, checked === true)
                        }
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={doc.type}
                          className="text-sm font-medium leading-relaxed"
                        >
                          {consentLabelMap[doc.type] ??
                            doc.type.replace(/_/g, ' ')}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({doc.version})
                          </span>
                        </label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isOutdated &&
                            'Updated version requires re-acceptance'}
                          {isMissing && 'New agreement requiring acceptance'}
                        </p>
                        <a
                          href={consentLinkMap[doc.type] ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                        >
                          View document
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                size="lg"
                className="mt-6 w-full shadow-lg shadow-primary/25"
                disabled={!allAccepted || submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <>
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Confirming...
                  </>
                ) : (
                  'Accept and Continue'
                )}
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                By accepting, you agree to the updated terms effective
                immediately.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReconsentPage;
