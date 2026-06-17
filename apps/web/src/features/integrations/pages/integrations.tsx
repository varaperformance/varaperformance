import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Plug,
  Watch,
  Heart,
  Activity,
  Smartphone,
  Cloud,
  CheckCircle,
  Zap,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { isNativeApp, getCapacitorPlatform } from '@/lib/capacitor';
import {
  isHealthAvailable,
  hasHealthPermissions,
  requestHealthPermissions,
} from '@/lib/health-data';
import { syncHealthToBackend } from '@/lib/health-sync';
import { openUrl } from '@/lib/browser';
import { useAuth } from '@/features/auth';
import {
  useActiveLegalDocuments,
  useUserConsents,
  useSubmitReconsent,
} from '@/features/auth/hooks/use-consent';
import type { ConsentType } from '@/features/auth/hooks/use-consent';
import {
  useDisconnectStrava,
  useDisconnectWithings,
  useStartStravaConnect,
  useStartWithingsConnect,
  useStravaStatus,
  useSyncStravaActivities,
  useSyncWithings,
  useWithingsStatus,
} from '@/features/integrations';
import {
  useSyncPreferences,
  useUpdateSyncPreferences,
} from '@/features/health';

interface Integration {
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  features: string[];
  status: 'available' | 'coming-soon' | 'beta' | 'mobile-only';
}

const HEALTH_CONSENT_TYPES: ConsentType[] = ['HEALTH_DATA_CONSENT'];

/** Unified HealthKit integration — name + copy adapts per platform */
function getHealthIntegrationInfo(): {
  name: string;
  description: string;
  features: string[];
} {
  const platform = getCapacitorPlatform();
  if (platform === 'ios') {
    return {
      name: 'Apple Health',
      description:
        'Two-way sync with Apple Health for a complete picture of your wellness data.',
      features: [
        'Bidirectional sync',
        'Nutrition data',
        'Workout export',
        'Health metrics',
      ],
    };
  }
  if (platform === 'android') {
    return {
      name: 'Google Health',
      description:
        'Sync your Android device activity, workouts, and health data with Google Health Connect.',
      features: [
        'Activity tracking',
        'Heart rate sync',
        'Workout data',
        'Step counting',
      ],
    };
  }
  // Desktop / mobile web
  return {
    name: 'HealthKit',
    description:
      'Sync health and fitness data from your device. Install the Vara mobile app to connect Apple Health (iOS) or Google Health Connect (Android).',
    features: [
      'Bidirectional sync',
      'Workout import & export',
      'Health metrics',
      'Step counting',
    ],
  };
}

const HEALTH_INFO = getHealthIntegrationInfo();
const HEALTH_INTEGRATION_NAME = HEALTH_INFO.name;

