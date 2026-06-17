import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useProfileDetails,
  useSaveProfile,
  useCompleteProfile,
  useCheckDisplayName,
  useAssociateGyms,
  useProfileGyms,
  type ProfileResponse,
} from '@/features/profile';
import { useSocials, type SocialsResponse } from '@/features/social';
import { useMapboxSearch, type MapboxPlace } from '@/hooks/use-mapbox';
import { useAuth } from '@/features/auth';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { PrivacyNotice } from '@/components/common/privacy-notice';

type ProfileStep = 'info' | 'socials' | 'gyms';

interface ProfileFormProps {
  mode: 'create' | 'edit';
}

interface FormData {
  displayName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  bio: string;
  unit: 'imperial' | 'metric';
  timezone: string;
  heightFeet: string;
  heightInches: string;
  heightCm: string;
}

interface Socials {
  twitter: string;
  instagram: string;
  facebook: string;
  threads: string;
  linkedin: string;
  github: string;
}

// Common IANA timezones grouped by region
const TIMEZONES = [
  // Americas
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Phoenix', label: 'Mountain Time (Phoenix, no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
  { value: 'America/Mexico_City', label: 'Central Time (Mexico City)' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)' },
  // Europe
  { value: 'Europe/London', label: 'GMT/BST (London)' },
  { value: 'Europe/Paris', label: 'CET (Paris)' },
  { value: 'Europe/Berlin', label: 'CET (Berlin)' },
  { value: 'Europe/Amsterdam', label: 'CET (Amsterdam)' },
  { value: 'Europe/Rome', label: 'CET (Rome)' },
  { value: 'Europe/Madrid', label: 'CET (Madrid)' },
  { value: 'Europe/Moscow', label: 'MSK (Moscow)' },
  // Asia/Pacific
  { value: 'Asia/Dubai', label: 'GST (Dubai)' },
  { value: 'Asia/Kolkata', label: 'IST (Mumbai/Delhi)' },
  { value: 'Asia/Singapore', label: 'SGT (Singapore)' },
  { value: 'Asia/Hong_Kong', label: 'HKT (Hong Kong)' },
  { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
  { value: 'Asia/Tokyo', label: 'JST (Tokyo)' },
  { value: 'Asia/Seoul', label: 'KST (Seoul)' },
  // Australia
  { value: 'Australia/Sydney', label: 'AEST (Sydney)' },
  { value: 'Australia/Melbourne', label: 'AEST (Melbourne)' },
  { value: 'Australia/Perth', label: 'AWST (Perth)' },
  // Other
  { value: 'UTC', label: 'UTC' },
];

// Helper to compute form data from profile
const computeFormData = (profile: ProfileResponse | null): FormData => {
  // Get browser's timezone as default
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (!profile) {
    return {
      displayName: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      bio: '',
      unit: 'imperial',
      timezone: browserTimezone,
      heightFeet: '',
      heightInches: '',
      heightCm: '',
    };
  }

  const heightInCm = profile.height || 0;
  const feet = Math.floor(heightInCm / 30.48);
  const inches = Math.round((heightInCm % 30.48) / 2.54);

  return {
    displayName: profile.displayName || '',
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    dateOfBirth: profile.dateOfBirth || '',
    bio: profile.bio || '',
    unit: (profile.unit || 'imperial') as 'imperial' | 'metric',
    timezone: profile.timezone || browserTimezone,
    heightFeet: heightInCm ? String(feet) : '',
    heightInches: heightInCm ? String(inches) : '',
    heightCm: heightInCm ? String(heightInCm) : '',
  };
};

// Helper to compute socials form data from API response
const computeSocials = (socialsData: SocialsResponse | null): Socials => {
  if (!socialsData) {
    return {
      twitter: '',
      instagram: '',
      facebook: '',
      threads: '',
      linkedin: '',
      github: '',
    };
  }
  return {
    twitter: socialsData.twitter || '',
    instagram: socialsData.instagram || '',
    facebook: socialsData.facebook || '',
    threads: socialsData.threads || '',
    linkedin: socialsData.linkedin || '',
    github: socialsData.github || '',
  };
};

// Display name validation (Instagram-style username)
const validateDisplayName = (name: string): string | null => {
  if (!name) return null;
  if (name.length < 3) return 'Must be at least 3 characters';
  if (name.length > 30) return 'Must be at most 30 characters';
  if (!/^[a-zA-Z0-9_]/.test(name))
    return 'Must start with a letter, number, or underscore';
  if (!/[a-zA-Z0-9_]$/.test(name))
    return 'Must end with a letter, number, or underscore';
  if (name.includes('..')) return 'Cannot contain consecutive periods';
  if (!/^[a-zA-Z0-9_.]+$/.test(name))
    return 'Can only contain letters, numbers, underscores, and periods';
  return null;
};

const ProfileForm = ({ mode }: ProfileFormProps) => {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    isProfileComplete,
    isLoading: isAuthLoading,
  } = useAuth();
  const { data: profileData, isLoading: isProfileLoading } = useProfileDetails({
    enabled: isAuthenticated && mode === 'edit',
  });
  const { data: socialsData, isLoading: isSocialsLoading } = useSocials({
    enabled: isAuthenticated && mode === 'edit',
  });
  const { data: gymsData, isLoading: isGymsDataLoading } = useProfileGyms({
    enabled: isAuthenticated && mode === 'edit',
  });

  const profile = profileData?.success ? profileData.data : null;
  const socialsFromApi = socialsData?.success ? socialsData.data : null;
  const existingGyms = gymsData?.success ? gymsData.data : [];

  // Step management (only used in create mode)
  const [step, setStep] = useState<ProfileStep>('info');

  // Form state
  const [formData, setFormData] = useState<FormData>(() =>
    computeFormData(null),
  );
  const [socials, setSocials] = useState<Socials>(() => computeSocials(null));
  // Store selected gym places from Mapbox
  const [selectedGyms, setSelectedGyms] = useState<MapboxPlace[]>([]);

  // Derive selected gym IDs for comparison
  const selectedGymIds = selectedGyms.map((g) => g.id);

  // Mapbox search for gyms
  const {
    query: gymSearch,
    setQuery: setGymSearch,
    results: gyms,
    isSearching: isGymsLoading,
    error: mapboxError,
  } = useMapboxSearch({ limit: 10, useProximity: true });

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [debouncedDisplayName, setDebouncedDisplayName] = useState('');
  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [lastLoadedProfileId, setLastLoadedProfileId] = useState<string | null>(
    null,
  );
  const [lastLoadedSocialsId, setLastLoadedSocialsId] = useState<string | null>(
    null,
  );
  const [gymsInitialized, setGymsInitialized] = useState(false);

  // Initialize form data when profile loads (edit mode)
  const profileId = profile?.id ?? null;
  if (mode === 'edit' && profileId && profileId !== lastLoadedProfileId) {
    setLastLoadedProfileId(profileId);
    setFormData(computeFormData(profile));
    setOriginalDisplayName(profile?.displayName || '');
  }

  // Initialize socials when they load (edit mode)
  const socialsId = socialsFromApi?.id ?? null;
  if (mode === 'edit' && socialsId && socialsId !== lastLoadedSocialsId) {
    setLastLoadedSocialsId(socialsId);
    setSocials(computeSocials(socialsFromApi));
  }

  // Initialize gyms when they load (edit mode)
  if (mode === 'edit' && existingGyms.length > 0 && !gymsInitialized) {
    setGymsInitialized(true);
    // Convert existing gyms to MapboxPlace format (for display)
    // Note: lat/long are not returned from profile gyms API, so default to 0
    const gymPlaces: MapboxPlace[] = existingGyms.map((gym) => ({
      id: gym.mapboxId || gym.id,
      name: gym.name,
      formattedAddress: gym.location?.address || '',
      city: gym.location?.city || '',
      state: gym.location?.state || undefined,
      country: gym.location?.country || '',
      postalCode: undefined,
      latitude: 0,
      longitude: 0,
      categories: [],
    }));
    setSelectedGyms(gymPlaces);
  }

  // Redirect to dashboard if profile is already complete (create mode only)
  useEffect(() => {
    if (mode === 'create' && !isAuthLoading && isProfileComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [mode, isAuthLoading, isProfileComplete, navigate]);

  // Display name validation
  const displayNameFormatError = validateDisplayName(formData.displayName);
  const isDisplayNameFormatValid =
    formData.displayName.length >= 3 && !displayNameFormatError;
  const hasDisplayNameChanged =
    mode === 'edit'
      ? formData.displayName.toLowerCase() !== originalDisplayName.toLowerCase()
      : true;

  // Debounce display name for availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isDisplayNameFormatValid && hasDisplayNameChanged) {
        setDebouncedDisplayName(formData.displayName.trim().toLowerCase());
      } else {
        setDebouncedDisplayName('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.displayName, isDisplayNameFormatValid, hasDisplayNameChanged]);

  // Check display name availability
  const { data: displayNameCheck, isLoading: isCheckingDisplayName } =
    useCheckDisplayName(debouncedDisplayName, {
      enabled: debouncedDisplayName.length >= 1 && hasDisplayNameChanged,
    });

  const isDisplayNameAvailable =
    !hasDisplayNameChanged ||
    (displayNameCheck?.success && displayNameCheck.data.available);
  const isDisplayNameTaken =
    hasDisplayNameChanged &&
    displayNameCheck?.success &&
    !displayNameCheck.data.available;

  // Convert height to centimeters
  const getHeightInCm = (): number | undefined => {
    if (formData.unit === 'imperial') {
      const feet = parseFloat(formData.heightFeet) || 0;
      const inches = parseFloat(formData.heightInches) || 0;
      if (feet === 0 && inches === 0) return undefined;
      return Math.round(feet * 30.48 + inches * 2.54);
    } else {
      const cm = parseFloat(formData.heightCm);
      return isNaN(cm) ? undefined : Math.round(cm);
    }
  };

  // Handle gym selection
  const handleGymToggle = (gym: MapboxPlace) => {
    const isSelected = selectedGymIds.includes(gym.id);
    if (isSelected) {
      setSelectedGyms((prev) => prev.filter((g) => g.id !== gym.id));
    } else {
      setSelectedGyms((prev) => [...prev, gym]);
    }
  };

  // Mutations
  const saveProfileMutation = useSaveProfile({
    onError: (err) => {
      setError(err.message || 'Failed to save profile');
      setSuccess(false);
    },
  });

  const completeProfileMutation = useCompleteProfile({
    onSuccess: () => {
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      setError(err.message || 'Failed to complete profile');
    },
  });

  const associateGymsMutation = useAssociateGyms({
    onError: (err) => {
      setError(err.message || 'Failed to save gyms');
    },
  });

  // Handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
    setSuccess(false);
  };

  // Extract username from URL if user pastes a full URL
  const extractUsername = (value: string, platform: string): string => {
    const urlPatterns: Record<string, RegExp[]> = {
      instagram: [/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i],
      twitter: [
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([^/?#]+)/i,
      ],
      threads: [/(?:https?:\/\/)?(?:www\.)?threads\.net\/@?([^/?#]+)/i],
      facebook: [/(?:https?:\/\/)?(?:www\.)?facebook\.com\/([^/?#]+)/i],
      linkedin: [/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([^/?#]+)/i],
      github: [/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i],
    };

    const patterns = urlPatterns[platform];
    if (patterns) {
      for (const pattern of patterns) {
        const match = value.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
    return value;
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const username = extractUsername(value, name);
    setSocials({ ...socials, [name]: username });
    setError(null);
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate display name
    if (hasDisplayNameChanged) {
      if (displayNameFormatError) {
        setError(displayNameFormatError);
        return;
      }
      if (!isDisplayNameAvailable) {
        setError('Display name is not available');
        return;
      }
    }

    if (mode === 'edit') {
      // Save profile immediately in edit mode
      const heightInCm = getHeightInCm();
      try {
        await saveProfileMutation.mutateAsync({
          displayName: formData.displayName || undefined,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
          bio: formData.bio || undefined,
          unit: formData.unit,
          timezone: formData.timezone || undefined,
          height: heightInCm,
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch {
        // Error handled by onError callback
      }
    } else {
      // Move to next step in create mode
      setStep('socials');
    }
  };

  const handleSocialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'edit') {
      // Save socials immediately in edit mode
      const filteredSocials = Object.fromEntries(
        Object.entries(socials).filter(([, v]) => v.trim() !== ''),
      ) as Record<string, string>;
      try {
        await saveProfileMutation.mutateAsync({
          socials:
            Object.keys(filteredSocials).length > 0
              ? filteredSocials
              : undefined,
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch {
        // Error handled by onError callback
      }
    } else {
      // Move to next step in create mode
      setStep('gyms');
    }
  };

  const handleGymsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const heightInCm = getHeightInCm();

    // Filter out empty social values
    const filteredSocials = Object.fromEntries(
      Object.entries(socials).filter(([, v]) => v.trim() !== ''),
    ) as Record<string, string>;

    try {
      // Save profile with socials in one call
      await saveProfileMutation.mutateAsync({
        displayName: formData.displayName || undefined,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        bio: formData.bio || undefined,
        unit: formData.unit,
        timezone: formData.timezone || undefined,
        height: heightInCm,
        socials:
          Object.keys(filteredSocials).length > 0 ? filteredSocials : undefined,
      });

      // Save gym associations - send all selected gyms
      // Backend handles finding existing gyms by mapboxId and only creates new ones
      await associateGymsMutation.mutateAsync(
        selectedGyms.map((gym) => ({
          mapboxId: gym.id,
          name: gym.name,
          formattedAddress: gym.formattedAddress || undefined,
          city: gym.city || undefined,
          state: gym.state || undefined,
          country: gym.country || undefined,
          postalCode: gym.postalCode || undefined,
          latitude: gym.latitude,
          longitude: gym.longitude,
          categories: gym.categories,
        })),
      );

      if (mode === 'create') {
        await completeProfileMutation.mutateAsync();
      } else {
        // Edit mode - show success after all saves complete
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      // Error handled by onError callback
    }
  };

  const isLoading =
    mode === 'edit'
      ? isAuthLoading ||
        isProfileLoading ||
        isSocialsLoading ||
        isGymsDataLoading
      : isAuthLoading;
  const isSaving =
    saveProfileMutation.isPending ||
    completeProfileMutation.isPending ||
    associateGymsMutation.isPending;

  // Loading state
  if (isLoading || (mode === 'create' && isProfileComplete)) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container max-w-2xl">
          {mode === 'edit' ? (
            <>
              <div className="mb-8">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-8 w-48" />
              </div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Profile not found (edit mode only)
  if (mode === 'edit' && !profile) {
    return (
      <div className="min-h-screen bg-muted/30 py-12">
        <div className="container max-w-2xl text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground mb-6">
            Please complete your profile setup first.
          </p>
          <Button asChild>
            <Link to="/profile/create">Create Profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'info', label: 'Basic Info' },
    { key: 'socials', label: 'Socials' },
    { key: 'gyms', label: 'Gyms' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // Multi-step wizard for both create and edit modes
  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          {mode === 'edit' && (
            <Link
              to="/profile"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </Link>
          )}
          <h1 className="text-3xl font-bold">
            {mode === 'edit' ? 'Edit Profile' : 'Create Your Profile'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {mode === 'edit'
              ? 'Update your profile information'
              : "Let's set up your member profile"}
          </p>
        </div>

        {/* Progress Steps / Tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    mode === 'edit' && setStep(s.key as ProfileStep)
                  }
                  disabled={mode === 'create'}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    i < currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : i === currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    mode === 'edit' &&
                      'cursor-pointer hover:ring-2 hover:ring-primary/50',
                  )}
                >
                  {i < currentStepIndex && mode === 'create' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    mode === 'edit' && setStep(s.key as ProfileStep)
                  }
                  disabled={mode === 'create'}
                  className={cn(
                    'ml-2 hidden text-sm sm:block',
                    i <= currentStepIndex
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                    mode === 'edit' && 'cursor-pointer hover:underline',
                  )}
                >
                  {s.label}
                </button>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-4 h-0.5 w-8 sm:w-16',
                      i < currentStepIndex ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Success/Error Messages */}
            {error && (
              <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                Profile saved successfully!
              </div>
            )}

            {/* Step 1: Basic Info */}
            {step === 'info' && (
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Tell us about yourself</CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleInfoSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name *</Label>
                      <div className="relative">
                        <Input
                          id="displayName"
                          name="displayName"
                          placeholder="username"
                          value={formData.displayName}
                          onChange={handleInputChange}
                          required
                          className={cn(
                            'pr-10',
                            displayNameFormatError &&
                              formData.displayName &&
                              'border-destructive focus-visible:ring-destructive',
                            isDisplayNameTaken &&
                              'border-destructive focus-visible:ring-destructive',
                            isDisplayNameAvailable &&
                              debouncedDisplayName &&
                              'border-green-500 focus-visible:ring-green-500',
                          )}
                        />
                        {formData.displayName && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {displayNameFormatError ? (
                              <X className="h-4 w-4 text-destructive" />
                            ) : isCheckingDisplayName ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : isDisplayNameAvailable ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : isDisplayNameTaken ? (
                              <X className="h-4 w-4 text-destructive" />
                            ) : null}
                          </div>
                        )}
                      </div>
                      <p
                        className={cn(
                          'text-xs',
                          displayNameFormatError || isDisplayNameTaken
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                        )}
                      >
                        {displayNameFormatError && formData.displayName
                          ? displayNameFormatError
                          : isDisplayNameTaken
                            ? 'This display name is already taken'
                            : isDisplayNameAvailable && debouncedDisplayName
                              ? 'This display name is available!'
                              : 'Letters, numbers, underscores, and periods only'}
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Preference</Label>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'text-sm font-medium transition-colors',
                            formData.unit === 'imperial'
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          Imperial
                        </span>
                        <Switch
                          checked={formData.unit === 'metric'}
                          onCheckedChange={(checked) =>
                            setFormData({
                              ...formData,
                              unit: checked ? 'metric' : 'imperial',
                            })
                          }
                        />
                        <span
                          className={cn(
                            'text-sm font-medium transition-colors',
                            formData.unit === 'metric'
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          Metric
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select
                        value={formData.timezone}
                        onValueChange={(value) =>
                          setFormData({ ...formData, timezone: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Used for date/time display and notifications
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Height</Label>
                      {formData.unit === 'imperial' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Input
                              id="heightFeet"
                              name="heightFeet"
                              type="number"
                              min="1"
                              max="8"
                              placeholder="Feet"
                              value={formData.heightFeet}
                              onChange={handleInputChange}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              ft
                            </p>
                          </div>
                          <div>
                            <Input
                              id="heightInches"
                              name="heightInches"
                              type="number"
                              min="0"
                              max="11"
                              placeholder="Inches"
                              value={formData.heightInches}
                              onChange={handleInputChange}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              in
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Input
                            id="heightCm"
                            name="heightCm"
                            type="number"
                            min="50"
                            max="300"
                            placeholder="Height in centimeters"
                            value={formData.heightCm}
                            onChange={handleInputChange}
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            cm
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        maxLength={255}
                        placeholder="Tell the community a bit about yourself, your training history, and your goals..."
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {formData.bio.length}/255
                      </p>
                    </div>
                    <PrivacyNotice variant="profile" />
                    <div className="flex gap-3 pt-4">
                      {mode === 'edit' ? (
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={
                            isSaving ||
                            isCheckingDisplayName ||
                            isDisplayNameTaken ||
                            !!displayNameFormatError
                          }
                        >
                          {isSaving ? 'Saving...' : 'Save Profile'}
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={
                            isSaving ||
                            isCheckingDisplayName ||
                            isDisplayNameTaken ||
                            !!displayNameFormatError
                          }
                        >
                          Continue to Socials
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Social Media Links */}
            {step === 'socials' && (
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Links</CardTitle>
                  <CardDescription>
                    Connect your social profiles (all optional)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSocialsSubmit} className="space-y-4">
                    {renderSocialInputWithIcon(
                      'instagram',
                      'Instagram',
                      socials,
                      handleSocialChange,
                      'instagram.com/',
                      InstagramIcon,
                    )}
                    {renderSocialInputWithIcon(
                      'twitter',
                      'X (Twitter)',
                      socials,
                      handleSocialChange,
                      'x.com/',
                      TwitterIcon,
                    )}
                    {renderSocialInputWithIcon(
                      'threads',
                      'Threads',
                      socials,
                      handleSocialChange,
                      'threads.net/@',
                      ThreadsIcon,
                    )}
                    {renderSocialInputWithIcon(
                      'facebook',
                      'Facebook',
                      socials,
                      handleSocialChange,
                      'facebook.com/',
                      FacebookIcon,
                    )}
                    {renderSocialInputWithIcon(
                      'linkedin',
                      'LinkedIn',
                      socials,
                      handleSocialChange,
                      'linkedin.com/in/',
                      LinkedInIcon,
                    )}
                    {renderSocialInputWithIcon(
                      'github',
                      'GitHub',
                      socials,
                      handleSocialChange,
                      'github.com/',
                      GitHubIcon,
                    )}
                    <div className="flex gap-3 pt-4">
                      {mode === 'create' && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep('info')}
                        >
                          Back
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSaving}
                      >
                        {mode === 'edit'
                          ? isSaving
                            ? 'Saving...'
                            : 'Save Socials'
                          : 'Continue to Gyms'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Select Associated Gyms */}
            {step === 'gyms' && (
              <Card>
                <CardHeader>
                  <CardTitle>Associated Gyms</CardTitle>
                  <CardDescription>
                    Search and select the gyms you train at (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGymsSubmit} className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                        />
                      </svg>
                      <Input
                        type="text"
                        placeholder="Search gyms by name or location..."
                        value={gymSearch}
                        onChange={(e) => setGymSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Selected Gyms Pills */}
                    {selectedGyms.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedGyms.map((gym) => (
                          <button
                            type="button"
                            key={gym.id}
                            onClick={() => handleGymToggle(gym)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                          >
                            {gym.name}
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Gym Results */}
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {isGymsLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <Skeleton
                              key={i}
                              className="h-20 w-full rounded-xl"
                            />
                          ))}
                        </div>
                      ) : gyms.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center">
                          <svg
                            className="mx-auto h-8 w-8 text-muted-foreground/50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                            />
                          </svg>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {gymSearch
                              ? `No places found matching "${gymSearch}"`
                              : 'Search for a gym to add it to your profile'}
                          </p>
                          {mapboxError && (
                            <p className="mt-1 text-xs text-destructive">
                              {mapboxError}
                            </p>
                          )}
                        </div>
                      ) : (
                        gyms.map((gym) => (
                          <button
                            type="button"
                            key={gym.id}
                            onClick={() => handleGymToggle(gym)}
                            className={cn(
                              'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all hover:border-primary/50',
                              selectedGymIds.includes(gym.id)
                                ? 'border-primary bg-primary/5 ring-2 ring-primary'
                                : 'border-border',
                            )}
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground text-lg font-bold">
                              {gym.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">
                                {gym.name}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {gym.formattedAddress ||
                                  `${gym.city}${gym.state ? `, ${gym.state}` : ''}`}
                              </p>
                            </div>
                            <div
                              className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                                selectedGymIds.includes(gym.id)
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/30',
                              )}
                            >
                              {selectedGymIds.includes(gym.id) && (
                                <Check className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      {mode === 'create' && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep('socials')}
                        >
                          Back
                        </Button>
                      )}
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSaving}
                      >
                        {mode === 'edit'
                          ? isSaving
                            ? 'Saving...'
                            : 'Save Gyms'
                          : 'Complete Profile'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Profile Preview */}
          <div className="hidden lg:block">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Profile Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {formData.firstName?.[0]?.toUpperCase() || '?'}
                    {formData.lastName?.[0]?.toUpperCase() || ''}
                  </div>
                  <div>
                    <p className="font-medium">
                      {formData.firstName || formData.lastName
                        ? `${formData.firstName} ${formData.lastName}`.trim()
                        : 'Your Name'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formData.displayName
                        ? `@${formData.displayName.replace('@', '')}`
                        : '@username'}
                    </p>
                  </div>
                </div>

                {formData.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {formData.bio}
                  </p>
                )}

                {Object.values(socials).some((v) => v) && (
                  <div className="flex gap-2">
                    {socials.instagram && <SocialIcon icon={InstagramIcon} />}
                    {socials.twitter && <SocialIcon icon={TwitterIcon} />}
                    {socials.threads && <SocialIcon icon={ThreadsIcon} />}
                    {socials.facebook && <SocialIcon icon={FacebookIcon} />}
                    {socials.linkedin && <SocialIcon icon={LinkedInIcon} />}
                    {socials.github && <SocialIcon icon={GitHubIcon} />}
                  </div>
                )}

                {selectedGyms.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Training at
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedGyms.map((gym) => (
                        <span
                          key={gym.id}
                          className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                        >
                          {gym.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components for social icons
const SocialIcon = ({
  icon: Icon,
}: {
  icon: React.FC<{ className?: string }>;
}) => (
  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
    <Icon className="h-4 w-4" />
  </div>
);

// Social media icons
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.88-.73 2.082-1.168 3.576-1.302l.1-.009c.478-.034.987-.052 1.51-.052.96 0 1.86.07 2.693.204-.1-.823-.344-1.489-.728-1.988-.47-.612-1.182-.921-2.116-.921-1.164 0-1.958.39-2.428 1.188l-1.881-.894c.757-1.252 2.162-1.943 3.958-1.943 1.474 0 2.69.514 3.516 1.486.727.855 1.148 2.02 1.25 3.47.118.003.236.007.354.014 1.396.079 2.544.548 3.413 1.397 1.052 1.028 1.635 2.529 1.635 4.217 0 2.725-1.1 4.983-3.085 6.346-1.709 1.172-3.977 1.77-6.744 1.77zm-1.478-7.908c-.406.034-.76.096-1.057.185-.814.243-1.356.597-1.61 1.053-.177.316-.184.67-.02 1.002.316.642 1.286.936 2.39.876 1.128-.06 1.946-.462 2.43-1.196.334-.505.543-1.16.62-1.956-.87-.132-1.798-.078-2.753.036z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

// Helper to render social input with icon
const renderSocialInputWithIcon = (
  name: string,
  label: string,
  socials: Socials,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  prefix: string,
  Icon: React.FC<{ className?: string }>,
) => (
  <div className="space-y-2">
    <Label htmlFor={name} className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      {label}
    </Label>
    <div className="flex">
      <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
        {prefix}
      </span>
      <Input
        id={name}
        name={name}
        placeholder="username"
        value={socials[name as keyof Socials]}
        onChange={onChange}
        className="rounded-l-none"
      />
    </div>
  </div>
);

export default ProfileForm;