const IntegrationsPage = () => {
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'connected' | 'available' | 'coming-soon' | 'mobile-only'
  >('all');

  // ─── Health consent state ───────────────────────────────────
  const [showHealthConsentDialog, setShowHealthConsentDialog] = useState(false);
  const [acceptedHealthTerms, setAcceptedHealthTerms] = useState(false);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [healthPermitted, setHealthPermitted] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);

  const { data: syncPrefsData } = useSyncPreferences({
    enabled: isAuthenticated,
  });
  const updateSyncPrefs = useUpdateSyncPreferences();
  const syncPrefs = syncPrefsData ?? null;

  const submitReconsent = useSubmitReconsent();
  const { data: healthLegalDocsResponse } =
    useActiveLegalDocuments(HEALTH_CONSENT_TYPES);
  const { data: userConsentsResponse } = useUserConsents({
    enabled: isAuthenticated,
  });

  const healthRequiredDocs = useMemo(
    () =>
      HEALTH_CONSENT_TYPES.map((type) =>
        (healthLegalDocsResponse?.data ?? []).find((doc) => doc.type === type),
      ).filter((doc): doc is NonNullable<typeof doc> => doc != null),
    [healthLegalDocsResponse?.data],
  );

  const hasHealthConsent = useMemo(() => {
    if (healthRequiredDocs.length !== HEALTH_CONSENT_TYPES.length) return false;
    const consents = userConsentsResponse?.data ?? [];
    return healthRequiredDocs.every((doc) =>
      consents.some(
        (consent) =>
          consent.type === doc.type && consent.version === doc.version,
      ),
    );
  }, [healthRequiredDocs, userConsentsResponse?.data]);

  // Check native health availability on mount
  useEffect(() => {
    if (!isNativeApp()) return;
    void isHealthAvailable().then(setHealthAvailable);
    void hasHealthPermissions().then(setHealthPermitted);
  }, []);

  const handleHealthConnect = () => {
    if (!isAuthenticated) {
      toast.error('Sign in first to connect health data');
      return;
    }
    if (hasHealthConsent) {
      // Already consented — just request native permissions
      void requestHealthPermissions().then((result) => {
        if (result.granted) {
          setHealthPermitted(true);
          toast.success('Health data connected');
        } else {
          toast.error(result.error ?? 'Health permissions were denied');
        }
      });
      return;
    }
    // Show consent dialog first
    setAcceptedHealthTerms(false);
    setShowHealthConsentDialog(true);
  };

  const handleConfirmHealthConsent = async () => {
    if (
      !acceptedHealthTerms ||
      healthRequiredDocs.length !== HEALTH_CONSENT_TYPES.length
    )
      return;

    // Record consent
    await Promise.all(
      healthRequiredDocs.map((doc) =>
        submitReconsent.mutateAsync([{ type: doc.type, version: doc.version }]),
      ),
    );

    // Request native permissions after consent
    const result = await requestHealthPermissions();
    if (result.granted) {
      setHealthPermitted(true);
      toast.success('Health data connected and consent recorded');
    } else {
      toast.error(
        result.error ??
          'Consent recorded but health permissions were denied. You can grant them later in device settings.',
      );
    }

    setShowHealthConsentDialog(false);
    setAcceptedHealthTerms(false);
  };

  // On web we can't check native permissions — consent alone means connected
  const isHealthConnected = isNativeApp()
    ? hasHealthConsent && healthPermitted
    : hasHealthConsent;

  const stravaStatusQuery = useStravaStatus({ enabled: isAuthenticated });
  const startStravaConnect = useStartStravaConnect();
  const disconnectStrava = useDisconnectStrava({
    onSuccess: () => {
      toast.success('Strava disconnected');
    },
    onError: () => {
      toast.error('Unable to disconnect Strava');
    },
  });

  const isStravaConnected =
    !!isAuthenticated && !!stravaStatusQuery.data?.data?.connected;

  const syncStravaActivities = useSyncStravaActivities({
    onSuccess: (response) => {
      toast.success(
        `Imported ${response.data.importedCount} Strava activities`,
      );
    },
    onError: () => {
      toast.error('Unable to sync Strava activities right now');
    },
  });

  const withingsStatusQuery = useWithingsStatus({ enabled: isAuthenticated });
  const startWithingsConnect = useStartWithingsConnect();
  const disconnectWithings = useDisconnectWithings({
    onSuccess: () => {
      toast.success('Withings disconnected');
    },
    onError: () => {
      toast.error('Unable to disconnect Withings');
    },
  });
  const isWithingsConnected =
    !!isAuthenticated && !!withingsStatusQuery.data?.data?.connected;
  const syncWithings = useSyncWithings({
    onSuccess: (response) => {
      toast.success(
        `Imported ${response.data.importedCount} new weight log${response.data.importedCount === 1 ? '' : 's'} from Withings`,
      );
    },
    onError: () => {
      toast.error('Unable to sync Withings right now');
    },
  });

  useEffect(() => {
    const status = searchParams.get('strava');
    const reason = searchParams.get('reason');

    if (!status) {
      return;
    }

    if (status === 'connected') {
      toast.success('Strava connected. Activity sync is now live.');
      void stravaStatusQuery.refetch();
    } else {
      let message = 'Strava connection failed';

      if (reason === 'authorization_denied') {
        message = 'Strava connection was canceled';
      } else if (reason?.startsWith('strava_token_exchange_failed_401')) {
        message =
          'Strava rejected client credentials (401 invalid). Verify STRAVA_CLIENT_ID/STRAVA_CLIENT_SECRET.';
      } else if (reason?.startsWith('strava_token_exchange_failed_400')) {
        message =
          'Strava rejected the auth code/redirect configuration. Verify STRAVA_REDIRECT_URI matches your Strava app callback exactly.';
      } else if (reason === 'strava_state_invalid') {
        message =
          'Strava OAuth state expired or mismatched. Start connect again.';
      }

      toast.error(message);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('strava');
    next.delete('reason');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, stravaStatusQuery]);

  useEffect(() => {
    const status = searchParams.get('withings');
    const reason = searchParams.get('reason');

    if (!status) {
      return;
    }

    if (status === 'connected') {
      toast.success('Withings connected. You can sync weight and body comp.');
      void withingsStatusQuery.refetch();
    } else {
      let message = 'Withings connection failed';
      if (reason === 'authorization_denied') {
        message = 'Withings connection was canceled';
      } else if (reason?.startsWith('withings_token_exchange_failed_')) {
        message =
          'Withings rejected the auth code. Check WITHINGS_CLIENT_ID/SECRET and that the callback URL is registered in the Withings developer app.';
      } else if (reason === 'withings_state_invalid') {
        message =
          'Withings OAuth state expired. Start the connection again from Integrations.';
      }
      toast.error(message);
    }

    const next = new URLSearchParams(searchParams);
    next.delete('withings');
    next.delete('reason');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, withingsStatusQuery]);

  const handleStravaConnect = async () => {
    if (!isAuthenticated) {
      toast.error('Sign in first to connect Strava');
      return;
    }

    try {
      const response = await startStravaConnect.mutateAsync();
      if (isNativeApp()) {
        await openUrl(response.data.authorizeUrl);
      } else {
        window.location.href = response.data.authorizeUrl;
      }
    } catch {
      toast.error('Unable to start Strava connection');
    }
  };

  const handleStravaDisconnect = async () => {
    await disconnectStrava.mutateAsync();
  };

  const handleStravaSync = async () => {
    await syncStravaActivities.mutateAsync(30);
  };

  const handleWithingsConnect = async () => {
    if (!isAuthenticated) {
      toast.error('Sign in first to connect Withings');
      return;
    }
    try {
      const response = await startWithingsConnect.mutateAsync();
      if (isNativeApp()) {
        await openUrl(response.data.authorizeUrl);
      } else {
        window.location.href = response.data.authorizeUrl;
      }
    } catch {
      toast.error('Unable to start Withings connection');
    }
  };

  const handleWithingsDisconnect = async () => {
    await disconnectWithings.mutateAsync();
  };

  const handleWithingsSync = async () => {
    await syncWithings.mutateAsync();
  };

  const integrations: Integration[] = [
    {
      name: 'Apple Watch',
      description:
        'Sync your workouts, heart rate, and activity data directly from your Apple Watch.',
      category: 'Wearables',
      icon: <Watch className="h-8 w-8" />,
      features: [
        'Real-time heart rate sync',
        'Automatic workout detection',
        'Activity rings integration',
        'Sleep tracking data',
      ],
      status: 'coming-soon',
    },
    {
      name: 'Garmin',
      description:
        'Connect your Garmin device for comprehensive fitness and health metrics.',
      category: 'Wearables',
      icon: <Activity className="h-8 w-8" />,
      features: [
        'GPS workout tracking',
        'Training load analysis',
        'Recovery metrics',
        'Body battery sync',
      ],
      status: 'coming-soon',
    },
    {
      name: 'Fitbit',
      description:
        'Import your Fitbit data including steps, sleep, and workout history.',
      category: 'Wearables',
      icon: <Heart className="h-8 w-8" />,
      features: [
        'Daily activity sync',
        'Sleep stages data',
        'Heart rate zones',
        'Exercise history import',
      ],
      status: 'coming-soon',
    },
    {
      name: 'Whoop',
      description:
        'Integrate Whoop recovery and strain data for optimized training.',
      category: 'Wearables',
      icon: <Zap className="h-8 w-8" />,
      features: [
        'Recovery score sync',
        'Strain tracking',
        'Sleep performance',
        'HRV monitoring',
      ],
      status: 'coming-soon',
    },
    {
      name: HEALTH_INFO.name,
      description: HEALTH_INFO.description,
      category: 'Health Platforms',
      icon: <Heart className="h-8 w-8" />,
      features: HEALTH_INFO.features,
      status: healthAvailable
        ? 'available'
        : !isNativeApp()
          ? 'mobile-only'
          : 'coming-soon',
    },
    {
      name: 'Samsung Health',
      description:
        "Sync data from Samsung Health via our Android app's local device integration.",
      category: 'Health Platforms',
      icon: <Heart className="h-8 w-8" />,
      features: [
        'Activity tracking',
        'Heart rate data',
        'Sleep analysis',
        'Android only',
      ],
      status: 'coming-soon',
    },
    {
      name: 'Withings',
      description:
        'Connect your Withings account to import weight, body fat, and muscle mass from compatible scales (Body, Body+, Body Cardio, and similar).',
      category: 'Health Platforms',
      icon: <Activity className="h-8 w-8" />,
      features: [
        'Weight and measurement time from your scale',
        'Body fat percentage',
        'Muscle mass (when your scale provides it)',
        'Secure Withings sign-in',
      ],
      status: 'available',
    },
    {
      name: 'MyFitnessPal',
      description:
        'Import nutrition and calorie data from MyFitnessPal for complete tracking.',
      category: 'Nutrition',
      icon: <Cloud className="h-8 w-8" />,
      features: [
        'Calorie sync',
        'Macro tracking',
        'Food diary import',
        'Meal planning',
      ],
      status: 'coming-soon',
    },
    {
      name: 'Lose It!',
      description:
        'Sync your calorie budget, meals, and weight data from Lose It! for seamless tracking.',
      category: 'Nutrition',
      icon: <Cloud className="h-8 w-8" />,
      features: [
        'Calorie budget sync',
        'Meal logging',
        'Weight tracking',
        'Nutrient breakdown',
      ],
      status: 'coming-soon',
    },
    {
      name: 'Strava',
      description:
        'Sync your Strava activities and connect with the fitness community.',
      category: 'Fitness Apps',
      icon: <Activity className="h-8 w-8" />,
      features: [
        'Activity import',
        'Route data',
        'Segment tracking',
        'Social features',
      ],
      status: 'available',
    },
    {
      name: 'Oura Ring',
      description:
        'Import sleep, readiness, and activity data from your Oura Ring.',
      category: 'Wearables',
      icon: <Watch className="h-8 w-8" />,
      features: [
        'Sleep quality scores',
        'Readiness tracking',
        'Activity goals',
        'Temperature trends',
      ],
      status: 'coming-soon',
    },
    {
      name: 'Google Pixel Watch',
      description:
        'Sync workouts, health metrics, and Fitbit data from your Pixel Watch.',
      category: 'Wearables',
      icon: <Watch className="h-8 w-8" />,
      features: [
        'Workout tracking',
        'Heart rate monitoring',
        'Sleep tracking',
        'Fitbit integration',
      ],
      status: 'coming-soon',
    },
    {
      name: 'Samsung Galaxy Watch',
      description:
        'Connect your Galaxy Watch for comprehensive health and fitness tracking.',
      category: 'Wearables',
      icon: <Watch className="h-8 w-8" />,
      features: [
        'Body composition',
        'Blood pressure tracking',
        'Sleep analysis',
        'Workout detection',
      ],
      status: 'coming-soon',
    },
  ];

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
            <CheckCircle className="h-3 w-3" />
            Available
          </span>
        );
      case 'beta':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
            <Zap className="h-3 w-3" />
            Beta
          </span>
        );
      case 'mobile-only':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-500">
            <Smartphone className="h-3 w-3" />
            Mobile Only
          </span>
        );
      case 'coming-soon':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-500">
            Coming Soon
          </span>
        );
    }
  };

  const isConnectedIntegration = (integration: Integration) => {
    if (integration.name === 'Strava' && isStravaConnected) return true;
    if (integration.name === 'Withings' && isWithingsConnected) return true;
    if (
      integration.name === HEALTH_INTEGRATION_NAME &&
      isHealthConnected &&
      integration.status !== 'coming-soon'
    )
      return true;
    return false;
  };

  const filteredIntegrations = integrations.filter((integration) => {
    const normalized = searchTerm.trim().toLowerCase();

    const isConnected = isConnectedIntegration(integration);
    const statusMatch =
      statusFilter === 'all' ||
      (statusFilter === 'connected' && isConnected) ||
      (statusFilter === 'available' &&
        !isConnected &&
        (integration.status === 'available' ||
          integration.status === 'beta' ||
          integration.status === 'mobile-only')) ||
      (statusFilter === 'coming-soon' && integration.status === 'coming-soon');

    if (!statusMatch) {
      return false;
    }

    if (!normalized) {
      return true;
    }

    return (
      integration.name.toLowerCase().includes(normalized) ||
      integration.description.toLowerCase().includes(normalized) ||
      integration.category.toLowerCase().includes(normalized) ||
      integration.features.some((feature) =>
        feature.toLowerCase().includes(normalized),
      )
    );
  });

  const connectedIntegrations = filteredIntegrations.filter(
    isConnectedIntegration,
  );
  const availableIntegrations = filteredIntegrations.filter(
    (integration) =>
      (integration.status === 'available' ||
        integration.status === 'beta' ||
        integration.status === 'mobile-only') &&
      !isConnectedIntegration(integration),
  );
  const comingSoonIntegrations = filteredIntegrations.filter(
    (integration) => integration.status === 'coming-soon',
  );

  const renderIntegrationCard = (integration: Integration) => (
    <div
      key={integration.name}
      className="group rounded-2xl border border-border/60 bg-card/90 p-6 transition-all hover:border-primary/30"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          {integration.icon}
        </div>
        {getStatusBadge(integration.status)}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{integration.name}</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {integration.description}
      </p>
      <ul className="space-y-2">
        {integration.features.map((feature, index) => (
          <li
            key={index}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <CheckCircle className="h-4 w-4 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
      {integration.name === 'Strava' ? (
        <div className="mt-5 border-t border-border/50 pt-4">
          {isStravaConnected ? (
            <div className="mb-3 text-xs text-muted-foreground">
              Connected as{' '}
              <span className="font-medium text-foreground">
                {stravaStatusQuery.data?.data?.athleteName ||
                  stravaStatusQuery.data?.data?.athleteUsername ||
                  'your Strava account'}
              </span>
              <div className="mt-1">
                {stravaStatusQuery.data?.data?.activityCount ?? 0} imported
                activities
                {stravaStatusQuery.data?.data?.lastSyncedAt
                  ? ` • Last synced ${new Date(stravaStatusQuery.data.data.lastSyncedAt).toLocaleString()}`
                  : ' • Never synced'}
              </div>
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              Connect once to start syncing activities from Strava into Vara.
            </p>
          )}

          {isStravaConnected ? (
            <div className="grid grid-cols-1 gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  void handleStravaSync();
                }}
                disabled={syncStravaActivities.isPending}
              >
                {syncStravaActivities.isPending
                  ? 'Syncing...'
                  : 'Sync Activities'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  void handleStravaDisconnect();
                }}
                disabled={disconnectStrava.isPending}
              >
                {disconnectStrava.isPending
                  ? 'Disconnecting...'
                  : 'Disconnect Strava'}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                void handleStravaConnect();
              }}
              disabled={startStravaConnect.isPending}
            >
              {startStravaConnect.isPending ? 'Starting...' : 'Connect Strava'}
            </Button>
          )}
        </div>
      ) : null}
      {integration.name === 'Withings' ? (
        <div className="mt-5 border-t border-border/50 pt-4">
          {isWithingsConnected ? (
            <div className="mb-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Withings account linked
              </span>
              <div className="mt-1">
                {withingsStatusQuery.data?.data?.lastSyncedAt
                  ? `Last synced ${new Date(withingsStatusQuery.data.data.lastSyncedAt).toLocaleString()}`
                  : 'Not synced yet'}
              </div>
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              Connect your Withings account to import scale measurements into
              your Vara weight log.
            </p>
          )}
          {isWithingsConnected ? (
            <div className="grid grid-cols-1 gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  void handleWithingsSync();
                }}
                disabled={syncWithings.isPending}
              >
                {syncWithings.isPending ? 'Syncing...' : 'Sync from Withings'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  void handleWithingsDisconnect();
                }}
                disabled={disconnectWithings.isPending}
              >
                {disconnectWithings.isPending
                  ? 'Disconnecting...'
                  : 'Disconnect Withings'}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                void handleWithingsConnect();
              }}
              disabled={startWithingsConnect.isPending}
            >
              {startWithingsConnect.isPending
                ? 'Starting...'
                : 'Connect Withings'}
            </Button>
          )}
        </div>
      ) : null}
      {integration.name === HEALTH_INTEGRATION_NAME &&
      (integration.status === 'available' ||
        integration.status === 'mobile-only') ? (
        <div className="mt-5 border-t border-border/50 pt-4">
          {isHealthConnected ? (
            <>
              <div className="mb-3 flex items-center gap-1.5 text-xs text-green-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Connected — health data syncing
              </div>

              {/* Per-metric sync toggles */}
              {syncPrefs && (
                <div className="mb-4 space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Read from Device
                  </p>
                  <div className="space-y-2">
                    {(
                      [
                        ['readSteps', 'Steps'],
                        ['readSleep', 'Sleep'],
                        ['readHeartRate', 'Heart Rate'],
                        ['readWeight', 'Weight'],
                        ['readWater', 'Water'],
                        ['readWorkouts', 'Workouts'],
                      ] as const
                    ).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <Label
                          htmlFor={`sync-${key}`}
                          className="text-xs font-normal"
                        >
                          {label}
                        </Label>
                        <Switch
                          id={`sync-${key}`}
                          checked={syncPrefs[key]}
                          onCheckedChange={(checked) =>
                            updateSyncPrefs.mutate({ [key]: checked })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground pt-2">
                    Write to Device
                  </p>
                  <div className="space-y-2">
                    {(
                      [
                        ['writeWeight', 'Weight'],
                        ['writeWater', 'Water'],
                        ['writeWorkouts', 'Workouts'],
                      ] as const
                    ).map(([key, label]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <Label
                          htmlFor={`sync-${key}`}
                          className="text-xs font-normal"
                        >
                          {label}
                        </Label>
                        <Switch
                          id={`sync-${key}`}
                          checked={syncPrefs[key]}
                          onCheckedChange={(checked) =>
                            updateSyncPrefs.mutate({ [key]: checked })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isNativeApp() ? (
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    className="w-full"
                    size="sm"
                    disabled={healthSyncing}
                    onClick={() => {
                      setHealthSyncing(true);
                      void syncHealthToBackend(syncPrefs)
                        .then((result) => {
                          if (result) {
                            const parts: string[] = [];
                            if (result.stepsUpserted)
                              parts.push(`${result.stepsUpserted} step days`);
                            if (result.sleepUpserted)
                              parts.push(
                                `${result.sleepUpserted} sleep sessions`,
                              );
                            if (result.heartRateInserted)
                              parts.push(
                                `${result.heartRateInserted} HR samples`,
                              );
                            if (result.weightUpserted)
                              parts.push(
                                `${result.weightUpserted} weight entries`,
                              );
                            if (result.workoutsImported)
                              parts.push(`${result.workoutsImported} workouts`);
                            toast.success(
                              parts.length
                                ? `Synced ${parts.join(', ')}`
                                : 'Health data synced',
                            );
                          } else {
                            toast.info('No new health data to sync');
                          }
                        })
                        .catch(() => {
                          toast.error('Health sync failed — check permissions');
                        })
                        .finally(() => {
                          setHealthSyncing(false);
                        });
                    }}
                  >
                    {healthSyncing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing…
                      </>
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => {
                      toast.info(
                        'Revoke access in your device Health settings to disconnect.',
                      );
                    }}
                  >
                    Manage Permissions
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Manage permissions from the mobile app.
                </p>
              )}
            </>
          ) : integration.status === 'mobile-only' ? (
            <p className="text-xs text-muted-foreground">
              Connect via the Vara Performance mobile app.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Grant consent and device permissions to start syncing health
                data.
              </p>
              <Button className="w-full" onClick={handleHealthConnect}>
                Connect Health Data
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-linear-to-r from-primary/10 via-primary/5 to-emerald-500/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
              <Plug className="h-3.5 w-3.5" />
              Integration Hub
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Integrations
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Connect wearables and training apps, then keep activity and
              recovery data synced into one workflow.
            </p>
          </div>
          <div
            className={cn(
              'grid grid-cols-3 gap-2 sm:gap-3',
              isMobile && 'grid-cols-1',
            )}
          >
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-center">
              <p className="text-lg font-semibold">
                {connectedIntegrations.length}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Connected
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-center">
              <p className="text-lg font-semibold">
                {availableIntegrations.length}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Available
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-center">
              <p className="text-lg font-semibold">
                {comingSoonIntegrations.length}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Coming soon
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/90 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search integrations"
            className="w-full md:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'connected', label: 'Connected' },
              { key: 'available', label: 'Available' },
              { key: 'coming-soon', label: 'Coming Soon' },
            ].map((filter) => (
              <Button
                key={filter.key}
                type="button"
                size="sm"
                variant={statusFilter === filter.key ? 'default' : 'outline'}
                onClick={() =>
                  setStatusFilter(
                    filter.key as
                      | 'all'
                      | 'connected'
                      | 'available'
                      | 'coming-soon',
                  )
                }
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {filteredIntegrations.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
          <h3 className="mb-2 text-lg font-semibold">No integrations found</h3>
          <p className="text-sm text-muted-foreground">
            Try a different search term or filter.
          </p>
        </div>
      ) : null}

      {connectedIntegrations.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">Connected</h2>
              <p className="text-sm text-muted-foreground">
                Apps currently syncing data into Vara.
              </p>
            </div>
          </div>
          <div
            className={cn(
              'grid gap-6 md:grid-cols-2 lg:grid-cols-3',
              isMobile && 'grid-cols-1',
            )}
          >
            {connectedIntegrations.map(renderIntegrationCard)}
          </div>
        </section>
      ) : null}

      {availableIntegrations.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Available</h2>
          <div
            className={cn(
              'grid gap-6 md:grid-cols-2 lg:grid-cols-3',
              isMobile && 'grid-cols-1',
            )}
          >
            {availableIntegrations.map(renderIntegrationCard)}
          </div>
        </section>
      )}

      {comingSoonIntegrations.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Coming Soon</h2>
          <div
            className={cn(
              'grid gap-6 md:grid-cols-2 lg:grid-cols-3',
              isMobile && 'grid-cols-1',
            )}
          >
            {comingSoonIntegrations.map(renderIntegrationCard)}
          </div>
        </section>
      )}

      <section
        className={cn(
          'grid gap-4 pb-2 lg:grid-cols-[2fr_1fr]',
          isMobile && 'grid-cols-1',
        )}
      >
        <div
          className={cn(
            'rounded-2xl border border-border/60 bg-card p-5',
            isMobile && 'order-1',
          )}
        >
          <h3 className="mb-3 text-lg font-semibold">How it works</h3>
          <div
            className={cn(
              'grid gap-3 sm:grid-cols-3',
              isMobile && 'grid-cols-1',
            )}
          >
            <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">
                Step 1
              </p>
              <p className="text-sm font-medium">Connect</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Authorize once with secure OAuth.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">
                Step 2
              </p>
              <p className="text-sm font-medium">Sync</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pull activities and metrics into Vara.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">
                Step 3
              </p>
              <p className="text-sm font-medium">Use</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Apply synced data in goals and planning.
              </p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'rounded-2xl border border-border/60 bg-card p-5',
            isMobile && 'order-2',
          )}
        >
          <Smartphone className="mb-3 h-9 w-9 text-primary" />
          <h3 className="text-lg font-semibold">Request an integration</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Missing a device or app? Tell us what to prioritize next.
          </p>
          <Button className="mt-4 w-full" variant="outline" disabled>
            Request Integration
          </Button>
        </div>
      </section>

      {/* Health Data Consent Dialog */}
      <Dialog
        open={showHealthConsentDialog}
        onOpenChange={(open) => {
          if (!submitReconsent.isPending) {
            setShowHealthConsentDialog(open);
            if (!open) setAcceptedHealthTerms(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Health Data</DialogTitle>
            <DialogDescription>
              Review and accept the Health Data Sharing Agreement to sync health
              metrics from your device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
            {healthRequiredDocs.map((doc) => (
              <div
                key={`${doc.type}-${doc.version}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {doc.title} v{doc.version}
                </span>
                <Link
                  to="/health-data-consent"
                  className="text-primary hover:underline"
                >
                  Review
                </Link>
              </div>
            ))}
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptedHealthTerms}
                onChange={(e) => setAcceptedHealthTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span className="text-muted-foreground">
                I have reviewed and accept the Health Data Sharing Agreement.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowHealthConsentDialog(false);
                setAcceptedHealthTerms(false);
              }}
              disabled={submitReconsent.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmHealthConsent()}
              disabled={
                !acceptedHealthTerms ||
                submitReconsent.isPending ||
                healthRequiredDocs.length !== HEALTH_CONSENT_TYPES.length
              }
            >
              {submitReconsent.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm and Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsPage;
